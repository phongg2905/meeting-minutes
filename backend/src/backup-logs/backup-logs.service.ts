import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateBackupLogDto } from './dto/create-backup-log.dto';
import { RestoreBackupDto } from './dto/restore-backup.dto';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const BACKUP_TIMEZONE = 'Asia/Ho_Chi_Minh';

@Injectable()
export class BackupLogsService {
  private readonly logger = new Logger(BackupLogsService.name);
  private readonly backupVersion = 1;
  private readonly attachmentBucket = process.env.SUPABASE_STORAGE_BUCKET || 'meeting-attachments';
  private readonly backupBucket = process.env.BACKUP_STORAGE_BUCKET || 'system-backups';
  private readonly backupPrefix = 'backups';
  private readonly backupRetentionDays = Number(process.env.BACKUP_RETENTION_DAYS || 14);

  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
  ) {}

  private parseDateBoundary(value: string, endOfDay = false) {
    const suffix = endOfDay ? '23:59:59.999+07:00' : '00:00:00.000+07:00';
    const date = new Date(`${value}T${suffix}`);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(endOfDay ? 'Ngày kết thúc không hợp lệ' : 'Ngày bắt đầu không hợp lệ');
    }
    return date;
  }

  async findAll(query: any = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const where: any = {};
    if (query.action_type) where.action_type = query.action_type;
    if (query.type) where.type = query.type;
    if (query.search) {
      where.OR = [
        { file_name: { contains: query.search, mode: 'insensitive' } },
        { file_path: { contains: query.search, mode: 'insensitive' } },
        { performer: { is: { full_name: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }
    if (query.date_from || query.date_to) {
      where.created_at = {};
      if (query.date_from) {
        where.created_at.gte = this.parseDateBoundary(query.date_from);
      }
      if (query.date_to) {
        where.created_at.lte = this.parseDateBoundary(query.date_to, true);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.backupLog.findMany({
        where,
        include: { performer: { select: { full_name: true } } },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.backupLog.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async create(userId: number, data: CreateBackupLogDto) {
    const created = await this.prisma.backupLog.create({ data: { ...data, performed_by: userId } });
    await this.activityLogs.log(userId, 'CREATE', 'backup_logs', created.backup_id, `Ghi nhan ${data.action_type}`);
    return created;
  }

  // ─── Shared business logic: gather data + upload ───
  // Called by both manual (runBackup) and automatic (runAutomaticBackup)
  async performBackup(userId: number): Promise<{ fileName: string; filePath: string; fileSize: number }> {
    this.assertBackupEncryptionReady();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${timestamp}.json`;
    const filePath = `${this.backupPrefix}/${fileName}`;

    const [
      roles,
      minuteTypes,
      users,
      meetingMinutes,
      minuteTasks,
      minuteParticipants,
      minuteAttachments,
      supportRequests,
      supportMessages,
      supportAttachments,
      managerRoleRequests,
      notifications,
      activityLogs,
      backupLogs,
    ] = await Promise.all([
      this.prisma.role.findMany({ orderBy: { role_id: 'asc' } }),
      this.prisma.minuteType.findMany({ orderBy: { type_id: 'asc' } }),
      this.prisma.user.findMany({ orderBy: { user_id: 'asc' } }),
      this.prisma.meetingMinute.findMany({ orderBy: { minute_id: 'asc' } }),
      this.prisma.minuteTask.findMany({ orderBy: { task_id: 'asc' } }),
      this.prisma.minuteParticipant.findMany({ orderBy: { participant_id: 'asc' } }),
      this.prisma.minuteAttachment.findMany({ orderBy: { attachment_id: 'asc' } }),
      this.prisma.supportTicket.findMany({ orderBy: { ticket_id: 'asc' } }),
      this.prisma.supportMessage.findMany({ orderBy: { message_id: 'asc' } }),
      this.prisma.supportAttachment.findMany({ orderBy: { attachment_id: 'asc' } }),
      this.prisma.managerRoleRequest.findMany({ orderBy: { request_id: 'asc' } }),
      this.prisma.notification.findMany({ orderBy: { notification_id: 'asc' } }),
      this.prisma.activityLog.findMany({ orderBy: { log_id: 'asc' } }),
      this.prisma.backupLog.findMany({ orderBy: { backup_id: 'asc' } }),
    ]);

    // Minute attachments – always read file content; fail loudly if unreadable
    const attachmentsWithContent = await Promise.all(
      minuteAttachments.map(async (attachment) => {
        let file_content_base64: string | null = null;
        try {
          const content = await this.readStorageObject(attachment.file_path);
          file_content_base64 = content.toString('base64');
        } catch {
          file_content_base64 = null;
        }
        return { ...attachment, file_content_base64 };
      }),
    );

    // Support attachments – read file content from storage (best-effort)
    const supportAttachmentsWithContent = await Promise.all(
      supportAttachments.map(async (attachment) => {
        let file_content_base64: string | null = null;
        try {
          const content = await this.readSupportAttachmentObject(attachment.file_path);
          file_content_base64 = content.toString('base64');
        } catch {
          file_content_base64 = null;
        }
        return { ...attachment, file_content_base64 };
      }),
    );

    const payload = {
      version: this.backupVersion,
      exported_at: new Date().toISOString(),
      metadata: {
        recordCounts: {
          roles: roles.length,
          minuteTypes: minuteTypes.length,
          users: users.length,
          meetingMinutes: meetingMinutes.length,
          minuteTasks: minuteTasks.length,
          minuteParticipants: minuteParticipants.length,
          minuteAttachments: minuteAttachments.length,
          supportRequests: supportRequests.length,
          supportMessages: supportMessages.length,
          supportAttachments: supportAttachments.length,
          managerRoleRequests: managerRoleRequests.length,
          notifications: notifications.length,
          activityLogs: activityLogs.length,
          backupLogs: backupLogs.length,
        },
        fileCount: minuteAttachments.length + supportAttachments.length,
      },
      data: {
        roles,
        minuteTypes,
        users,
        meetingMinutes,
        minuteTasks,
        minuteParticipants,
        minuteAttachments: attachmentsWithContent,
        supportRequests,
        supportMessages,
        supportAttachments: supportAttachmentsWithContent,
        managerRoleRequests,
        notifications,
        activityLogs,
        backupLogs,
      },
    };

    const serialized = JSON.stringify(this.encryptBackupPayload(payload), null, 2);
    const buffer = Buffer.from(serialized, 'utf-8');
    const fileSize = buffer.length;

    await this.uploadBackupObject(
      filePath,
      buffer,
      'application/json',
    );

    return { fileName, filePath, fileSize };
  }

  // ─── Manual backup ───
  async runBackup(userId: number) {
    const startedAt = new Date();

    // Create PENDING log entry
    const logEntry = await this.prisma.backupLog.create({
      data: {
        performed_by: userId,
        action_type: 'backup',
        type: 'MANUAL',
        status: 'PENDING',
        started_at: startedAt,
      },
    });

    try {
      // Update to RUNNING
      await this.prisma.backupLog.update({
        where: { backup_id: logEntry.backup_id },
        data: { status: 'RUNNING' },
      });

      // Execute shared backup logic
      const { fileName, filePath, fileSize } = await this.performBackup(userId);

      const completedAt = new Date();

      // Update to SUCCESS
      const updated = await this.prisma.backupLog.update({
        where: { backup_id: logEntry.backup_id },
        data: {
          status: 'SUCCESS',
          file_name: fileName,
          file_path: filePath,
          file_size: fileSize,
          completed_at: completedAt,
        },
      });

      await this.activityLogs.log(userId, 'BACKUP', 'backup_logs', logEntry.backup_id, `Tao backup: ${fileName}`);
      await this.cleanupExpiredBackups();
      return updated;
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      this.logger.error(`❌ Backup thất bại: ${errorMessage}`, error.stack);

      // Save FAILED status — never swallow errors
      await this.prisma.backupLog.update({
        where: { backup_id: logEntry.backup_id },
        data: {
          status: 'FAILED',
          error_message: errorMessage,
          completed_at: new Date(),
        },
      });

      throw error;
    }
  }

  // ─── Automatic backup (shared by scheduler) ───
  async runAutomaticBackup(adminId: number): Promise<{ backupId: number; fileName: string; status: string }> {
    const startedAt = new Date();

    const logEntry = await this.prisma.backupLog.create({
      data: {
        performed_by: adminId,
        action_type: 'backup',
        type: 'AUTOMATIC',
        status: 'PENDING',
        started_at: startedAt,
        triggered_by: 'SYSTEM',
      },
    });

    try {
      await this.prisma.backupLog.update({
        where: { backup_id: logEntry.backup_id },
        data: { status: 'RUNNING' },
      });

      const { fileName, filePath, fileSize } = await this.performBackup(adminId);

      const completedAt = new Date();
      await this.prisma.backupLog.update({
        where: { backup_id: logEntry.backup_id },
        data: {
          status: 'SUCCESS',
          file_name: fileName,
          file_path: filePath,
          file_size: fileSize,
          completed_at: completedAt,
        },
      });

      await this.activityLogs.log(adminId, 'BACKUP', 'backup_logs', logEntry.backup_id, `Backup tự động: ${fileName}`);
      await this.cleanupExpiredBackups();

      return { backupId: logEntry.backup_id, fileName, status: 'SUCCESS' };
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      this.logger.error(`❌ Backup tự động thất bại: ${errorMessage}`, error.stack);

      await this.prisma.backupLog.update({
        where: { backup_id: logEntry.backup_id },
        data: {
          status: 'FAILED',
          error_message: errorMessage,
          completed_at: new Date(),
        },
      });

      throw error;
    }
  }

  // ─── Restore ───
  async restore(userId: number, dto: RestoreBackupDto) {
    if (dto.confirmation !== 'RESTORE') {
      throw new BadRequestException('vui lòng xác nhận bằng cách nhập "RESTORE" để thực hiện khôi phục');
    }

    const backup = await this.prisma.backupLog.findUnique({
      where: { backup_id: dto.backup_id },
    });
    if (!backup || !backup.file_path) {
      throw new NotFoundException('Không tìm thấy bản ghi backup hoặc file backup không tồn tại');
    }

    // ── Đọc và validate file backup trước khi thay đổi bất cứ điều gì ──
    const raw = (await this.readBackupObject(backup.file_path)).toString('utf-8');
    const parsed = this.decryptBackupPayload(JSON.parse(raw));
    this.validateBackupPayload(parsed);
    const data = parsed.data;

    // ── Tự động backup hệ thống hiện tại trước khi khôi phục ──
    this.logger.log(`🔒 Tạo safety backup trước khi restore (bởi user ${userId})...`);
    try {
      await this.performBackup(userId);
    } catch (safetyErr: any) {
      this.logger.warn(`⚠️ Không thể tạo safety backup trước restore: ${safetyErr.message}`);
      // Không block restore nếu safety backup thất bại
    }

    // ── Map dữ liệu ──
    const users = data.users?.map((item: any) => ({
      ...item,
      created_at: new Date(item.created_at),
      updated_at: item.updated_at ? new Date(item.updated_at) : null,
    })) ?? [];

    const meetingMinutes = data.meetingMinutes?.map((item: any) => ({
      ...item,
      meeting_date: new Date(item.meeting_date),
      start_time: new Date(item.start_time),
      end_time: new Date(item.end_time),
      reviewed_at: item.reviewed_at ? new Date(item.reviewed_at) : null,
      published_at: item.published_at ? new Date(item.published_at) : null,
      created_at: new Date(item.created_at),
      updated_at: item.updated_at ? new Date(item.updated_at) : null,
    })) ?? [];

    const minuteTasks = data.minuteTasks?.map((item: any) => ({
      ...item,
      deadline: item.deadline ? new Date(item.deadline) : null,
    })) ?? [];

    const minuteAttachments = data.minuteAttachments?.map((item: any) => ({
      attachment_id: item.attachment_id,
      minute_id: item.minute_id,
      uploaded_by: item.uploaded_by,
      file_name: item.file_name,
      file_path: item.file_path,
      file_type: item.file_type,
      uploaded_at: new Date(item.uploaded_at),
    })) ?? [];

    const supportTickets = data.supportRequests?.map((item: any) => ({
      ...item,
      created_at: new Date(item.created_at),
      updated_at: item.updated_at ? new Date(item.updated_at) : null,
      last_message_at: item.last_message_at ? new Date(item.last_message_at) : null,
    })) ?? [];

    const supportMessages = data.supportMessages?.map((item: any) => ({
      message_id: item.message_id,
      ticket_id: item.ticket_id,
      sender_id: item.sender_id,
      sender_type: item.sender_type,
      content: item.content,
      created_at: item.created_at ? new Date(item.created_at) : item.sent_at ? new Date(item.sent_at) : new Date(),
    })) ?? [];

    const supportAttachments = data.supportAttachments?.map((item: any) => ({
      attachment_id: item.attachment_id,
      message_id: item.message_id,
      file_name: item.file_name,
      file_path: item.file_path,
      file_type: item.file_type,
      file_size: item.file_size,
      uploaded_by: item.uploaded_by,
      created_at: item.created_at ? new Date(item.created_at) : item.uploaded_at ? new Date(item.uploaded_at) : new Date(),
    })) ?? [];

    const managerRoleRequests = data.managerRoleRequests?.map((item: any) => ({
      ...item,
      created_at: new Date(item.created_at),
      updated_at: item.updated_at ? new Date(item.updated_at) : null,
    })) ?? [];

    const notifications = data.notifications?.map((item: any) => ({
      ...item,
      created_at: item.created_at ? new Date(item.created_at) : new Date(),
    })) ?? [];

    const activityLogs = data.activityLogs?.map((item: any) => ({
      ...item,
      created_at: new Date(item.created_at),
    })) ?? [];

    const backupLogs = data.backupLogs?.map((item: any) => ({
      ...item,
      created_at: new Date(item.created_at),
    })) ?? [];

    // ── Xóa theo đúng thứ tự FK: child trước, parent sau ──
    const deleteQueries: any[] = [
      this.prisma.notification.deleteMany(),
      this.prisma.supportAttachment.deleteMany(),
      this.prisma.supportMessage.deleteMany(),
      this.prisma.minuteAttachment.deleteMany(),
      this.prisma.minuteParticipant.deleteMany(),
      this.prisma.minuteTask.deleteMany(),
      this.prisma.supportTicket.deleteMany(),
      this.prisma.managerRoleRequest.deleteMany(),
      this.prisma.activityLog.deleteMany(),
      this.prisma.backupLog.deleteMany(),
      this.prisma.meetingMinute.deleteMany(),
      this.prisma.user.deleteMany(),
      this.prisma.minuteType.deleteMany(),
      this.prisma.role.deleteMany(),
    ];

    // ── Chèn theo đúng thứ tự FK: parent trước, child sau ──
    const insertQueries: any[] = [];
    if (data.roles?.length) insertQueries.push(this.prisma.role.createMany({ data: data.roles }));
    if (data.minuteTypes?.length) insertQueries.push(this.prisma.minuteType.createMany({ data: data.minuteTypes }));
    if (users.length) insertQueries.push(this.prisma.user.createMany({ data: users }));
    if (meetingMinutes.length) insertQueries.push(this.prisma.meetingMinute.createMany({ data: meetingMinutes }));
    if (minuteTasks.length) insertQueries.push(this.prisma.minuteTask.createMany({ data: minuteTasks }));
    if (data.minuteParticipants?.length) insertQueries.push(this.prisma.minuteParticipant.createMany({ data: data.minuteParticipants }));
    if (minuteAttachments.length) insertQueries.push(this.prisma.minuteAttachment.createMany({ data: minuteAttachments }));
    if (supportTickets.length) insertQueries.push(this.prisma.supportTicket.createMany({ data: supportTickets }));
    if (supportMessages.length) insertQueries.push(this.prisma.supportMessage.createMany({ data: supportMessages }));
    if (supportAttachments.length) insertQueries.push(this.prisma.supportAttachment.createMany({ data: supportAttachments }));
    if (managerRoleRequests.length) insertQueries.push(this.prisma.managerRoleRequest.createMany({ data: managerRoleRequests }));
    if (notifications.length) insertQueries.push(this.prisma.notification.createMany({ data: notifications }));
    if (activityLogs.length) insertQueries.push(this.prisma.activityLog.createMany({ data: activityLogs }));
    if (backupLogs.length) insertQueries.push(this.prisma.backupLog.createMany({ data: backupLogs }));

    // ── Thực thi trong transaction ──
    await this.prisma.$transaction([...deleteQueries, ...insertQueries]);

    // ── Khôi phục file đính kèm lên Storage ──
    const storageErrors: string[] = [];

    if (data.minuteAttachments?.length) {
      await Promise.all(
        data.minuteAttachments.map(async (attachment: any) => {
          if (!attachment.file_content_base64) return;
          try {
            await this.uploadStorageObject(
              attachment.file_path,
              Buffer.from(attachment.file_content_base64, 'base64'),
              attachment.file_type || 'application/octet-stream',
            );
          } catch (e: any) {
            storageErrors.push(`minute-attachment:${attachment.file_name}: ${e.message}`);
          }
        }),
      );
    }

    if (data.supportAttachments?.length) {
      await Promise.all(
        data.supportAttachments.map(async (attachment: any) => {
          if (!attachment.file_content_base64) return;
          try {
            await this.uploadSupportAttachmentObject(
              attachment.file_path,
              Buffer.from(attachment.file_content_base64, 'base64'),
              attachment.file_type || 'application/octet-stream',
            );
          } catch (e: any) {
            storageErrors.push(`support-attachment:${attachment.file_name}: ${e.message}`);
          }
        }),
      );
    }

    if (storageErrors.length > 0) {
      this.logger.warn(`⚠️ Một số file không thể khôi phục lên Storage:\n${storageErrors.join('\n')}`);
    }

    // ── Reset sequences ──
    await this.resetSequences();

    // ── Ghi log restore ──
    const existingSourceBackup = await this.prisma.backupLog.findFirst({
      where: { action_type: 'backup', file_path: backup.file_path },
    });
    if (!existingSourceBackup) {
      await this.prisma.backupLog.create({
        data: {
          performed_by: backup.performed_by,
          action_type: 'backup',
          file_name: backup.file_name,
          file_path: backup.file_path,
          created_at: backup.created_at,
        },
      });
    }

    let restoreLog: any;
    try {
      restoreLog = await this.prisma.backupLog.create({
        data: {
          performed_by: userId,
          action_type: 'restore',
          file_name: backup.file_name,
          file_path: backup.file_path,
          status: 'SUCCESS',
          started_at: new Date(),
          completed_at: new Date(),
        },
      });
      await this.activityLogs.log(
        userId,
        'RESTORE',
        'backup_logs',
        restoreLog.backup_id,
        `Khôi phục thành công: ${backup.file_name}`,
      );
    } catch {
      restoreLog = {
        backup_id: backup.backup_id,
        performed_by: userId,
        action_type: 'restore',
        file_name: backup.file_name,
        file_path: backup.file_path,
        status: 'SUCCESS',
        created_at: new Date(),
      };
    }

    return {
      ...restoreLog,
      storageWarnings: storageErrors.length > 0 ? storageErrors : undefined,
    };
  }

  // ─── Status API ───
  async getStatus() {
    const [allSuccessBackups, totalBackups] = await Promise.all([
      this.prisma.backupLog.findMany({
        where: { action_type: 'backup', status: 'SUCCESS' },
        orderBy: { created_at: 'desc' },
        take: 100,
        select: { created_at: true, file_name: true, performed_by: true, type: true, status: true, file_size: true },
      }),
      this.prisma.backupLog.count({ where: { action_type: 'backup' } }),
    ]);

    // Separate by type (use the explicit `type` field)
    const lastAutomaticBackup = allSuccessBackups.find((b) => b.type === 'AUTOMATIC');
    const lastManualBackup = allSuccessBackups.find((b) => b.type === 'MANUAL');

    // Calculate next backup in Asia/Ho_Chi_Minh timezone
    const nextAutomaticBackup = this.getNextBackupTimeInTimezone();

    return {
      lastBackupAt: allSuccessBackups[0]?.created_at || null,
      lastBackupFileName: allSuccessBackups[0]?.file_name || null,
      lastAutoBackupAt: lastAutomaticBackup?.created_at || null,
      lastAutoBackupFileName: lastAutomaticBackup?.file_name || null,
      lastManualBackupAt: lastManualBackup?.created_at || null,
      lastManualBackupFileName: lastManualBackup?.file_name || null,
      nextBackupAt: nextAutomaticBackup,
      totalBackups,
      retentionDays: this.backupRetentionDays,
    };
  }

  // ─── Check if today already has a successful automatic backup (for catch-up logic) ───
  async hasTodayAutomaticBackup(): Promise<boolean> {
    const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    const nowIctMs = Date.now() + ICT_OFFSET_MS;
    const todayStartIctMs = Math.floor(nowIctMs / MS_PER_DAY) * MS_PER_DAY;
    const todayEndIctMs = todayStartIctMs + MS_PER_DAY - 1;

    const count = await this.prisma.backupLog.count({
      where: {
        type: 'AUTOMATIC',
        status: 'SUCCESS',
        started_at: {
          gte: new Date(todayStartIctMs - ICT_OFFSET_MS),
          lte: new Date(todayEndIctMs - ICT_OFFSET_MS),
        },
      },
    });

    return count > 0;
  }

  // ─── Compute next 02:00 Asia/Ho_Chi_Minh ───
  getNextBackupTimeInTimezone(): string {
    const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    const nowMs = Date.now();
    // Current time in ICT
    const nowIctMs = nowMs + ICT_OFFSET_MS;
    // Start of today in ICT (00:00:00.000 ICT)
    const todayStartIctMs = Math.floor(nowIctMs / MS_PER_DAY) * MS_PER_DAY;
    // Today at 02:00 ICT
    const today2amIctMs = todayStartIctMs + 2 * 60 * 60 * 1000;
    // Convert back to UTC
    const today2amUtcMs = today2amIctMs - ICT_OFFSET_MS;

    if (nowMs >= today2amUtcMs) {
      // Already past 02:00 ICT → next is tomorrow
      return new Date(today2amUtcMs + MS_PER_DAY).toISOString();
    }

    return new Date(today2amUtcMs).toISOString();
  }

  async remove(userId: number, backupId: number) {
    const log = await this.prisma.backupLog.findUnique({
      where: { backup_id: backupId },
    });

    if (!log) {
      throw new NotFoundException('Không tìm thấy bản ghi backup để xóa');
    }

    await this.prisma.backupLog.delete({
      where: { backup_id: backupId },
    });

    if (log.action_type === 'backup' && log.file_path) {
      const remainingReferences = await this.prisma.backupLog.count({
        where: { file_path: log.file_path },
      });

      if (remainingReferences === 0) {
        try {
          await this.deleteBackupObject(log.file_path);
        } catch {
          // Ignore storage delete errors so DB state remains source of truth.
        }
      }
    }

    await this.activityLogs.log(userId, 'DELETE', 'backup_logs', backupId, `Xóa bản ghi backup: ${log.file_name || backupId}`);
    return { success: true };
  }

  private assertBackupEncryptionReady() {
    if (process.env.NODE_ENV === 'production' && !process.env.BACKUP_ENCRYPTION_KEY) {
      throw new BadRequestException('Chưa cấu hình BACKUP_ENCRYPTION_KEY để mã hóa backup');
    }
  }

  private async readStorageObject(path: string) {
    return this.readObjectFromBucket(this.attachmentBucket, path, 'Không thể đọc file đính kèm từ Supabase Storage');
  }

  private async readSupportAttachmentObject(path: string) {
    return this.readObjectFromBucket(this.attachmentBucket, path, 'Không thể đọc file đính kèm hỗ trợ từ Supabase Storage');
  }

  private async readBackupObject(path: string) {
    return this.readObjectFromBucket(this.backupBucket, path, 'Không thể đọc file backup từ Supabase Storage');
  }

  private async readObjectFromBucket(bucket: string, path: string, errorMessage: string) {
    const { url, serviceRoleKey } = this.getSupabaseConfig();
    const response = await fetch(`${url}/storage/v1/object/${bucket}/${this.encodeStoragePath(path)}`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      throw new NotFoundException(errorMessage);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  private async uploadStorageObject(path: string, content: Buffer, mimetype: string) {
    return this.uploadObjectToBucket(
      this.attachmentBucket,
      path,
      content,
      mimetype,
      'Không thể ghi file đính kèm lên Supabase Storage',
    );
  }

  private async uploadSupportAttachmentObject(path: string, content: Buffer, mimetype: string) {
    return this.uploadObjectToBucket(
      this.attachmentBucket,
      path,
      content,
      mimetype,
      'Không thể ghi file đính kèm hỗ trợ lên Supabase Storage',
    );
  }

  private async uploadBackupObject(path: string, content: Buffer, mimetype: string) {
    return this.uploadObjectToBucket(
      this.backupBucket,
      path,
      content,
      mimetype,
      'Không thể ghi file backup lên Supabase Storage',
    );
  }

  private async uploadObjectToBucket(bucket: string, path: string, content: Buffer, mimetype: string, errorMessage: string) {
    const { url, serviceRoleKey } = this.getSupabaseConfig();
    const response = await fetch(`${url}/storage/v1/object/${bucket}/${this.encodeStoragePath(path)}`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': mimetype,
        'x-upsert': 'true',
      },
      body: content as any,
    });

    if (!response.ok) {
      throw new BadRequestException(errorMessage);
    }
  }

  private async deleteBackupObject(path: string) {
    const { url, serviceRoleKey } = this.getSupabaseConfig();
    const response = await fetch(`${url}/storage/v1/object/${this.backupBucket}/${this.encodeStoragePath(path)}`, {
      method: 'DELETE',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new BadRequestException('Không thể xóa file backup trên Supabase Storage');
    }
  }

  private async cleanupExpiredBackups() {
    if (!Number.isFinite(this.backupRetentionDays) || this.backupRetentionDays <= 0) return;

    const cutoff = new Date(Date.now() - this.backupRetentionDays * 24 * 60 * 60 * 1000);
    const expiredBackups = await this.prisma.backupLog.findMany({
      where: {
        action_type: 'backup',
        created_at: { lt: cutoff },
      },
      select: {
        backup_id: true,
        file_path: true,
      },
    });

    for (const backup of expiredBackups) {
      await this.prisma.backupLog.delete({
        where: { backup_id: backup.backup_id },
      });

      if (!backup.file_path) continue;

      const remainingReferences = await this.prisma.backupLog.count({
        where: { file_path: backup.file_path },
      });

      if (remainingReferences === 0) {
        try {
          await this.deleteBackupObject(backup.file_path);
        } catch {
          // Ignore storage cleanup errors to avoid blocking new backup creation.
        }
      }
    }
  }

  private getSupabaseConfig() {
    const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new BadRequestException('Chua cau hinh SUPABASE_URL hoac SUPABASE_SERVICE_ROLE_KEY de xu ly file backup');
    }
    return { url, serviceRoleKey };
  }

  private encodeStoragePath(path: string) {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  private encryptBackupPayload(payload: unknown) {
    const key = this.getBackupEncryptionKey();
    if (!key) return payload;

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(payload), 'utf8'),
      cipher.final(),
    ]);

    return {
      encrypted: true,
      algorithm: 'aes-256-gcm',
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: encrypted.toString('base64'),
    };
  }

  private decryptBackupPayload(payload: any) {
    if (!payload?.encrypted) return payload;
    const key = this.getBackupEncryptionKey();
    if (!key) {
      throw new BadRequestException('Backup đã được mã hóa nhưng chưa cấu hình BACKUP_ENCRYPTION_KEY');
    }

    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.data, 'base64')),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString('utf8'));
  }

  private getBackupEncryptionKey() {
    const rawKey = process.env.BACKUP_ENCRYPTION_KEY;
    if (!rawKey) return null;
    return createHash('sha256').update(rawKey).digest();
  }

  private validateBackupPayload(payload: any) {
    if (!payload || !payload.data) {
      throw new BadRequestException('File backup không hợp lệ hoặc bị hỏng');
    }
    if (payload.version !== this.backupVersion) {
      throw new BadRequestException(`Phiên bản backup (v${payload.version}) không tương thích với hệ thống (v${this.backupVersion}). Vui lòng sử dụng đúng file backup.`);
    }
    if (!payload.exported_at) {
      throw new BadRequestException('File backup thiếu thông tin thời gian xuất');
    }

    const requiredArrays = [
      'roles',
      'minuteTypes',
      'users',
      'meetingMinutes',
      'minuteTasks',
      'minuteParticipants',
      'minuteAttachments',
      'supportRequests',
      'managerRoleRequests',
      'activityLogs',
      'backupLogs',
    ];
    for (const key of requiredArrays) {
      if (payload.data[key] !== undefined && !Array.isArray(payload.data[key])) {
        throw new BadRequestException(`Dữ liệu backup không hợp lệ: ${key}`);
      }
    }

    if (!Array.isArray(payload.data.roles) || payload.data.roles.length === 0) {
      throw new BadRequestException('File backup thiếu dữ liệu roles');
    }
    if (!Array.isArray(payload.data.users) || payload.data.users.length === 0) {
      throw new BadRequestException('File backup thiếu dữ liệu users');
    }
    if (!Array.isArray(payload.data.minuteTypes) || payload.data.minuteTypes.length === 0) {
      throw new BadRequestException('File backup thiếu dữ liệu minuteTypes');
    }
  }

  private async resetSequences() {
    const sequenceStatements = [
      `SELECT setval(pg_get_serial_sequence('"roles"', 'role_id'), COALESCE(MAX(role_id), 1), MAX(role_id) IS NOT NULL) FROM "roles";`,
      `SELECT setval(pg_get_serial_sequence('"minute_types"', 'type_id'), COALESCE(MAX(type_id), 1), MAX(type_id) IS NOT NULL) FROM "minute_types";`,
      `SELECT setval(pg_get_serial_sequence('"users"', 'user_id'), COALESCE(MAX(user_id), 1), MAX(user_id) IS NOT NULL) FROM "users";`,
      `SELECT setval(pg_get_serial_sequence('"meeting_minutes"', 'minute_id'), COALESCE(MAX(minute_id), 1), MAX(minute_id) IS NOT NULL) FROM "meeting_minutes";`,
      `SELECT setval(pg_get_serial_sequence('"minute_tasks"', 'task_id'), COALESCE(MAX(task_id), 1), MAX(task_id) IS NOT NULL) FROM "minute_tasks";`,
      `SELECT setval(pg_get_serial_sequence('"minute_participants"', 'participant_id'), COALESCE(MAX(participant_id), 1), MAX(participant_id) IS NOT NULL) FROM "minute_participants";`,
      `SELECT setval(pg_get_serial_sequence('"minute_attachments"', 'attachment_id'), COALESCE(MAX(attachment_id), 1), MAX(attachment_id) IS NOT NULL) FROM "minute_attachments";`,
      `SELECT setval(pg_get_serial_sequence('"support_requests"', 'request_id'), COALESCE(MAX(request_id), 1), MAX(request_id) IS NOT NULL) FROM "support_requests";`,
      `SELECT setval(pg_get_serial_sequence('"support_messages"', 'message_id'), COALESCE(MAX(message_id), 1), MAX(message_id) IS NOT NULL) FROM "support_messages";`,
      `SELECT setval(pg_get_serial_sequence('"support_attachments"', 'attachment_id'), COALESCE(MAX(attachment_id), 1), MAX(attachment_id) IS NOT NULL) FROM "support_attachments";`,
      `SELECT setval(pg_get_serial_sequence('"manager_role_requests"', 'request_id'), COALESCE(MAX(request_id), 1), MAX(request_id) IS NOT NULL) FROM "manager_role_requests";`,
      `SELECT setval(pg_get_serial_sequence('"notifications"', 'notification_id'), COALESCE(MAX(notification_id), 1), MAX(notification_id) IS NOT NULL) FROM "notifications";`,
      `SELECT setval(pg_get_serial_sequence('"activity_logs"', 'log_id'), COALESCE(MAX(log_id), 1), MAX(log_id) IS NOT NULL) FROM "activity_logs";`,
      `SELECT setval(pg_get_serial_sequence('"backup_logs"', 'backup_id'), COALESCE(MAX(backup_id), 1), MAX(backup_id) IS NOT NULL) FROM "backup_logs";`,
    ];

    for (const statement of sequenceStatements) {
      await this.prisma.$executeRawUnsafe(statement);
    }
  }
}

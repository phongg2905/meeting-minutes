import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateBackupLogDto } from './dto/create-backup-log.dto';
import { RestoreBackupDto } from './dto/restore-backup.dto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

@Injectable()
export class BackupLogsService {
  private readonly backupDir = join(process.cwd(), 'backups');
  private readonly backupVersion = 1;
  private readonly storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'meeting-attachments';

  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
  ) {}

  async findAll(query: any = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const where: any = {};
    if (query.action_type) where.action_type = query.action_type;
    if (query.search) {
      where.OR = [
        { file_name: { contains: query.search, mode: 'insensitive' } },
        { file_path: { contains: query.search, mode: 'insensitive' } },
        { performer: { is: { full_name: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }
    if (query.date_from || query.date_to) {
      where.created_at = {};
      if (query.date_from) where.created_at.gte = new Date(query.date_from);
      if (query.date_to) where.created_at.lte = new Date(`${query.date_to}T23:59:59.999Z`);
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
    await this.activityLogs.log(userId, 'CREATE', 'backup_logs', created.backup_id, `Ghi nhận ${data.action_type}`);
    return created;
  }

  async runBackup(userId: number) {
    this.assertBackupEncryptionReady();
    await fs.mkdir(this.backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${timestamp}.json`;
    const filePath = join(this.backupDir, fileName);

    const [
      roles,
      minuteTypes,
      users,
      meetingMinutes,
      minuteTasks,
      minuteParticipants,
      minuteAttachments,
      supportRequests,
      managerRoleRequests,
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
      this.prisma.supportRequest.findMany({ orderBy: { request_id: 'asc' } }),
      this.prisma.managerRoleRequest.findMany({ orderBy: { request_id: 'asc' } }),
      this.prisma.activityLog.findMany({ orderBy: { log_id: 'asc' } }),
      this.prisma.backupLog.findMany({ orderBy: { backup_id: 'asc' } }),
    ]);

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

    const payload = {
      version: this.backupVersion,
      exported_at: new Date().toISOString(),
      data: {
        roles,
        minuteTypes,
        users,
        meetingMinutes,
        minuteTasks,
        minuteParticipants,
        minuteAttachments: attachmentsWithContent,
        supportRequests,
        managerRoleRequests,
        activityLogs,
        backupLogs,
      },
    };

    await fs.writeFile(filePath, JSON.stringify(this.encryptBackupPayload(payload), null, 2), 'utf-8');

    const log = await this.prisma.backupLog.create({
      data: {
        performed_by: userId,
        action_type: 'backup',
        file_name: fileName,
        file_path: filePath,
      },
    });
    await this.activityLogs.log(userId, 'BACKUP', 'backup_logs', log.backup_id, `Tạo backup: ${fileName}`);
    return log;
  }

  async restore(userId: number, dto: RestoreBackupDto) {
    if (dto.confirmation !== 'RESTORE') {
      throw new BadRequestException('Vui lòng nhập RESTORE để xác nhận khôi phục dữ liệu');
    }

    const backup = await this.prisma.backupLog.findUnique({
      where: { backup_id: dto.backup_id },
    });
    if (!backup || backup.action_type !== 'backup' || !backup.file_path) {
      throw new NotFoundException('Không tìm thấy bản sao lưu hợp lệ');
    }

    const raw = await fs.readFile(backup.file_path, 'utf-8');
    const parsed = this.decryptBackupPayload(JSON.parse(raw));
    this.validateBackupPayload(parsed);
    const data = parsed.data;

    await this.prisma.$transaction(async (tx) => {
      await tx.minuteAttachment.deleteMany();
      await tx.minuteParticipant.deleteMany();
      await tx.minuteTask.deleteMany();
      await tx.supportRequest.deleteMany();
      await tx.managerRoleRequest.deleteMany();
      await tx.activityLog.deleteMany();
      await tx.backupLog.deleteMany();
      await tx.meetingMinute.deleteMany();
      await tx.user.deleteMany();
      await tx.minuteType.deleteMany();
      await tx.role.deleteMany();

      if (data.roles?.length) await tx.role.createMany({ data: data.roles });
      if (data.minuteTypes?.length) await tx.minuteType.createMany({ data: data.minuteTypes });
      if (data.users?.length) await tx.user.createMany({
        data: data.users.map((item: any) => ({
          ...item,
          created_at: new Date(item.created_at),
          updated_at: item.updated_at ? new Date(item.updated_at) : null,
        })),
      });
      if (data.meetingMinutes?.length) await tx.meetingMinute.createMany({
        data: data.meetingMinutes.map((item: any) => ({
          ...item,
          meeting_date: new Date(item.meeting_date),
          start_time: new Date(item.start_time),
          end_time: new Date(item.end_time),
          reviewed_at: item.reviewed_at ? new Date(item.reviewed_at) : null,
          published_at: item.published_at ? new Date(item.published_at) : null,
          created_at: new Date(item.created_at),
          updated_at: item.updated_at ? new Date(item.updated_at) : null,
        })),
      });
      if (data.minuteTasks?.length) await tx.minuteTask.createMany({
        data: data.minuteTasks.map((item: any) => ({
          ...item,
          deadline: item.deadline ? new Date(item.deadline) : null,
        })),
      });
      if (data.minuteParticipants?.length) await tx.minuteParticipant.createMany({ data: data.minuteParticipants });
      if (data.minuteAttachments?.length) await tx.minuteAttachment.createMany({
        data: data.minuteAttachments.map((item: any) => ({
          attachment_id: item.attachment_id,
          minute_id: item.minute_id,
          uploaded_by: item.uploaded_by,
          file_name: item.file_name,
          file_path: item.file_path,
          file_type: item.file_type,
          uploaded_at: new Date(item.uploaded_at),
        })),
      });
      if (data.supportRequests?.length) await tx.supportRequest.createMany({
        data: data.supportRequests.map((item: any) => ({
          ...item,
          created_at: new Date(item.created_at),
          updated_at: item.updated_at ? new Date(item.updated_at) : null,
        })),
      });
      if (data.managerRoleRequests?.length) await tx.managerRoleRequest.createMany({
        data: data.managerRoleRequests.map((item: any) => ({
          ...item,
          created_at: new Date(item.created_at),
          updated_at: item.updated_at ? new Date(item.updated_at) : null,
        })),
      });
      if (data.activityLogs?.length) await tx.activityLog.createMany({
        data: data.activityLogs.map((item: any) => ({
          ...item,
          created_at: new Date(item.created_at),
        })),
      });
      if (data.backupLogs?.length) await tx.backupLog.createMany({
        data: data.backupLogs.map((item: any) => ({
          ...item,
          created_at: new Date(item.created_at),
        })),
      });
    });

    if (data.minuteAttachments?.length) {
      await Promise.all(
        data.minuteAttachments.map(async (attachment: any) => {
          if (!attachment.file_content_base64) return;
          await this.uploadStorageObject(
            attachment.file_path,
            Buffer.from(attachment.file_content_base64, 'base64'),
            attachment.file_type || 'application/octet-stream',
          );
        }),
      );
    }

    await this.resetSequences();

    const restoreLog = await this.prisma.backupLog.create({
      data: {
        performed_by: userId,
        action_type: 'restore',
        file_name: backup.file_name,
        file_path: backup.file_path,
      },
    });
    await this.activityLogs.log(userId, 'RESTORE', 'backup_logs', restoreLog.backup_id, `Khôi phục từ backup: ${backup.file_name}`);
    return restoreLog;
  }

  private assertBackupEncryptionReady() {
    if (process.env.NODE_ENV === 'production' && !process.env.BACKUP_ENCRYPTION_KEY) {
      throw new BadRequestException('Chưa cấu hình BACKUP_ENCRYPTION_KEY để mã hóa backup');
    }
  }

  private async readStorageObject(path: string) {
    const { url, serviceRoleKey } = this.getSupabaseConfig();
    const response = await fetch(`${url}/storage/v1/object/${this.storageBucket}/${this.encodeStoragePath(path)}`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      throw new NotFoundException('Không thể đọc file đính kèm từ Supabase Storage');
    }

    return Buffer.from(await response.arrayBuffer());
  }

  private async uploadStorageObject(path: string, content: Buffer, mimetype: string) {
    const { url, serviceRoleKey } = this.getSupabaseConfig();
    const response = await fetch(`${url}/storage/v1/object/${this.storageBucket}/${this.encodeStoragePath(path)}`, {
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
      throw new BadRequestException('Không thể ghi file đính kèm lên Supabase Storage');
    }
  }

  private getSupabaseConfig() {
    const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new BadRequestException('Chưa cấu hình SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY để xử lý file backup');
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
    if (!payload || payload.version !== this.backupVersion || !payload.data) {
      throw new BadRequestException('File backup không hợp lệ hoặc không đúng phiên bản');
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
      `SELECT setval(pg_get_serial_sequence('"manager_role_requests"', 'request_id'), COALESCE(MAX(request_id), 1), MAX(request_id) IS NOT NULL) FROM "manager_role_requests";`,
      `SELECT setval(pg_get_serial_sequence('"activity_logs"', 'log_id'), COALESCE(MAX(log_id), 1), MAX(log_id) IS NOT NULL) FROM "activity_logs";`,
      `SELECT setval(pg_get_serial_sequence('"backup_logs"', 'backup_id'), COALESCE(MAX(backup_id), 1), MAX(backup_id) IS NOT NULL) FROM "backup_logs";`,
    ];

    for (const statement of sequenceStatements) {
      await this.prisma.$executeRawUnsafe(statement);
    }
  }
}

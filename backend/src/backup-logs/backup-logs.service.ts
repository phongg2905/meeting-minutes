import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateBackupLogDto } from './dto/create-backup-log.dto';
import { RestoreBackupDto } from './dto/restore-backup.dto';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

@Injectable()
export class BackupLogsService {
  private readonly backupVersion = 1;
  private readonly attachmentBucket = process.env.SUPABASE_STORAGE_BUCKET || 'meeting-attachments';
  private readonly backupBucket = process.env.BACKUP_STORAGE_BUCKET || 'system-backups';
  private readonly backupPrefix = 'backups';
  private readonly backupRetentionDays = Number(process.env.BACKUP_RETENTION_DAYS || 14);

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
    await this.activityLogs.log(userId, 'CREATE', 'backup_logs', created.backup_id, `Ghi nhan ${data.action_type}`);
    return created;
  }

  async runBackup(userId: number) {
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

    await this.uploadBackupObject(
      filePath,
      Buffer.from(JSON.stringify(this.encryptBackupPayload(payload), null, 2), 'utf-8'),
      'application/json',
    );

    const log = await this.prisma.backupLog.create({
      data: {
        performed_by: userId,
        action_type: 'backup',
        file_name: fileName,
        file_path: filePath,
      },
    });
    await this.activityLogs.log(userId, 'BACKUP', 'backup_logs', log.backup_id, `Tao backup: ${fileName}`);
    await this.cleanupExpiredBackups();
    return log;
  }

  async restore(userId: number, dto: RestoreBackupDto) {
    if (dto.confirmation !== 'RESTORE') {
      throw new BadRequestException('Vui long nhap RESTORE de xac nhan khoi phuc du lieu');
    }

    const backup = await this.prisma.backupLog.findUnique({
      where: { backup_id: dto.backup_id },
    });
    if (!backup || !backup.file_path) {
      throw new NotFoundException('Khong tim thay ban sao luu hop le');
    }

    const raw = (await this.readBackupObject(backup.file_path)).toString('utf-8');
    const parsed = this.decryptBackupPayload(JSON.parse(raw));
    this.validateBackupPayload(parsed);
    const data = parsed.data;

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

    const supportRequests = data.supportRequests?.map((item: any) => ({
      ...item,
      created_at: new Date(item.created_at),
      updated_at: item.updated_at ? new Date(item.updated_at) : null,
    })) ?? [];

    const managerRoleRequests = data.managerRoleRequests?.map((item: any) => ({
      ...item,
      created_at: new Date(item.created_at),
      updated_at: item.updated_at ? new Date(item.updated_at) : null,
    })) ?? [];

    const activityLogs = data.activityLogs?.map((item: any) => ({
      ...item,
      created_at: new Date(item.created_at),
    })) ?? [];

    const backupLogs = data.backupLogs?.map((item: any) => ({
      ...item,
      created_at: new Date(item.created_at),
    })) ?? [];

    const queries: any[] = [
      this.prisma.minuteAttachment.deleteMany(),
      this.prisma.minuteParticipant.deleteMany(),
      this.prisma.minuteTask.deleteMany(),
      this.prisma.supportRequest.deleteMany(),
      this.prisma.managerRoleRequest.deleteMany(),
      this.prisma.activityLog.deleteMany(),
      this.prisma.backupLog.deleteMany(),
      this.prisma.meetingMinute.deleteMany(),
      this.prisma.user.deleteMany(),
      this.prisma.minuteType.deleteMany(),
      this.prisma.role.deleteMany(),
    ];

    if (data.roles?.length) queries.push(this.prisma.role.createMany({ data: data.roles }));
    if (data.minuteTypes?.length) queries.push(this.prisma.minuteType.createMany({ data: data.minuteTypes }));
    if (users.length) queries.push(this.prisma.user.createMany({ data: users }));
    if (meetingMinutes.length) queries.push(this.prisma.meetingMinute.createMany({ data: meetingMinutes }));
    if (minuteTasks.length) queries.push(this.prisma.minuteTask.createMany({ data: minuteTasks }));
    if (data.minuteParticipants?.length) {
      queries.push(this.prisma.minuteParticipant.createMany({ data: data.minuteParticipants }));
    }
    if (minuteAttachments.length) queries.push(this.prisma.minuteAttachment.createMany({ data: minuteAttachments }));
    if (supportRequests.length) queries.push(this.prisma.supportRequest.createMany({ data: supportRequests }));
    if (managerRoleRequests.length) {
      queries.push(this.prisma.managerRoleRequest.createMany({ data: managerRoleRequests }));
    }
    if (activityLogs.length) queries.push(this.prisma.activityLog.createMany({ data: activityLogs }));
    if (backupLogs.length) queries.push(this.prisma.backupLog.createMany({ data: backupLogs }));

    await this.prisma.$transaction(queries);

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

    const existingSourceBackup = await this.prisma.backupLog.findFirst({
      where: {
        action_type: 'backup',
        file_path: backup.file_path,
      },
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
        },
      });
      await this.activityLogs.log(
        userId,
        'RESTORE',
        'backup_logs',
        restoreLog.backup_id,
        `Khoi phuc tu backup: ${backup.file_name}`,
      );
    } catch {
      restoreLog = {
        backup_id: backup.backup_id,
        performed_by: userId,
        action_type: 'restore',
        file_name: backup.file_name,
        file_path: backup.file_path,
        created_at: new Date(),
      };
    }

    return restoreLog;
  }

  async remove(userId: number, backupId: number) {
    const log = await this.prisma.backupLog.findUnique({
      where: { backup_id: backupId },
    });

    if (!log) {
      throw new NotFoundException('Khong tim thay ban ghi backup');
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

    await this.activityLogs.log(userId, 'DELETE', 'backup_logs', backupId, `Xoa ban ghi backup: ${log.file_name || backupId}`);
    return { success: true };
  }

  private assertBackupEncryptionReady() {
    if (process.env.NODE_ENV === 'production' && !process.env.BACKUP_ENCRYPTION_KEY) {
      throw new BadRequestException('Chua cau hinh BACKUP_ENCRYPTION_KEY de ma hoa backup');
    }
  }

  private async readStorageObject(path: string) {
    return this.readObjectFromBucket(this.attachmentBucket, path, 'Khong the doc file dinh kem tu Supabase Storage');
  }

  private async readBackupObject(path: string) {
    return this.readObjectFromBucket(this.backupBucket, path, 'Khong the doc file backup tu Supabase Storage');
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
      'Khong the ghi file dinh kem len Supabase Storage',
    );
  }

  private async uploadBackupObject(path: string, content: Buffer, mimetype: string) {
    return this.uploadObjectToBucket(
      this.backupBucket,
      path,
      content,
      mimetype,
      'Khong the ghi file backup len Supabase Storage',
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
      throw new BadRequestException('Khong the xoa file backup tren Supabase Storage');
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
      throw new BadRequestException('Backup da duoc ma hoa nhung chua cau hinh BACKUP_ENCRYPTION_KEY');
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
      throw new BadRequestException('File backup khong hop le hoac khong dung phien ban');
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
        throw new BadRequestException(`Du lieu backup khong hop le: ${key}`);
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

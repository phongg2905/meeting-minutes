import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateBackupLogDto } from './dto/create-backup-log.dto';
import { RestoreBackupDto } from './dto/restore-backup.dto';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';

@Injectable()
export class BackupLogsService {
  private readonly backupDir = join(process.cwd(), 'backups');

  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
  ) {}

  findAll() {
    return this.prisma.backupLog.findMany({
      include: { performer: { select: { full_name: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(userId: number, data: CreateBackupLogDto) {
    const created = await this.prisma.backupLog.create({ data: { ...data, performed_by: userId } });
    await this.activityLogs.log(userId, 'CREATE', 'backup_logs', created.backup_id, `Ghi nhận ${data.action_type}`);
    return created;
  }

  async runBackup(userId: number) {
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
          const content = await fs.readFile(attachment.file_path);
          file_content_base64 = content.toString('base64');
        } catch {
          file_content_base64 = null;
        }
        return { ...attachment, file_content_base64 };
      }),
    );

    const payload = {
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

    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');

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
    const backup = await this.prisma.backupLog.findUnique({
      where: { backup_id: dto.backup_id },
    });
    if (!backup || backup.action_type !== 'backup' || !backup.file_path) {
      throw new NotFoundException('Không tìm thấy bản sao lưu hợp lệ');
    }

    const raw = await fs.readFile(backup.file_path, 'utf-8');
    const parsed = JSON.parse(raw);
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
          await fs.mkdir(dirname(attachment.file_path), { recursive: true });
          await fs.writeFile(attachment.file_path, Buffer.from(attachment.file_content_base64, 'base64'));
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

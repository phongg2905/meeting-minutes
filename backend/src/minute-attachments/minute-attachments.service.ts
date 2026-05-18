import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { canManageMinute, canWriteMinutes, isPublicMinute, isSystemAdmin } from '../auth/roles.constants';

@Injectable()
export class MinuteAttachmentsService {
  private readonly uploadDir = join(process.cwd(), 'uploads', 'attachments');
  private readonly maxFileSize = 10 * 1024 * 1024;
  private readonly allowedMimeTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'text/plain',
  ]);

  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
  ) {}

  async findByMinute(minuteId: number, userId: number, roleId: number) {
    await this.assertMinuteAccess(minuteId, userId, roleId);
    return this.prisma.minuteAttachment.findMany({
      where: { minute_id: minuteId },
      include: { uploader: { select: { full_name: true } } },
      orderBy: { uploaded_at: 'desc' },
    });
  }

  async create(minuteId: number, uploadedBy: number, roleId: number, file: any) {
    if (!canWriteMinutes(roleId)) throw new ForbiddenException('Tài khoản này chỉ được tra cứu');
    this.validateFile(file);
    await this.assertMinuteWriteAccess(minuteId, uploadedBy, roleId);
    await fs.mkdir(this.uploadDir, { recursive: true });

    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const fullPath = join(this.uploadDir, safeName);
    await fs.writeFile(fullPath, file.buffer);

    const attachment = await this.prisma.minuteAttachment.create({
      data: {
        minute_id: minuteId,
        uploaded_by: uploadedBy,
        file_name: file.originalname,
        file_path: fullPath,
        file_type: file.mimetype,
      },
      include: { uploader: { select: { full_name: true } } },
    });

    await this.activityLogs.log(uploadedBy, 'UPLOAD', 'minute_attachments', attachment.attachment_id, `Tai len tep: ${file.originalname}`);
    return attachment;
  }

  async getDownload(id: number, userId: number, roleId: number) {
    const attachment = await this.prisma.minuteAttachment.findUnique({
      where: { attachment_id: id },
      include: { minute: true },
    });
    if (!attachment) throw new NotFoundException('Không tìm thấy tệp đính kèm');
    await this.assertMinuteAccess(attachment.minute_id, userId, roleId);
    await this.activityLogs.log(userId, 'DOWNLOAD', 'minute_attachments', id, `Tai xuong tep: ${attachment.file_name}`);
    return attachment;
  }

  async remove(id: number, userId: number, roleId: number) {
    if (!canWriteMinutes(roleId)) throw new ForbiddenException('Tài khoản này chỉ được tra cứu');
    const attachment = await this.prisma.minuteAttachment.findUnique({
      where: { attachment_id: id },
      include: { minute: true },
    });
    if (!attachment) throw new NotFoundException('Không tìm thấy tệp đính kèm');
    await this.assertMinuteWriteAccess(attachment.minute_id, userId, roleId);

    await this.prisma.minuteAttachment.delete({ where: { attachment_id: id } });
    try {
      await fs.unlink(attachment.file_path);
    } catch {
      // File may already be gone; DB record has still been cleaned up.
    }
    await this.activityLogs.log(userId, 'DELETE', 'minute_attachments', id, `Xóa tep: ${attachment.file_name}`);
    return { message: 'Xóa tep dinh kem thanh cong' };
  }

  private async assertMinuteAccess(minuteId: number, userId: number, roleId: number) {
    const minute = await this.prisma.meetingMinute.findUnique({
      where: { minute_id: minuteId },
    });
    if (!minute) throw new NotFoundException('Không tìm thấy biên bản');
    if (!isSystemAdmin(roleId) && minute.created_by !== userId && !(minute.status === 'completed' && isPublicMinute(minute))) {
      throw new ForbiddenException('Ban khong co quyen truy cap tep cua biên bản nay');
    }
    return minute;
  }

  private async assertMinuteWriteAccess(minuteId: number, userId: number, roleId: number) {
    const minute = await this.assertMinuteAccess(minuteId, userId, roleId);
    if (!canManageMinute(roleId, userId, minute.created_by)) {
      throw new ForbiddenException('Ban khong co quyen thay doi tep cua biên bản nay');
    }
    return minute;
  }

  private validateFile(file: any) {
    if (!file) throw new BadRequestException('Chưa chọn tệp đính kèm');
    if (file.size > this.maxFileSize) throw new BadRequestException('Tệp đính kèm khong duoc vuot qua 10MB');
    if (!this.allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Định dạng tệp không được hỗ trợ');
    }
  }
}

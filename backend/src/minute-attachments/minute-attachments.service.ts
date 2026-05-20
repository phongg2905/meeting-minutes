import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
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
  private readonly allowedExtensionsByMime = new Map<string, string[]>([
    ['application/pdf', ['.pdf']],
    ['application/msword', ['.doc']],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', ['.docx']],
    ['application/vnd.ms-excel', ['.xls']],
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ['.xlsx']],
    ['image/jpeg', ['.jpg', '.jpeg']],
    ['image/png', ['.png']],
    ['text/plain', ['.txt']],
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

    const extension = extname(file.originalname).toLowerCase();
    const safeBaseName = file.originalname
      .replace(extension, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80);
    const safeName = `${Date.now()}-${randomUUID()}-${safeBaseName}${extension}`;
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

    await this.activityLogs.log(uploadedBy, 'UPLOAD', 'minute_attachments', attachment.attachment_id, `Tải lên tệp: ${file.originalname}`);
    return attachment;
  }

  async getDownload(id: number, userId: number, roleId: number) {
    const attachment = await this.prisma.minuteAttachment.findUnique({
      where: { attachment_id: id },
      include: { minute: true },
    });
    if (!attachment) throw new NotFoundException('Không tìm thấy tệp đính kèm');
    await this.assertMinuteAccess(attachment.minute_id, userId, roleId);
    await this.activityLogs.log(userId, 'DOWNLOAD', 'minute_attachments', id, `Tải xuống tệp: ${attachment.file_name}`);
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
    await this.activityLogs.log(userId, 'DELETE', 'minute_attachments', id, `Xóa tệp: ${attachment.file_name}`);
    return { message: 'Xóa tệp đính kèm thành công' };
  }

  private async assertMinuteAccess(minuteId: number, userId: number, roleId: number) {
    const minute = await this.prisma.meetingMinute.findUnique({
      where: { minute_id: minuteId },
    });
    if (!minute) throw new NotFoundException('Không tìm thấy biên bản');
    if (!isSystemAdmin(roleId) && minute.created_by !== userId && !(minute.status === 'completed' && isPublicMinute(minute))) {
      throw new ForbiddenException('Bạn không có quyền truy cập tệp của biên bản này');
    }
    return minute;
  }

  private async assertMinuteWriteAccess(minuteId: number, userId: number, roleId: number) {
    const minute = await this.assertMinuteAccess(minuteId, userId, roleId);
    if (!canManageMinute(roleId, userId, minute.created_by)) {
      throw new ForbiddenException('Bạn không có quyền thay đổi tệp của biên bản này');
    }
    return minute;
  }

  private validateFile(file: any) {
    if (!file) throw new BadRequestException('Chưa chọn tệp đính kèm');
    if (file.size > this.maxFileSize) throw new BadRequestException('Tệp đính kèm không được vượt quá 10MB');
    if (!this.allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Định dạng tệp không được hỗ trợ');
    }
    const extension = extname(file.originalname || '').toLowerCase();
    const allowedExtensions = this.allowedExtensionsByMime.get(file.mimetype) || [];
    if (!allowedExtensions.includes(extension)) {
      throw new BadRequestException('Phần mở rộng tệp không khớp định dạng được phép');
    }
    if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw new BadRequestException('Tệp đính kèm không hợp lệ');
    }
    if (!this.hasValidSignature(file.mimetype, file.buffer)) {
      throw new BadRequestException('Nội dung tệp không khớp định dạng được phép');
    }
  }

  private hasValidSignature(mimetype: string, buffer: Buffer) {
    const startsWith = (signature: number[]) =>
      signature.every((byte, index) => buffer[index] === byte);

    if (mimetype === 'application/pdf') return startsWith([0x25, 0x50, 0x44, 0x46]);
    if (mimetype === 'image/png') return startsWith([0x89, 0x50, 0x4e, 0x47]);
    if (mimetype === 'image/jpeg') return startsWith([0xff, 0xd8, 0xff]);
    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      return startsWith([0x50, 0x4b, 0x03, 0x04]) || startsWith([0x50, 0x4b, 0x05, 0x06]) || startsWith([0x50, 0x4b, 0x07, 0x08]);
    }
    if (mimetype === 'application/msword' || mimetype === 'application/vnd.ms-excel') {
      return startsWith([0xd0, 0xcf, 0x11, 0xe0]);
    }
    if (mimetype === 'text/plain') {
      return !buffer.includes(0);
    }
    return false;
  }
}

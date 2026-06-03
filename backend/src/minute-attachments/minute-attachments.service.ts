import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { canManageMinute, canWriteMinutes, isPublicMinute, isSystemAdmin } from '../auth/roles.constants';

const ATTACHMENT_PUBLIC_SCAN_PENDING = 'pending';
const ATTACHMENT_PUBLIC_SCAN_APPROVED = 'approved';

type MinuteAccessScope = 'owner' | 'authenticated_public';

@Injectable()
export class MinuteAttachmentsService {
  private readonly storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'meeting-attachments';
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
    const { minute, scope } = await this.assertMinuteAccess(minuteId, userId, roleId);
    const attachments = await this.prisma.minuteAttachment.findMany({
      where: {
        minute_id: minuteId,
        ...(scope === 'authenticated_public' ? { is_public_safe: true } : {}),
      },
      include: { uploader: { select: { full_name: true } } },
      orderBy: { uploaded_at: 'desc' },
    });
    return attachments.map((attachment) =>
      scope === 'owner'
        ? this.toOwnerAttachment(attachment)
        : this.toPublicAttachment(attachment),
    );
  }

  async create(minuteId: number, uploadedBy: number, roleId: number, file: any) {
    if (!canWriteMinutes(roleId)) throw new ForbiddenException('TÃ i khoáº£n nÃ y chá»‰ Ä‘Æ°á»£c tra cá»©u');
    this.validateFile(file);
    await this.assertMinuteWriteAccess(minuteId, uploadedBy, roleId);
    const extension = extname(file.originalname).toLowerCase();
    const safeBaseName = file.originalname
      .replace(extension, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80);
    const safeName = `${Date.now()}-${randomUUID()}-${safeBaseName}${extension}`;
    const storagePath = `minute-attachments/${minuteId}/${safeName}`;
    await this.uploadToSupabase(storagePath, file.buffer, file.mimetype);

    const attachment = await this.prisma.minuteAttachment.create({
      data: {
        minute_id: minuteId,
        uploaded_by: uploadedBy,
        file_name: file.originalname,
        file_path: storagePath,
        file_type: file.mimetype,
        is_public_safe: false,
        public_scan_status: ATTACHMENT_PUBLIC_SCAN_PENDING,
      },
      include: { uploader: { select: { full_name: true } } },
    });

    await this.activityLogs.log(uploadedBy, 'UPLOAD', 'minute_attachments', attachment.attachment_id, `Táº£i lÃªn tá»‡p: ${file.originalname}`);
    return this.toOwnerAttachment(attachment);
  }

  async updatePublicSafety(id: number, userId: number, roleId: number, isPublicSafe: boolean) {
    if (!canWriteMinutes(roleId)) throw new ForbiddenException('TÃ i khoáº£n nÃ y chá»‰ Ä‘Æ°á»£c tra cá»©u');
    const attachment = await this.prisma.minuteAttachment.findUnique({
      where: { attachment_id: id },
      include: {
        minute: {
          select: { created_by: true },
        },
        uploader: { select: { full_name: true } },
      },
    });
    if (!attachment) throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y tá»‡p Ä‘Ã­nh kÃ¨m');
    if (!canManageMinute(roleId, userId, attachment.minute.created_by)) {
      throw new ForbiddenException('Báº¡n khÃ´ng cÃ³ quyá»n cáº­p nháº­t tráº¡ng thÃ¡i cÃ´ng khai cá»§a tá»‡p nÃ y');
    }

    const updated = await this.prisma.minuteAttachment.update({
      where: { attachment_id: id },
      data: {
        is_public_safe: isPublicSafe,
        // Keep a dedicated scan status so an async scanner can later move files
        // from pending -> approved/rejected without changing the visibility API.
        public_scan_status: isPublicSafe ? ATTACHMENT_PUBLIC_SCAN_APPROVED : ATTACHMENT_PUBLIC_SCAN_PENDING,
      },
      include: { uploader: { select: { full_name: true } } },
    });

    await this.activityLogs.log(
      userId,
      'UPDATE',
      'minute_attachments',
      id,
      `${isPublicSafe ? 'Đánh dấu an toàn công khai' : 'Thu hồi công khai'}: ${updated.file_name}`,
    );
    return this.toOwnerAttachment(updated);
  }

  async getDownload(id: number, userId: number, roleId: number) {
    const attachment = await this.prisma.minuteAttachment.findUnique({
      where: { attachment_id: id },
      include: {
        minute: {
          include: {
            creator: {
              select: { status: true },
            },
          },
        },
      },
    });
    if (!attachment) throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y tá»‡p Ä‘Ã­nh kÃ¨m');

    const { scope } = this.assertAttachmentAccess(attachment, userId, roleId);
    if (scope === 'authenticated_public' && !attachment.is_public_safe) {
      throw new ForbiddenException('Tá»‡p Ä‘Ã­nh kÃ¨m nÃ y chÆ°a Ä‘Æ°á»£c cho phÃ©p trong luá»“ng cÃ´ng khai');
    }

    await this.activityLogs.log(userId, 'DOWNLOAD', 'minute_attachments', id, `Táº£i xuá»‘ng tá»‡p: ${attachment.file_name}`);
    const content = await this.readAttachmentContent(attachment.file_path);
    return { attachment, content };
  }

  async remove(id: number, userId: number, roleId: number) {
    if (!canWriteMinutes(roleId)) throw new ForbiddenException('TÃ i khoáº£n nÃ y chá»‰ Ä‘Æ°á»£c tra cá»©u');
    const attachment = await this.prisma.minuteAttachment.findUnique({
      where: { attachment_id: id },
      include: { minute: true },
    });
    if (!attachment) throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y tá»‡p Ä‘Ã­nh kÃ¨m');
    await this.assertMinuteWriteAccess(attachment.minute_id, userId, roleId);

    await this.prisma.minuteAttachment.delete({ where: { attachment_id: id } });
    try {
      await this.deleteAttachmentContent(attachment.file_path);
    } catch {
      // File may already be gone; DB record has still been cleaned up.
    }
    await this.activityLogs.log(userId, 'DELETE', 'minute_attachments', id, `XÃ³a tá»‡p: ${attachment.file_name}`);
    return { message: 'XÃ³a tá»‡p Ä‘Ã­nh kÃ¨m thÃ nh cÃ´ng' };
  }

  private async uploadToSupabase(path: string, buffer: Buffer, mimetype: string) {
    const { url, serviceRoleKey } = this.getSupabaseConfig();
    const response = await fetch(`${url}/storage/v1/object/${this.storageBucket}/${this.encodeStoragePath(path)}`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': mimetype,
        'x-upsert': 'false',
      },
      body: buffer as any,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new BadRequestException(`KhÃ´ng thá»ƒ táº£i file lÃªn Supabase Storage${detail ? `: ${detail}` : ''}`);
    }
  }

  private async readAttachmentContent(path: string) {
    const { url, serviceRoleKey } = this.getSupabaseConfig();
    const response = await fetch(`${url}/storage/v1/object/${this.storageBucket}/${this.encodeStoragePath(path)}`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      throw new NotFoundException('KhÃ´ng thá»ƒ táº£i ná»™i dung file tá»« Supabase Storage');
    }

    return Buffer.from(await response.arrayBuffer());
  }

  private async deleteAttachmentContent(path: string) {
    const { url, serviceRoleKey } = this.getSupabaseConfig();
    const response = await fetch(`${url}/storage/v1/object/${this.storageBucket}`, {
      method: 'DELETE',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: [path] }),
    });

    if (!response.ok) {
      throw new BadRequestException('KhÃ´ng thá»ƒ xÃ³a file trÃªn Supabase Storage');
    }
  }

  private getSupabaseConfig() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
    if (!url || !serviceRoleKey) {
      throw new BadRequestException('ChÆ°a cáº¥u hÃ¬nh SUPABASE_URL hoáº·c SUPABASE_SERVICE_ROLE_KEY Ä‘á»ƒ lÆ°u file');
    }
    return { url, serviceRoleKey };
  }

  private encodeStoragePath(path: string) {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  private async assertMinuteAccess(minuteId: number, userId: number, roleId: number) {
    const minute = await this.prisma.meetingMinute.findUnique({
      where: { minute_id: minuteId },
      include: { creator: { select: { status: true } } },
    });
    if (!minute) throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y biÃªn báº£n');
    return this.assertAttachmentAccess({ minute }, userId, roleId);
  }

  private assertAttachmentAccess(
    source: {
      minute: {
        created_by: number;
        status: string;
        is_public: boolean;
        creator?: { status?: string | null } | null;
      };
      is_public_safe?: boolean;
    },
    userId: number,
    roleId: number,
  ) {
    const { minute } = source;
    if (isSystemAdmin(roleId) || minute.created_by === userId) {
      return { minute, scope: 'owner' as MinuteAccessScope };
    }

    const creatorIsActive = !minute.creator || minute.creator.status === 'active';
    if (minute.status === 'completed' && isPublicMinute(minute) && creatorIsActive) {
      return { minute, scope: 'authenticated_public' as MinuteAccessScope };
    }

    throw new ForbiddenException('Báº¡n khÃ´ng cÃ³ quyá»n truy cáº­p tá»‡p cá»§a biÃªn báº£n nÃ y');
  }

  private async assertMinuteWriteAccess(minuteId: number, userId: number, roleId: number) {
    const { minute } = await this.assertMinuteAccess(minuteId, userId, roleId);
    if (!canManageMinute(roleId, userId, minute.created_by)) {
      throw new ForbiddenException('Báº¡n khÃ´ng cÃ³ quyá»n thay Ä‘á»•i tá»‡p cá»§a biÃªn báº£n nÃ y');
    }
    return minute;
  }

  private toOwnerAttachment(attachment: any) {
    const { file_path, ...safeAttachment } = attachment;
    return safeAttachment;
  }

  private toPublicAttachment(attachment: any) {
    return {
      attachment_id: attachment.attachment_id,
      minute_id: attachment.minute_id,
      file_name: attachment.file_name,
      file_type: attachment.file_type,
      is_public_safe: attachment.is_public_safe,
      uploaded_at: attachment.uploaded_at,
    };
  }

  private validateFile(file: any) {
    if (!file) throw new BadRequestException('ChÆ°a chá»n tá»‡p Ä‘Ã­nh kÃ¨m');
    if (file.size > this.maxFileSize) throw new BadRequestException('Tá»‡p Ä‘Ã­nh kÃ¨m khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 10MB');
    if (!this.allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Äá»‹nh dáº¡ng tá»‡p khÃ´ng Ä‘Æ°á»£c há»— trá»£');
    }
    const extension = extname(file.originalname || '').toLowerCase();
    const allowedExtensions = this.allowedExtensionsByMime.get(file.mimetype) || [];
    if (!allowedExtensions.includes(extension)) {
      throw new BadRequestException('Pháº§n má»Ÿ rá»™ng tá»‡p khÃ´ng khá»›p Ä‘á»‹nh dáº¡ng Ä‘Æ°á»£c phÃ©p');
    }
    if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw new BadRequestException('Tá»‡p Ä‘Ã­nh kÃ¨m khÃ´ng há»£p lá»‡');
    }
    if (!this.hasValidSignature(file.mimetype, file.buffer)) {
      throw new BadRequestException('Ná»™i dung tá»‡p khÃ´ng khá»›p Ä‘á»‹nh dáº¡ng Ä‘Æ°á»£c phÃ©p');
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

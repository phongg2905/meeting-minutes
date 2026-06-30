import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { RequestInfoDto } from './dto/request-info.dto';
import { CompleteTicketDto } from './dto/complete-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { ROLE_ADMIN, isSystemAdmin } from '../auth/roles.constants';
import { extname } from 'path';
import { randomUUID } from 'crypto';

const TICKET_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  WAITING_FOR_USER: 'WAITING_FOR_USER',
  COMPLETED: 'COMPLETED',
} as const;

const SENDER_TYPE = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

@Injectable()
export class SupportTicketsService {
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
    private notifications: NotificationsService,
  ) {}

  private parseDateBoundary(value: string, endOfDay = false) {
    const suffix = endOfDay ? '23:59:59.999+07:00' : '00:00:00.000+07:00';
    const date = new Date(`${value}T${suffix}`);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(endOfDay ? 'Ngày kết thúc không hợp lệ' : 'Ngày bắt đầu không hợp lệ');
    }
    return date;
  }

  /**
   * ─── USER: Tạo ticket mới ───
   * Status = PENDING
   * Gửi notification NEW_SUPPORT_REQUEST cho Admin
   */
  async create(userId: number, dto: CreateTicketDto) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        requested_by: userId,
        title: dto.title,
        content: dto.content,
        category: dto.category || null,
        status: TICKET_STATUS.PENDING,
        last_message_at: new Date(),
      },
      include: {
        requester: { select: { user_id: true, full_name: true, email: true } },
      },
    });

    // Ghi log hoạt động
    await this.activityLogs.log(
      userId,
      'CREATE',
      'support_requests',
      ticket.ticket_id,
      `Tạo yêu cầu hỗ trợ: ${ticket.title}`,
    );

    // Gửi notification cho Admin
    await this.notifications.createForRoles(
      [ROLE_ADMIN],
      {
        title: 'Yêu cầu hỗ trợ mới',
        message: `${ticket.requester?.full_name || 'Người dùng'} đã gửi yêu cầu: ${ticket.title}`,
        type: 'NEW_SUPPORT_REQUEST',
        target_table: 'support_requests',
        target_id: ticket.ticket_id,
      },
      [userId],
    );

    return this.formatTicketResponse(ticket);
  }

  /**
   * ─── Danh sách ticket ───
   * User: chỉ xem ticket của mình
   * Admin: xem tất cả, có filter
   */
  async findAll(userId: number, roleId: number, query: QueryTicketDto = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const where: any = {};

    // User chỉ thấy ticket của mình
    if (!isSystemAdmin(roleId)) {
      where.requested_by = userId;
    }

    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
        ...(isSystemAdmin(roleId)
          ? [
              {
                requester: {
                  full_name: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                requester: {
                  email: { contains: query.search, mode: 'insensitive' },
                },
              },
            ]
          : []),
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
      this.prisma.supportTicket.findMany({
        where,
        select: {
          ticket_id: true,
          requested_by: true,
          title: true,
          content: true,
          status: true,
          category: true,
          created_at: true,
          _count: { select: { messages: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * ─── Chi tiết ticket + messages + attachments ───
   */
  async findOne(id: number, userId: number, roleId: number) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { ticket_id: id },
      include: {
        requester: {
          select: { user_id: true, full_name: true, email: true },
        },
        handler: {
          select: { user_id: true, full_name: true, email: true },
        },
        assignee: {
          select: { user_id: true, full_name: true, email: true },
        },
        resolver: {
          select: { user_id: true, full_name: true, email: true },
        },
        messages: {
          orderBy: { created_at: 'asc' },
          include: {
            sender: {
              select: { user_id: true, full_name: true, email: true },
            },
            attachments: true,
          },
        },
      },
    });

    if (!ticket)
      throw new NotFoundException('Không tìm thấy yêu cầu hỗ trợ');

    if (!isSystemAdmin(roleId) && ticket.requested_by !== userId) {
      throw new ForbiddenException('Không có quyền xem yêu cầu này');
    }

    return ticket;
  }

  /**
   * ─── Gửi message vào ticket ───
   * User: chỉ khi WAITING_FOR_USER → chuyển về PROCESSING + notif Admin
   * Admin: chỉ khi PROCESSING hoặc PENDING
   */
  async addMessage(
    id: number,
    userId: number,
    roleId: number,
    dto: AddMessageDto,
    files?: Express.Multer.File[],
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { ticket_id: id },
    });

    if (!ticket)
      throw new NotFoundException('Không tìm thấy yêu cầu hỗ trợ');

    const isAdmin = isSystemAdmin(roleId);

    // Kiểm tra quyền gửi message
    if (isAdmin) {
      if (ticket.status === TICKET_STATUS.COMPLETED) {
        throw new BadRequestException('Ticket đã hoàn thành, không thể gửi thêm tin nhắn');
      }
      if (ticket.status === TICKET_STATUS.WAITING_FOR_USER) {
        throw new BadRequestException(
          'Đang chờ người dùng bổ sung thông tin, không thể gửi tin nhắn lúc này',
        );
      }
    } else {
      // User
      if (ticket.requested_by !== userId) {
        throw new ForbiddenException('Không có quyền gửi tin nhắn trong ticket này');
      }
      if (ticket.status !== TICKET_STATUS.WAITING_FOR_USER) {
        throw new BadRequestException(
          'Chỉ có thể phản hồi khi admin yêu cầu bổ sung thông tin',
        );
      }
    }

    // Validate files nếu có
    if (files?.length) {
      if (files.length > 5) {
        throw new BadRequestException('Chỉ được tải lên tối đa 5 tệp đính kèm một lần');
      }
      for (const file of files) {
        this.validateFile(file);
      }
    }

    const isFirstTimeProcessing = isAdmin && ticket.status === TICKET_STATUS.PENDING;
    const uploadedPaths: string[] = [];

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Tạo message
        const message = await tx.supportMessage.create({
          data: {
            ticket_id: id,
            sender_id: userId,
            sender_type: isAdmin ? SENDER_TYPE.ADMIN : SENDER_TYPE.USER,
            content: dto.content,
          },
        });

        // Upload files nếu có
        if (files?.length) {
          const attachmentData = [];
          for (const file of files) {
            const extension = extname(file.originalname).toLowerCase();
            const safeBaseName = file.originalname
              .replace(extension, '')
              .replace(/[^a-zA-Z0-9._-]/g, '_')
              .slice(0, 80);
            const safeName = `${Date.now()}-${randomUUID()}-${safeBaseName}${extension}`;
            const storagePath = `support-attachments/${id}/${safeName}`;

            await this.uploadToSupabase(storagePath, file.buffer, file.mimetype);
            uploadedPaths.push(storagePath);

            attachmentData.push({
              message_id: message.message_id,
              file_name: file.originalname,
              file_path: storagePath,
              file_type: file.mimetype,
              file_size: file.size,
              uploaded_by: userId,
            });
          }

          await tx.supportAttachment.createMany({ data: attachmentData });
        }

        // Cập nhật trạng thái ticket
        const updateData: any = {
          last_message_at: new Date(),
        };

        if (isAdmin) {
          updateData.handled_by = userId;
          if (ticket.status === TICKET_STATUS.PENDING) {
            updateData.status = TICKET_STATUS.PROCESSING;
          }
        } else {
          updateData.status = TICKET_STATUS.PROCESSING;
        }

        const updatedTicket = await tx.supportTicket.update({
          where: { ticket_id: id },
          data: updateData,
        });

        return { message, ticketStatus: updatedTicket.status };
      });

      // Ghi log
      await this.activityLogs.log(
        userId,
        'MESSAGE',
        'support_requests',
        id,
        `Gửi tin nhắn trong ticket: ${ticket.title}`,
      );

      // Gửi Notifications ngoài transaction để tránh nghẽn
      if (isAdmin) {
        // Admin phản hồi -> Gửi notif cho User
        if (ticket.requested_by) {
          await this.notifications.createForUser(ticket.requested_by, {
            title: isFirstTimeProcessing ? 'Yêu cầu hỗ trợ đã được tiếp nhận' : 'Có phản hồi mới từ Admin',
            message: `Ticket "${ticket.title}": ${dto.content.slice(0, 100)}`,
            type: isFirstTimeProcessing ? 'SUPPORT_PROCESSING' : 'SUPPORT_MESSAGE_NEW',
            target_table: 'support_requests',
            target_id: id,
          });
        }
      } else {
        // User phản hồi -> Gửi notif cho Admin
        await this.notifications.createForRoles(
          [ROLE_ADMIN],
          {
            title: 'Người dùng đã bổ sung thông tin',
            message: `Ticket "${ticket.title}" đã được cập nhật với thông tin bổ sung`,
            type: 'SUPPORT_UPDATED',
            target_table: 'support_requests',
            target_id: id,
          },
        );
      }

      return {
        message: result.message,
        ticket_status: result.ticketStatus,
      };

    } catch (error) {
      // Rollback files đã upload lên Supabase nếu có lỗi xảy ra
      for (const path of uploadedPaths) {
        try {
          await this.deleteAttachmentContent(path);
        } catch {}
      }
      throw error;
    }
  }

  /**
   * ─── Admin yêu cầu bổ sung thông tin ───
   * Status: PROCESSING → WAITING_FOR_USER
   * Gửi notification REQUEST_MORE_INFORMATION cho User
   */
  async requestMoreInfo(
    id: number,
    adminId: number,
    roleId: number,
    dto: RequestInfoDto,
  ) {
    if (!isSystemAdmin(roleId)) {
      throw new ForbiddenException('Chỉ admin mới được yêu cầu bổ sung thông tin');
    }

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { ticket_id: id },
    });

    if (!ticket)
      throw new NotFoundException('Không tìm thấy yêu cầu hỗ trợ');
    if (ticket.status !== TICKET_STATUS.PROCESSING && ticket.status !== TICKET_STATUS.PENDING) {
      throw new BadRequestException(
        'Chỉ có thể yêu cầu bổ sung thông tin khi ticket đang ở trạng thái PENDING hoặc PROCESSING',
      );
    }

    // Tạo message từ Admin (yêu cầu bổ sung)
    const message = await this.prisma.supportMessage.create({
      data: {
        ticket_id: id,
        sender_id: adminId,
        sender_type: SENDER_TYPE.ADMIN,
        content: dto.content,
      },
    });

    // Cập nhật ticket
    await this.prisma.supportTicket.update({
      where: { ticket_id: id },
      data: {
        status: TICKET_STATUS.WAITING_FOR_USER,
        handled_by: adminId,
        last_message_at: new Date(),
      },
    });

    // Gửi notification REQUEST_MORE_INFORMATION cho User
    if (ticket.requested_by) {
      await this.notifications.createForUser(ticket.requested_by, {
        title: 'Yêu cầu bổ sung thông tin',
        message: `Admin yêu cầu bổ sung thông tin cho yêu cầu "${ticket.title}". Vui lòng kiểm tra và phản hồi.`,
        type: 'REQUEST_MORE_INFORMATION',
        target_table: 'support_requests',
        target_id: id,
      });
    }

    // Ghi log
    await this.activityLogs.log(
      adminId,
      'REQUEST_INFO',
      'support_requests',
      id,
      `Yêu cầu bổ sung thông tin cho ticket: ${ticket.title}`,
    );

    return { message, status: TICKET_STATUS.WAITING_FOR_USER };
  }

  /**
   * ─── Admin hoàn thành ticket ───
   * Status → COMPLETED
   * Gửi notification SUPPORT_COMPLETED cho User
   * Ticket bị khóa — không thể gửi thêm message
   */
  async complete(
    id: number,
    adminId: number,
    roleId: number,
    dto: CompleteTicketDto,
  ) {
    if (!isSystemAdmin(roleId)) {
      throw new ForbiddenException('Chỉ admin mới được hoàn thành ticket');
    }

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { ticket_id: id },
    });

    if (!ticket)
      throw new NotFoundException('Không tìm thấy yêu cầu hỗ trợ');
    if (ticket.status === TICKET_STATUS.COMPLETED) {
      throw new BadRequestException('Ticket đã được hoàn thành trước đó');
    }
    // PENDING, PROCESSING, WAITING_FOR_USER → COMPLETED đều được phép
    const normalizedResolution = dto.resolution.trim();
    if (!normalizedResolution) {
      throw new BadRequestException('Nội dung kết quả xử lý không được để trống');
    }
    const resolutionContent = normalizedResolution;

    // Tạo message kết quả từ Admin
    await this.prisma.supportMessage.create({
      data: {
        ticket_id: id,
        sender_id: adminId,
        sender_type: SENDER_TYPE.ADMIN,
        content: resolutionContent,
      },
    });

    // Cập nhật ticket
    await this.prisma.supportTicket.update({
      where: { ticket_id: id },
      data: {
        status: TICKET_STATUS.COMPLETED,
        resolution: resolutionContent,
        handled_by: adminId,
        resolved_by: adminId,
        resolved_at: new Date(),
        last_message_at: new Date(),
      },
    });

    // Gửi notification SUPPORT_COMPLETED cho User
    if (ticket.requested_by) {
      await this.notifications.createForUser(ticket.requested_by, {
        title: 'Yêu cầu hỗ trợ đã được xử lý',
        message: `Yêu cầu "${ticket.title}" đã được xử lý xong. Vui lòng xem kết quả.`,
        type: 'SUPPORT_COMPLETED',
        target_table: 'support_requests',
        target_id: id,
      });
    }

    // Ghi log
    await this.activityLogs.log(
      adminId,
      'COMPLETE',
      'support_requests',
      id,
      `Hoàn thành xử lý ticket: ${ticket.title}. Kết quả: ${resolutionContent}`,
    );

    return {
      message: 'Ticket đã được hoàn thành',
      status: TICKET_STATUS.COMPLETED,
    };
  }

  /**
   * ─── Upload attachment cho message ───
   */
  async getDownloadAttachment(id: number, userId: number, roleId: number) {
    const attachment = await this.prisma.supportAttachment.findUnique({
      where: { attachment_id: id },
      include: {
        message: {
          include: {
            ticket: true,
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException('Không tìm thấy tệp đính kèm');
    }

    const ticket = attachment.message.ticket;
    const isUserAuthorized =
      isSystemAdmin(roleId) ||
      ticket.requested_by === userId ||
      ticket.handled_by === userId ||
      ticket.assigned_admin === userId;

    if (!isUserAuthorized) {
      throw new ForbiddenException('Bạn không có quyền tải tệp đính kèm này');
    }

    await this.activityLogs.log(
      userId,
      'DOWNLOAD',
      'support_attachments',
      id,
      `Tải xuống tệp đính kèm hỗ trợ: ${attachment.file_name}`,
    );

    const content = await this.readAttachmentContent(attachment.file_path);
    return { attachment, content };
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
      throw new NotFoundException('Không thể tải nội dung file từ Supabase Storage');
    }

    return Buffer.from(await response.arrayBuffer());
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
      throw new BadRequestException(`Không thể tải file lên Supabase Storage${detail ? `: ${detail}` : ''}`);
    }
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
      throw new BadRequestException('Không thể xóa file trên Supabase Storage');
    }
  }

  private getSupabaseConfig() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
    if (!url || !serviceRoleKey) {
      throw new BadRequestException('Chưa cấu hình SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY để lưu file');
    }
    return { url, serviceRoleKey };
  }

  private encodeStoragePath(path: string) {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  private validateFile(file: any) {
    if (!file) throw new BadRequestException('Chưa chọn tệp đính kèm');
    if (file.size > this.maxFileSize) throw new BadRequestException(`Tệp đính kèm "${file.originalname}" không được vượt quá 10MB`);
    if (!this.allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException(`Định dạng tệp "${file.originalname}" không được hỗ trợ`);
    }
    const extension = extname(file.originalname || '').toLowerCase();
    const allowedExtensions = this.allowedExtensionsByMime.get(file.mimetype) || [];
    if (!allowedExtensions.includes(extension)) {
      throw new BadRequestException(`Phần mở rộng tệp "${file.originalname}" không khớp định dạng được phép`);
    }
    if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw new BadRequestException(`Tệp đính kèm "${file.originalname}" không hợp lệ`);
    }
    if (!this.hasValidSignature(file.mimetype, file.buffer)) {
      throw new BadRequestException(`Nội dung tệp "${file.originalname}" không khớp định dạng được phép`);
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

  /**
   * ─── Hỗ trợ: format response ───
   */
  private formatTicketResponse(ticket: any) {
    const { ...rest } = ticket;
    return rest;
  }
}

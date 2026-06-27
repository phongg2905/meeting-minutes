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
  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
    private notifications: NotificationsService,
  ) {}

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
        const d = new Date(query.date_from);
        if (isNaN(d.getTime()))
          throw new BadRequestException('Ngày bắt đầu không hợp lệ');
        where.created_at.gte = d;
      }
      if (query.date_to) {
        const d = new Date(`${query.date_to}T23:59:59.999Z`);
        if (isNaN(d.getTime()))
          throw new BadRequestException('Ngày kết thúc không hợp lệ');
        where.created_at.lte = d;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
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
          _count: { select: { messages: true } },
        },
        orderBy: [{ last_message_at: 'desc' }, { created_at: 'desc' }],
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

    // Tạo message
    const message = await this.prisma.supportMessage.create({
      data: {
        ticket_id: id,
        sender_id: userId,
        sender_type: isAdmin ? SENDER_TYPE.ADMIN : SENDER_TYPE.USER,
        content: dto.content,
      },
    });

    // Upload files nếu có
    if (files?.length) {
      const attachmentData = files.map((file) => ({
        message_id: message.message_id,
        file_name: file.originalname,
        file_path: file.path || file.filename,
        file_type: file.mimetype,
        file_size: file.size,
        uploaded_by: userId,
      }));

      await this.prisma.supportAttachment.createMany({ data: attachmentData });
    }

    // Cập nhật trạng thái ticket
    const updateData: any = {
      last_message_at: new Date(),
    };

    if (isAdmin) {
      // Admin gửi message → luôn set handled_by + chuyển sang PROCESSING nếu đang PENDING
      updateData.handled_by = userId;
      if (ticket.status === TICKET_STATUS.PENDING) {
        updateData.status = TICKET_STATUS.PROCESSING;
      }
    } else {
      // User gửi message khi WAITING_FOR_USER → quay lại PROCESSING + notif Admin
      updateData.status = TICKET_STATUS.PROCESSING;

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

    await this.prisma.supportTicket.update({
      where: { ticket_id: id },
      data: updateData,
    });

    // Ghi log
    await this.activityLogs.log(
      userId,
      'MESSAGE',
      'support_requests',
      id,
      `Gửi tin nhắn trong ticket: ${ticket.title}`,
    );

    return {
      message,
      ticket_status: updateData.status || ticket.status,
    };
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
    if (ticket.status === TICKET_STATUS.PENDING) {
      throw new BadRequestException(
        'Ticket chưa được xử lý. Vui lòng xử lý trước khi hoàn thành.',
      );
    }
    if (ticket.status === TICKET_STATUS.WAITING_FOR_USER) {
      throw new BadRequestException(
        'Đang chờ người dùng bổ sung thông tin. Không thể hoàn thành lúc này.',
      );
    }

    // Tạo message kết quả từ Admin
    await this.prisma.supportMessage.create({
      data: {
        ticket_id: id,
        sender_id: adminId,
        sender_type: SENDER_TYPE.ADMIN,
        content: dto.resolution,
      },
    });

    // Cập nhật ticket
    await this.prisma.supportTicket.update({
      where: { ticket_id: id },
      data: {
        status: TICKET_STATUS.COMPLETED,
        resolution: dto.resolution,
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
      `Hoàn thành xử lý ticket: ${ticket.title}. Kết quả: ${dto.resolution}`,
    );

    return {
      message: 'Ticket đã được hoàn thành',
      status: TICKET_STATUS.COMPLETED,
    };
  }

  /**
   * ─── Upload attachment cho message ───
   */
  async uploadAttachment(
    ticketId: number,
    messageId: number,
    userId: number,
    roleId: number,
    file: Express.Multer.File,
  ) {
    // Kiểm tra quyền truy cập ticket
    await this.findOne(ticketId, userId, roleId);

    const message = await this.prisma.supportMessage.findUnique({
      where: { message_id: messageId },
    });
    if (!message || message.ticket_id !== ticketId) {
      throw new NotFoundException('Không tìm thấy tin nhắn');
    }

    return this.prisma.supportAttachment.create({
      data: {
        message_id: messageId,
        file_name: file.originalname,
        file_path: file.path || file.filename,
        file_type: file.mimetype,
        file_size: file.size,
        uploaded_by: userId,
      },
    });
  }

  /**
   * ─── Hỗ trợ: format response ───
   */
  private formatTicketResponse(ticket: any) {
    const { ...rest } = ticket;
    return rest;
  }
}

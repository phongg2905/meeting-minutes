import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';
import { UpdateSupportRequestDto } from './dto/update-support-request.dto';
import { ROLE_ADMIN, isSystemAdmin } from '../auth/roles.constants';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SupportRequestsService {
  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
    private notifications: NotificationsService,
  ) {}

  async findAll(userId: number, roleId: number, query: any = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const where: any = isSystemAdmin(roleId) ? {} : { requested_by: userId };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
        { response: { contains: query.search, mode: 'insensitive' } },
        ...(isSystemAdmin(roleId) ? [
          { requester: { is: { full_name: { contains: query.search, mode: 'insensitive' } } } },
          { requester: { is: { email: { contains: query.search, mode: 'insensitive' } } } },
        ] : []),
      ];
    }
    if (query.date_from || query.date_to) {
      where.created_at = {};
      if (query.date_from) {
        const d = new Date(query.date_from);
        if (isNaN(d.getTime())) throw new BadRequestException('Ngày bắt đầu không hợp lệ');
        where.created_at.gte = d;
      }
      if (query.date_to) {
        const d = new Date(`${query.date_to}T23:59:59.999Z`);
        if (isNaN(d.getTime())) throw new BadRequestException('Ngày kết thúc không hợp lệ');
        where.created_at.lte = d;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: {
          requester: { select: { user_id: true, full_name: true, email: true } },
          handler: { select: { user_id: true, full_name: true, email: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: number, userId: number, roleId: number) {
    const request = await this.prisma.supportTicket.findUnique({
      where: { ticket_id: id },
      include: {
        requester: { select: { user_id: true, full_name: true, email: true } },
        handler: { select: { user_id: true, full_name: true, email: true } },
      },
    });
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu hỗ trợ');
    if (!isSystemAdmin(roleId) && request.requested_by !== userId) {
      throw new ForbiddenException('Không có quyền xem yêu cầu này');
    }
    return request;
  }

  async create(userId: number, dto: CreateSupportRequestDto) {
    const request = await this.prisma.supportTicket.create({
      data: {
        requested_by: userId,
        title: dto.title,
        content: dto.content,
      },
    });
    await this.activityLogs.log(userId, 'CREATE', 'support_requests', request.ticket_id, `Tạo yêu cầu hỗ trợ: ${request.title}`);
    await this.notifications.createForRoles([ROLE_ADMIN], {
      title: 'Yêu cầu hỗ trợ mới',
      message: request.title,
      type: 'support',
      target_table: 'support_requests',
      target_id: request.ticket_id,
    }, [userId]);
    return request;
  }

  async update(id: number, actorId: number, roleId: number, dto: UpdateSupportRequestDto) {
    if (!isSystemAdmin(roleId)) {
      throw new ForbiddenException('Chỉ quản trị viên mới được xử lý yêu cầu hỗ trợ');
    }
    await this.findOne(id, actorId, roleId);
    const request = await this.prisma.supportTicket.update({
      where: { ticket_id: id },
      data: {
        status: dto.status,
        response: dto.response,
        handled_by: actorId,
      },
    });
    await this.activityLogs.log(actorId, 'UPDATE', 'support_requests', id, `Xử lý yêu cầu hỗ trợ: ${request.title}`);
    await this.notifications.createForUser(request.requested_by, {
      title: 'Yêu cầu hỗ trợ đã được xử lý',
      message: request.title,
      type: 'support',
      target_table: 'support_requests',
      target_id: request.ticket_id,
    });
    return request;
  }
}

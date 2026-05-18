import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

  findAll(userId: number, roleId: number) {
    const where = isSystemAdmin(roleId) ? {} : { requested_by: userId };
    return this.prisma.supportRequest.findMany({
      where,
      include: {
        requester: { select: { user_id: true, full_name: true, email: true } },
        handler: { select: { user_id: true, full_name: true, email: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number, userId: number, roleId: number) {
    const request = await this.prisma.supportRequest.findUnique({
      where: { request_id: id },
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
    const request = await this.prisma.supportRequest.create({
      data: {
        requested_by: userId,
        title: dto.title,
        content: dto.content,
      },
    });
    await this.activityLogs.log(userId, 'CREATE', 'support_requests', request.request_id, `Tạo yêu cầu hỗ trợ: ${request.title}`);
    await this.notifications.createForRoles([ROLE_ADMIN], {
      title: 'Yêu cầu hỗ trợ mới',
      message: request.title,
      type: 'support',
      target_table: 'support_requests',
      target_id: request.request_id,
    }, [userId]);
    return request;
  }

  async update(id: number, actorId: number, roleId: number, dto: UpdateSupportRequestDto) {
    if (!isSystemAdmin(roleId)) {
      throw new ForbiddenException('Chỉ quản trị viên mới được xử lý yêu cầu hỗ trợ');
    }
    await this.findOne(id, actorId, roleId);
    const request = await this.prisma.supportRequest.update({
      where: { request_id: id },
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
      target_id: request.request_id,
    });
    return request;
  }
}

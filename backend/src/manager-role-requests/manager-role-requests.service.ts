import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ROLE_ADMIN, ROLE_MINUTE_MANAGER, ROLE_STANDARD_USER, isSystemAdmin } from '../auth/roles.constants';
import { CreateManagerRoleRequestDto } from './dto/create-manager-role-request.dto';
import { ReviewManagerRoleRequestDto } from './dto/review-manager-role-request.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ManagerRoleRequestsService {
  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
    private notifications: NotificationsService,
  ) {}

  findAll(roleId: number, userId: number) {
    const where = isSystemAdmin(roleId) ? {} : { user_id: userId };
    return this.prisma.managerRoleRequest.findMany({
      where,
      include: {
        user: { select: { user_id: true, full_name: true, email: true, status: true, role: true } },
        reviewer: { select: { user_id: true, full_name: true, email: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(userId: number, dto: CreateManagerRoleRequestDto) {
    const user = await this.prisma.user.findUnique({ where: { user_id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    if (user.role_id === ROLE_MINUTE_MANAGER) {
      throw new BadRequestException('Tài khoản đã là quản lý biên bản');
    }
    if (user.role_id !== ROLE_STANDARD_USER) {
      throw new ForbiddenException('Chỉ người dùng thường mới cần đăng ký làm quản lý');
    }

    const pending = await this.prisma.managerRoleRequest.findFirst({
      where: { user_id: userId, status: 'pending' },
    });
    if (pending) throw new BadRequestException('Bạn đã có yêu cầu đang chờ duyệt');

    const request = await this.prisma.managerRoleRequest.create({
      data: { user_id: userId, reason: dto.reason },
    });
    await this.activityLogs.log(userId, 'CREATE', 'manager_role_requests', request.request_id, 'Gửi yêu cầu trở thành quản lý');
    await this.notifications.createForRoles([ROLE_ADMIN], {
      title: 'Yêu cầu đăng ký quản lý mới',
      message: user.full_name,
      type: 'manager_request',
      target_table: 'manager_role_requests',
      target_id: request.request_id,
    }, [userId]);
    return request;
  }

  async review(id: number, adminId: number, roleId: number, dto: ReviewManagerRoleRequestDto) {
    if (!isSystemAdmin(roleId)) throw new ForbiddenException('Chỉ admin được duyệt yêu cầu');
    if (!['approved', 'rejected'].includes(dto.status)) {
      throw new BadRequestException('Trạng thái duyệt không hợp lệ');
    }

    const existing = await this.prisma.managerRoleRequest.findUnique({ where: { request_id: id } });
    if (!existing) throw new NotFoundException('Không tìm thấy yêu cầu');
    if (existing.status !== 'pending') throw new BadRequestException('Yêu cầu đã được xử lý');

    const result = await this.prisma.$transaction(async (tx) => {
      const request = await tx.managerRoleRequest.update({
        where: { request_id: id },
        data: {
          status: dto.status,
          response: dto.response,
          reviewed_by: adminId,
        },
      });
      if (dto.status === 'approved') {
        await tx.user.update({
          where: { user_id: existing.user_id },
          data: { role_id: ROLE_MINUTE_MANAGER },
        });
      }
      return request;
    });

    await this.activityLogs.log(adminId, 'REVIEW', 'manager_role_requests', id, `${dto.status === 'approved' ? 'Duyệt' : 'Từ chối'} yêu cầu làm quản lý`);
    await this.notifications.createForUser(existing.user_id, {
      title: 'Yêu cầu đăng ký quản lý đã được xử lý',
      message: dto.status === 'approved' ? 'Yêu cầu của bạn đã được duyệt' : 'Yêu cầu của bạn đã bị từ chối',
      type: 'manager_request',
      target_table: 'manager_role_requests',
      target_id: id,
    });
    return result;
  }
}

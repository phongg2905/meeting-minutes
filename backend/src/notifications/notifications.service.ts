import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isSystemAdmin } from '../auth/roles.constants';

type NotificationInput = {
  title: string;
  message: string;
  type?: string;
  target_table?: string;
  target_id?: number;
};

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: number, limit = 20) {
    return this.prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: Math.min(Math.max(Number(limit) || 20, 1), 50),
    });
  }

  unreadCount(userId: number) {
    return this.prisma.notification.count({
      where: { user_id: userId, is_read: false },
    }).then((count) => ({ count }));
  }

  async markAsRead(id: number, userId: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { notification_id: id },
    });
    if (!notification) throw new NotFoundException('Không tìm thấy thông báo');
    if (notification.user_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem thông báo này');
    }
    return this.prisma.notification.update({
      where: { notification_id: id },
      data: { is_read: true, read_at: new Date() },
    });
  }

  markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });
  }

  createForUser(userId: number | undefined | null, data: NotificationInput) {
    if (!userId) return Promise.resolve(null);
    return this.prisma.notification.create({
      data: {
        user_id: userId,
        title: data.title,
        message: data.message,
        type: data.type || 'info',
        target_table: data.target_table,
        target_id: data.target_id,
      },
    });
  }

  async createForRoles(roleIds: number[], data: NotificationInput, excludeUserIds: number[] = []) {
    const users = await this.prisma.user.findMany({
      where: {
        role_id: { in: roleIds },
        status: 'active',
        user_id: excludeUserIds.length ? { notIn: excludeUserIds } : undefined,
      },
      select: { user_id: true },
    });
    if (!users.length) return { count: 0 };
    return this.prisma.notification.createMany({
      data: users.map((user) => ({
        user_id: user.user_id,
        title: data.title,
        message: data.message,
        type: data.type || 'info',
        target_table: data.target_table,
        target_id: data.target_id,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Sidebar summary — aggregated counts for notification badges.
   * Trả về số liệu khác nhau theo vai trò.
   */
  async sidebarSummary(userId: number, roleId: number) {
    const isAdmin = isSystemAdmin(roleId);

    // Meetings: số thông báo chưa đọc liên quan đến meeting_minutes
    const meetingsUnread = await this.prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false,
        target_table: 'meeting_minutes',
      },
    });

    // Support tickets
    let supportUnread = 0;
    let supportPending = 0;

    if (isAdmin) {
      // Admin: số ticket chưa xử lý (PENDING + PROCESSING)
      supportPending = await this.prisma.supportTicket.count({
        where: { status: { in: ['PENDING', 'PROCESSING'] } },
      });
      // Admin: số thông báo chưa đọc liên quan support
      supportUnread = await this.prisma.notification.count({
        where: {
          user_id: userId,
          is_read: false,
          target_table: 'support_requests',
        },
      });
    } else {
      // User: ticket của mình đang chờ xử lý (không phải COMPLETED)
      supportPending = await this.prisma.supportTicket.count({
        where: {
          requested_by: userId,
          status: { not: 'COMPLETED' },
        },
      });
      supportUnread = await this.prisma.notification.count({
        where: {
          user_id: userId,
          is_read: false,
          target_table: 'support_requests',
        },
      });
    }

    // Admin-only: manager role requests pending, backup errors, system warnings
    let managerRequestsPending = 0;
    let backupErrorCount = 0;
    let systemAlertCount = 0;

    if (isAdmin) {
      managerRequestsPending = await this.prisma.managerRoleRequest.count({
        where: { status: 'pending' },
      });

      // Backup errors: backup logs with 'backup' action_type — không có trường error riêng,
      // dùng count hoặc check lần backup gần nhất
      const latestBackup = await this.prisma.backupLog.findFirst({
        where: { action_type: 'backup' },
        orderBy: { created_at: 'desc' },
      });
      if (latestBackup) {
        const hoursSinceLastBackup = (Date.now() - latestBackup.created_at.getTime()) / 3600000;
        // Cảnh báo nếu quá 26 giờ không có backup mới
        if (hoursSinceLastBackup > 26) {
          backupErrorCount = 1;
        }
      } else {
        backupErrorCount = 1; // Chưa từng backup
      }

      // System alerts: activity logs có lỗi trong 24h
      const oneDayAgo = new Date(Date.now() - 24 * 3600000);
      systemAlertCount = await this.prisma.activityLog.count({
        where: {
          action_name: { contains: 'ERROR', mode: 'insensitive' },
          created_at: { gte: oneDayAgo },
        },
      });
    }

    return {
      meetings: {
        unread: meetingsUnread,
        pending: 0, // Không có khái niệm pending cho biên bản trong hệ thống hiện tại
      },
      support: {
        unread: supportUnread,
        pending: supportPending,
      },
      admin: isAdmin
        ? {
            managerRequests: managerRequestsPending,
            activityWarnings: 0,
            backupErrors: backupErrorCount,
            systemAlerts: systemAlertCount,
          }
        : undefined,
      totalUnread: meetingsUnread + supportUnread,
      updatedAt: new Date().toISOString(),
    };
  }
}

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
   * Sidebar summary used by header/sidebar badges.
   */
  async sidebarSummary(userId: number, roleId: number) {
    const isAdmin = isSystemAdmin(roleId);

    const meetingsUnreadPromise = this.prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false,
        target_table: 'meeting_minutes',
      },
    });

    const supportUnreadPromise = this.prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false,
        target_table: 'support_requests',
      },
    });

    const supportPendingPromise = isAdmin
      ? this.prisma.supportTicket.count({
          where: { status: { in: ['PENDING', 'PROCESSING'] } },
        })
      : this.prisma.supportTicket.count({
          where: {
            requested_by: userId,
            status: { not: 'COMPLETED' },
          },
        });

    const managerRequestsPendingPromise = isAdmin
      ? this.prisma.managerRoleRequest.count({
          where: { status: 'pending' },
        })
      : Promise.resolve(0);

    const latestBackupPromise = isAdmin
      ? this.prisma.backupLog.findFirst({
          where: { action_type: 'backup' },
          orderBy: { created_at: 'desc' },
        })
      : Promise.resolve(null);

    const systemAlertCountPromise = isAdmin
      ? this.prisma.activityLog.count({
          where: {
            action_name: { contains: 'ERROR', mode: 'insensitive' },
            created_at: { gte: new Date(Date.now() - 24 * 3600000) },
          },
        })
      : Promise.resolve(0);

    const [
      meetingsUnread,
      supportUnread,
      supportPending,
      managerRequestsPending,
      latestBackup,
      systemAlertCount,
    ] = await Promise.all([
      meetingsUnreadPromise,
      supportUnreadPromise,
      supportPendingPromise,
      managerRequestsPendingPromise,
      latestBackupPromise,
      systemAlertCountPromise,
    ]);

    let backupErrorCount = 0;
    if (isAdmin) {
      if (latestBackup) {
        const hoursSinceLastBackup = (Date.now() - latestBackup.created_at.getTime()) / 3600000;
        if (hoursSinceLastBackup > 26) {
          backupErrorCount = 1;
        }
      } else {
        backupErrorCount = 1;
      }
    }

    return {
      meetings: {
        unread: meetingsUnread,
        pending: 0,
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

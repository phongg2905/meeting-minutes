import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ManagerRoleRequestsController } from './manager-role-requests.controller';
import { ManagerRoleRequestsService } from './manager-role-requests.service';

@Module({
  imports: [PrismaModule, ActivityLogsModule, NotificationsModule],
  controllers: [ManagerRoleRequestsController],
  providers: [ManagerRoleRequestsService],
})
export class ManagerRoleRequestsModule {}

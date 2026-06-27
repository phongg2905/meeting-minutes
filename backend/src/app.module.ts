import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { MeetingMinutesModule } from './meeting-minutes/meeting-minutes.module';
import { MinuteTypesModule } from './minute-types/minute-types.module';
import { MinuteTasksModule } from './minute-tasks/minute-tasks.module';
import { MinuteParticipantsModule } from './minute-participants/minute-participants.module';
import { MinuteAttachmentsModule } from './minute-attachments/minute-attachments.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { BackupLogsModule } from './backup-logs/backup-logs.module';
import { SupportRequestsModule } from './support-requests/support-requests.module';
import { SupportTicketsModule } from './support-tickets/support-tickets.module';
import { HealthModule } from './health/health.module';
import { ManagerRoleRequestsModule } from './manager-role-requests/manager-role-requests.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TasksModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    MeetingMinutesModule,
    MinuteTypesModule,
    MinuteTasksModule,
    MinuteParticipantsModule,
    MinuteAttachmentsModule,
    ActivityLogsModule,
    BackupLogsModule,
    SupportRequestsModule,
    SupportTicketsModule,
    ManagerRoleRequestsModule,
    NotificationsModule,
    HealthModule,
  ],
})
export class AppModule {}

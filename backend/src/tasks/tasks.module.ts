import { Module } from '@nestjs/common';
import { BackupSchedulerService } from './backup-scheduler.service';
import { BackupLogsModule } from '../backup-logs/backup-logs.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [BackupLogsModule, PrismaModule],
  providers: [BackupSchedulerService],
})
export class TasksModule {}

import { Module } from '@nestjs/common';
import { BackupLogsService } from './backup-logs.service';
import { BackupLogsController } from './backup-logs.controller';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [ActivityLogsModule],
  providers: [BackupLogsService],
  controllers: [BackupLogsController],
  exports: [BackupLogsService],
})
export class BackupLogsModule {}

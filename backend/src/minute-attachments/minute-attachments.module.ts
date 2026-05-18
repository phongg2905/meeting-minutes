import { Module } from '@nestjs/common';
import { MinuteAttachmentsService } from './minute-attachments.service';
import { MinuteAttachmentsController } from './minute-attachments.controller';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [ActivityLogsModule],
  providers: [MinuteAttachmentsService],
  controllers: [MinuteAttachmentsController],
})
export class MinuteAttachmentsModule {}

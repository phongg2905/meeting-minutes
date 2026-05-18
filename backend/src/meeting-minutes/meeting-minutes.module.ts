import { Module } from '@nestjs/common';
import { MeetingMinutesService } from './meeting-minutes.service';
import { MeetingMinutesController } from './meeting-minutes.controller';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { PublicMeetingMinutesController } from './public-meeting-minutes.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ActivityLogsModule, NotificationsModule],
  providers: [MeetingMinutesService],
  controllers: [MeetingMinutesController, PublicMeetingMinutesController],
  exports: [MeetingMinutesService],
})
export class MeetingMinutesModule {}

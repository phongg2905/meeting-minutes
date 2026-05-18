import { Module } from '@nestjs/common';
import { MinuteParticipantsService } from './minute-participants.service';
import { MinuteParticipantsController } from './minute-participants.controller';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [ActivityLogsModule],
  providers: [MinuteParticipantsService],
  controllers: [MinuteParticipantsController],
})
export class MinuteParticipantsModule {}

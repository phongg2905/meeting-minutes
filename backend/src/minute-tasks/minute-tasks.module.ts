import { Module } from '@nestjs/common';
import { MinuteTasksService } from './minute-tasks.service';
import { MinuteTasksController } from './minute-tasks.controller';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [ActivityLogsModule],
  providers: [MinuteTasksService],
  controllers: [MinuteTasksController],
})
export class MinuteTasksModule {}

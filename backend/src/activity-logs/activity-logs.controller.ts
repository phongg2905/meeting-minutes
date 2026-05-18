import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityLogsService } from './activity-logs.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/jwt-auth.guard';

@ApiTags('Activity Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(1)
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private service: ActivityLogsService) {}
  @Get()
  findAll() { return this.service.findAll(); }
}

import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MinuteTasksService } from './minute-tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMinuteTaskDto } from './dto/create-minute-task.dto';
import { UpdateMinuteTaskDto } from './dto/update-minute-task.dto';

@ApiTags('Minute Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('minute-tasks')
export class MinuteTasksController {
  constructor(private service: MinuteTasksService) {}

  @Get('minute/:minuteId')
  findByMinute(@Param('minuteId', ParseIntPipe) minuteId: number, @Request() req) {
    return this.service.findByMinute(minuteId, req.user.user_id, req.user.role_id);
  }

  @Post('minute/:minuteId')
  create(@Param('minuteId', ParseIntPipe) minuteId: number, @Request() req, @Body() data: CreateMinuteTaskDto) {
    return this.service.create(minuteId, req.user.user_id, req.user.role_id, data);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Request() req, @Body() data: UpdateMinuteTaskDto) {
    return this.service.update(id, req.user.user_id, req.user.role_id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.service.remove(id, req.user.user_id, req.user.role_id);
  }
}

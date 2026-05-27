import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMeetingMinuteDto } from './dto/create-meeting-minute.dto';
import { MeetingMinutesService } from './meeting-minutes.service';
import { QueryMeetingMinuteDto } from './dto/query-meeting-minute.dto';
import { UpdateMeetingMinuteDto } from './dto/update-meeting-minute.dto';

@ApiTags('Meeting Minutes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meeting-minutes')
export class MeetingMinutesController {
  constructor(
    private service: MeetingMinutesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách biên bản họp' })
  findAll(@Query() query: QueryMeetingMinuteDto, @Request() req) {
    return this.service.findAll(query, req.user.user_id, req.user.role_id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.service.findOne(id, req.user.user_id, req.user.role_id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo biên bản họp mới' })
  create(@Body() dto: CreateMeetingMinuteDto, @Request() req) {
    return this.service.create(dto, req.user.user_id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMeetingMinuteDto, @Request() req) {
    return this.service.update(id, dto, req.user.user_id, req.user.role_id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái biên bản' })
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body('status') status: string, @Body('review_note') reviewNote: string, @Request() req) {
    return this.service.updateStatus(id, status, req.user.user_id, req.user.role_id, reviewNote);
  }

  @Patch(':id/public')
  @ApiOperation({ summary: 'Công khai/ẩn biên bản' })
  updatePublic(@Param('id', ParseIntPipe) id: number, @Body('is_public') isPublic: boolean, @Request() req) {
    return this.service.updatePublic(id, isPublic, req.user.user_id, req.user.role_id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.service.remove(id, req.user.user_id, req.user.role_id);
  }
}

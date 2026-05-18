import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MinuteParticipantsService } from './minute-participants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMinuteParticipantDto } from './dto/create-minute-participant.dto';
import { UpdateMinuteParticipantDto } from './dto/update-minute-participant.dto';

@ApiTags('Minute Participants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('minute-participants')
export class MinuteParticipantsController {
  constructor(private service: MinuteParticipantsService) {}

  @Get('minute/:minuteId')
  findByMinute(@Param('minuteId', ParseIntPipe) id: number, @Request() req) {
    return this.service.findByMinute(id, req.user.user_id, req.user.role_id);
  }

  @Post('minute/:minuteId')
  create(@Param('minuteId', ParseIntPipe) id: number, @Request() req, @Body() data: CreateMinuteParticipantDto) {
    return this.service.create(id, req.user.user_id, req.user.role_id, data);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Request() req, @Body() data: UpdateMinuteParticipantDto) {
    return this.service.update(id, req.user.user_id, req.user.role_id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.service.remove(id, req.user.user_id, req.user.role_id);
  }
}

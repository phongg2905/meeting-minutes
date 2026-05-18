import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MeetingMinutesService } from './meeting-minutes.service';
import { QueryMeetingMinuteDto } from './dto/query-meeting-minute.dto';

@ApiTags('Public Meeting Minutes')
@Controller('public/meeting-minutes')
export class PublicMeetingMinutesController {
  constructor(private readonly service: MeetingMinutesService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách biên bản công khai' })
  findAll(@Query() query: QueryMeetingMinuteDto) {
    return this.service.findPublic(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết biên bản công khai' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findPublicOne(id);
  }
}

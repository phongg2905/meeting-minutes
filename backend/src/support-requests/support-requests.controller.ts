import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SupportRequestsService } from './support-requests.service';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';
import { UpdateSupportRequestDto } from './dto/update-support-request.dto';

@ApiTags('Support Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('support-requests')
export class SupportRequestsController {
  constructor(private service: SupportRequestsService) {}

  @Get()
  findAll(@Request() req, @Query() query: any) {
    return this.service.findAll(req.user.user_id, req.user.role_id, query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.service.findOne(id, req.user.user_id, req.user.role_id);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateSupportRequestDto) {
    return this.service.create(req.user.user_id, dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Request() req, @Body() dto: UpdateSupportRequestDto) {
    return this.service.update(id, req.user.user_id, req.user.role_id, dto);
  }
}

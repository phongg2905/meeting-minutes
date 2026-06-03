import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ManagerRoleRequestsService } from './manager-role-requests.service';
import { CreateManagerRoleRequestDto } from './dto/create-manager-role-request.dto';
import { ReviewManagerRoleRequestDto } from './dto/review-manager-role-request.dto';

@ApiTags('Manager Role Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('manager-role-requests')
export class ManagerRoleRequestsController {
  constructor(private service: ManagerRoleRequestsService) {}

  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.user.role_id, req.user.user_id);
  }

  @Get('pending')
  findPending(@Request() req) {
    return this.service.findPending(req.user.role_id, req.user.user_id);
  }

  @Get('history')
  findHistory(@Request() req) {
    return this.service.findHistory(req.user.role_id, req.user.user_id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.service.findOne(id, req.user.role_id, req.user.user_id);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateManagerRoleRequestDto) {
    return this.service.create(req.user.user_id, dto);
  }

  @Patch(':id/review')
  review(@Param('id', ParseIntPipe) id: number, @Request() req, @Body() dto: ReviewManagerRoleRequestDto) {
    return this.service.review(id, req.user.user_id, req.user.role_id, dto);
  }
}

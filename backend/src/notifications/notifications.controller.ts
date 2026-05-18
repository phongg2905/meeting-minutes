import { Controller, Get, Param, ParseIntPipe, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thông báo của người dùng hiện tại' })
  findAll(@Request() req, @Query('limit') limit?: string) {
    return this.notifications.findAll(req.user.user_id, Number(limit) || 20);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Số thông báo chưa đọc' })
  unreadCount(@Request() req) {
    return this.notifications.unreadCount(req.user.user_id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu một thông báo đã đọc' })
  markAsRead(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.notifications.markAsRead(id, req.user.user_id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo đã đọc' })
  markAllAsRead(@Request() req) {
    return this.notifications.markAllAsRead(req.user.user_id);
  }
}

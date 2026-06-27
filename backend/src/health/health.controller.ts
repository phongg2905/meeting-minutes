import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/jwt-auth.guard';

@ApiTags('Health')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(1)
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getHealth() {
    const [users, minutes, openSupport, recentErrors] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.meetingMinute.count(),
      this.prisma.supportTicket.count({ where: { status: 'PENDING' } }),
      this.prisma.activityLog.count({ where: { action_name: { contains: 'ERROR', mode: 'insensitive' } } }),
    ]);

    return {
      status: 'ok',
      checked_at: new Date().toISOString(),
      database: 'connected',
      users,
      minutes,
      open_support_requests: openSupport,
      logged_errors: recentErrors,
    };
  }
}

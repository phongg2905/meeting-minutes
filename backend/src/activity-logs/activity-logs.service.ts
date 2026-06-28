import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityLogsService {
  constructor(private prisma: PrismaService) {}

  private parseDateBoundary(value: string, endOfDay = false) {
    const suffix = endOfDay ? '23:59:59.999+07:00' : '00:00:00.000+07:00'
    const date = new Date(`${value}T${suffix}`)
    if (isNaN(date.getTime())) {
      throw new BadRequestException(endOfDay ? 'Ngày kết thúc không hợp lệ' : 'Ngày bắt đầu không hợp lệ')
    }
    return date
  }

  async log(userId: number, actionName: string, targetTable?: string, targetId?: number, detail?: string) {
    return this.prisma.activityLog.create({
      data: { user_id: userId, action_name: actionName, target_table: targetTable, target_id: targetId, action_detail: detail },
    });
  }

  async findAll(query: any = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const where: any = {};
    if (query.action_name) where.action_name = query.action_name;
    if (query.target_table) where.target_table = query.target_table;
    if (query.search) {
      where.OR = [
        { action_detail: { contains: query.search, mode: 'insensitive' } },
        { action_name: { contains: query.search, mode: 'insensitive' } },
        { target_table: { contains: query.search, mode: 'insensitive' } },
        { user: { is: { full_name: { contains: query.search, mode: 'insensitive' } } } },
        { user: { is: { email: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }
    if (query.date_from || query.date_to) {
      where.created_at = {};
      if (query.date_from) {
        where.created_at.gte = this.parseDateBoundary(query.date_from);
      }
      if (query.date_to) {
        where.created_at.lte = this.parseDateBoundary(query.date_to, true);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        include: { user: { select: { full_name: true, email: true } } },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.activityLog.count({ where }),
    ]);
    return { data, total, page, limit };
  }
}

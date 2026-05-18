import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityLogsService {
  constructor(private prisma: PrismaService) {}

  async log(userId: number, actionName: string, targetTable?: string, targetId?: number, detail?: string) {
    return this.prisma.activityLog.create({
      data: { user_id: userId, action_name: actionName, target_table: targetTable, target_id: targetId, action_detail: detail },
    });
  }

  findAll(query?: any) {
    return this.prisma.activityLog.findMany({
      include: { user: { select: { full_name: true, email: true } } },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }
}

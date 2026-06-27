import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BackupLogsService } from '../backup-logs/backup-logs.service';

@Injectable()
export class BackupSchedulerService {
  private readonly logger = new Logger(BackupSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly backupLogsService: BackupLogsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyBackup() {
    this.logger.log('⏰ Bắt đầu backup tự động hàng ngày...');

    try {
      const admin = await this.prisma.user.findFirst({
        where: { role_id: 1, status: 'active' },
        orderBy: { user_id: 'asc' },
      });

      if (!admin) {
        this.logger.warn('⚠️ Không tìm thấy admin nào để thực hiện backup tự động.');
        return;
      }

      const result = await this.backupLogsService.runBackup(admin.user_id);
      this.logger.log(`✅ Backup tự động hoàn tất: ${result.file_name}`);
    } catch (error: any) {
      this.logger.error(`❌ Backup tự động thất bại: ${error.message}`, error.stack);
    }
  }
}

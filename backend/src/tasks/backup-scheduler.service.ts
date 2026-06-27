import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BackupLogsService } from '../backup-logs/backup-logs.service';

@Injectable()
export class BackupSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BackupSchedulerService.name);

  // Lock flag to prevent duplicate catch-up backup runs
  private catchUpRunning = false;
  private catchUpDone = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly backupLogsService: BackupLogsService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  // ─── On startup, log cron info and check for catch-up ───
  async onApplicationBootstrap() {
    this.logCronJobInfo();

    // Catch-up backup: if app starts after 02:00 Asia/Ho_Chi_Minh and no backup today
    try {
      await this.runCatchUpIfNeeded();
    } catch (error: any) {
      this.logger.error(`Catch-up backup failed: ${error.message}`, error.stack);
    }
  }

  private logCronJobInfo() {
    try {
      const job = this.schedulerRegistry.getCronJob('daily-database-backup');
      this.logger.log(`✅ Cron job "${job.name}" đã được đăng ký`);
      this.logger.log(`   Thời gian chạy (theo lịch): ${job.cronTime.toString()}`);
      
      const lastDate = job.lastDate();
      if (lastDate) {
        this.logger.log(`   Lần chạy gần nhất: ${lastDate.toISOString()}`);
        const lastInTz = lastDate.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        this.logger.log(`   Lần chạy gần nhất (Asia/Ho_Chi_Minh): ${lastInTz}`);
      } else {
        this.logger.log('   Lần chạy gần nhất: chưa chạy');
      }

      const nextDates = job.nextDates(1);
      if (nextDates.length > 0) {
        const nextRunDate = new Date(nextDates[0] as any);
        this.logger.log(`   Lần chạy tiếp theo: ${nextRunDate.toISOString()}`);
        const nextInTz = nextRunDate.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        this.logger.log(`   Lần chạy tiếp theo (Asia/Ho_Chi_Minh): ${nextInTz}`);
      } else {
        this.logger.log('   Lần chạy tiếp theo: không xác định');
      }
    } catch (err: any) {
      this.logger.warn(`⚠️ Không thể đọc thông tin cron job: ${err.message}`);
    }
  }

  private async runCatchUpIfNeeded() {
    if (this.catchUpDone) {
      this.logger.log('Catch-up đã được thực hiện trước đó, bỏ qua.');
      return;
    }

    if (this.catchUpRunning) {
      this.logger.log('Catch-up đang chạy, bỏ qua yêu cầu trùng lặp.');
      return;
    }

    // Check if current time in Asia/Ho_Chi_Minh is past 02:00
    const now = new Date();
    const hourInTz = parseInt(
      now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hour12: false }),
    );

    if (hourInTz < 2) {
      this.logger.log('Chưa đến 02:00 Asia/Ho_Chi_Minh, không cần catch-up.');
      this.catchUpDone = true;
      return;
    }

    // Check if today already has a successful automatic backup
    const hasBackup = await this.backupLogsService.hasTodayAutomaticBackup();
    if (hasBackup) {
      this.logger.log('Hôm nay đã có backup tự động thành công, không cần catch-up.');
      this.catchUpDone = true;
      return;
    }

    // Proceed with catch-up
    this.catchUpRunning = true;
    this.logger.log('⏰ Phát hiện cần catch-up backup (sau 02:00 nhưng chưa có backup hôm nay). Đang thực hiện...');

    try {
      const admin = await this.prisma.user.findFirst({
        where: { role_id: 1, status: 'active' },
        orderBy: { user_id: 'asc' },
      });

      if (!admin) {
        this.logger.warn('⚠️ Không tìm thấy admin nào để thực hiện catch-up backup.');
        return;
      }

      const result = await this.backupLogsService.runAutomaticBackup(admin.user_id);
      this.logger.log(`✅ Catch-up backup hoàn tất: ${result.fileName} (status: ${result.status})`);
    } catch (error: any) {
      this.logger.error(`❌ Catch-up backup thất bại: ${error.message}`, error.stack);
    } finally {
      this.catchUpRunning = false;
      this.catchUpDone = true;
    }
  }

  // ─── Daily scheduled backup at 02:00 Asia/Ho_Chi_Minh ───
  @Cron('0 0 2 * * *', {
    name: 'daily-database-backup',
    timeZone: 'Asia/Ho_Chi_Minh',
    waitForCompletion: true,
  })
  async handleDailyBackup() {
    this.logger.log('⏰ Bắt đầu backup tự động hàng ngày (02:00 Asia/Ho_Chi_Minh)...');

    try {
      const admin = await this.prisma.user.findFirst({
        where: { role_id: 1, status: 'active' },
        orderBy: { user_id: 'asc' },
      });

      if (!admin) {
        this.logger.warn('⚠️ Không tìm thấy admin nào để thực hiện backup tự động.');
        return;
      }

      const result = await this.backupLogsService.runAutomaticBackup(admin.user_id);
      this.logger.log(`✅ Backup tự động hoàn tất: ${result.fileName} (status: ${result.status})`);
    } catch (error: any) {
      this.logger.error(`❌ Backup tự động thất bại: ${error.message}`, error.stack);
    }
  }


}

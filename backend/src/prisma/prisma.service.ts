import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY_MS = 2000;
  private readonly MAX_STARTUP_RETRIES = 10;

  constructor() {
    super({
      log: ['warn', 'error'],
      errorFormat: 'minimal',
    });
  }

  async onModuleInit() {
    await this.connectWithRetry(this.MAX_STARTUP_RETRIES);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Kết nối database với cơ chế retry.
   * Giúp xử lý trường hợp Supabase free tier bị pause (cần đánh thức).
   */
  private async connectWithRetry(maxRetries: number): Promise<void> {
    while (this.reconnectAttempts < maxRetries) {
      try {
        await this.$connect();
        this.reconnectAttempts = 0;
        this.logger.log('Database connected successfully');
        return;
      } catch (error) {
        this.reconnectAttempts++;
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `Database connection attempt ${this.reconnectAttempts}/${maxRetries} failed: ${message}`,
        );
        if (this.reconnectAttempts >= maxRetries) {
          this.logger.error('All database connection attempts failed. Server will start but DB is unavailable.');
          return;
        }
        await this.delay(this.RECONNECT_DELAY_MS);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisClientType } from 'redis';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject('REDIS_CLIENT')
    private readonly redisClient: RedisClientType,
  ) {}

  async checkHealth(): Promise<any> {
    const startTime = Date.now();

    try {
      const dbStatus = await this.checkDatabase();
      const redisStatus = await this.checkRedis();

      const response = {
        service: 'scx-service',
        status: dbStatus.status === 'ok' && redisStatus.status === 'ok' ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        redis: redisStatus,
        system: this.getSystemInfo(),
        responseTime: `${Date.now() - startTime}ms`,
      };

      return response;
    } catch (error) {
      this.logger.error('Health check failed', error);

      return {
        service: 'scx-service',
        status: 'error',
        timestamp: new Date().toISOString(),
        database: { status: 'error', message: error.message },
        redis: { status: 'error', message: error.message },
        system: this.getSystemInfo(),
        responseTime: `${Date.now() - startTime}ms`,
      };
    }
  }

  private async checkDatabase(): Promise<{ status: string; message?: string }> {
    try {
      if (!this.dataSource.isInitialized) {
        return { status: 'error', message: 'Database not initialized' };
      }

      await this.dataSource.query('SELECT 1');
      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return { status: 'error', message: error.message };
    }
  }

  private async checkRedis(): Promise<{ status: string; message?: string }> {
    try {
      const testKey = 'health-check-test';
      await this.redisClient.set(testKey, 'test', { EX: 5 });
      const value = await this.redisClient.get(testKey);
      await this.redisClient.del(testKey);

      if (value === 'test') {
        return { status: 'ok' };
      }

      return { status: 'error', message: 'Redis read/write failed' };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return { status: 'error', message: error.message };
    }
  }

  private getSystemInfo(): {
    nodeVersion: string;
    platform: string;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }
}

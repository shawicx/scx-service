/*
 * @Author: shawicx d35f3153@proton.me
 * @Description:
 */
import redisModuleConfig from '@/config/redis.config';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { CacheService } from './cache.service';

// Redis客户端提供者
const REDIS_CLIENT = 'REDIS_CLIENT';

@Module({
  imports: [ConfigModule.forFeature(redisModuleConfig)],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: async (configService: ConfigService) => {
        const clientOptions = {
          socket: {
            host: configService.get('redis.host'),
            port: configService.get('redis.port'),
            connectTimeout: 10000, // 10秒连接超时
            commandTimeout: 5000, // 5秒命令超时
            reconnectStrategy: (retries: number) => {
              if (retries > 3) {
                console.error('Redis连接重试次数超过限制，停止重连');
                return new Error('Redis连接失败');
              }
              // 指数退避重连策略
              const delay = Math.min(Math.pow(2, retries) * 1000, 5000);
              console.log(`Redis连接失败，${delay}ms后重试...`);
              return delay;
            },
          },
          password: configService.get('redis.password') || undefined,
          database: configService.get('redis.db') || 0,
        };

        const client = createClient(clientOptions);

        // 错误监听
        client.on('error', (error) => {
          console.error('Redis客户端错误:', error);
        });

        client.on('connect', () => {
          console.log('Redis客户端连接成功');
        });

        client.on('disconnect', () => {
          console.log('Redis客户端断开连接');
        });

        client.on('reconnecting', () => {
          console.log('Redis客户端正在重连...');
        });

        // 连接Redis
        await client.connect();
        return client;
      },
      inject: [ConfigService],
    },
    CacheService,
  ],
  exports: [REDIS_CLIENT, CacheService],
})
export class CacheConfigModule {}

export { REDIS_CLIENT };

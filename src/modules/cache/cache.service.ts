import { Inject, Injectable, Logger } from '@nestjs/common';
import { RedisClientType } from 'redis';

// Redis客户端提供者标识
const REDIS_CLIENT = 'REDIS_CLIENT';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redisClient: RedisClientType,
  ) {}

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttlSeconds TTL（秒）
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

      if (ttlSeconds && ttlSeconds > 0) {
        await this.redisClient.setEx(key, ttlSeconds, stringValue);
        this.logger.debug(`缓存设置成功: ${key}, TTL: ${ttlSeconds}秒`);
      } else {
        await this.redisClient.set(key, stringValue);
        this.logger.debug(`缓存设置成功: ${key}, 无过期时间`);
      }
    } catch (error) {
      this.logger.error(`缓存设置失败: ${key}`, error);
      throw new Error(`Redis设置失败: ${error.message}`);
    }
  }

  /**
   * 设置缓存值（毫秒TTL）
   * @param key 缓存键
   * @param value 缓存值
   * @param ttlMilliseconds TTL（毫秒）
   */
  async setWithMilliseconds(key: string, value: any, ttlMilliseconds: number): Promise<void> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await this.redisClient.pSetEx(key, ttlMilliseconds, stringValue);
      this.logger.debug(`缓存设置成功: ${key}, TTL: ${ttlMilliseconds}ms`);
    } catch (error) {
      this.logger.error(`缓存设置失败: ${key}`, error);
      throw new Error(`Redis设置失败: ${error.message}`);
    }
  }

  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns 缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redisClient.get(key);
      if (value === null || value === undefined) {
        this.logger.debug(`缓存获取: ${key} = null`);
        return null;
      }

      // 尝试解析JSON，如果失败则返回原始字符串
      try {
        const parsed = JSON.parse(value as string);
        this.logger.debug(`缓存获取: ${key} = ${value} (parsed)`);
        return parsed as T;
      } catch {
        this.logger.debug(`缓存获取: ${key} = ${value} (string)`);
        return value as T;
      }
    } catch (error) {
      this.logger.error(`缓存获取失败: ${key}`, error);
      throw new Error(`Redis获取失败: ${error.message}`);
    }
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  async del(key: string): Promise<void> {
    try {
      const result = await this.redisClient.del(key);
      this.logger.debug(`缓存删除: ${key}, 影响数量: ${result}`);
    } catch (error) {
      this.logger.error(`缓存删除失败: ${key}`, error);
      throw new Error(`Redis删除失败: ${error.message}`);
    }
  }

  /**
   * 检查键是否存在
   * @param key 缓存键
   * @returns 是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redisClient.exists(key);
      this.logger.debug(`缓存存在检查: ${key} = ${result === 1}`);
      return result === 1;
    } catch (error) {
      this.logger.error(`缓存存在检查失败: ${key}`, error);
      throw new Error(`Redis存在检查失败: ${error.message}`);
    }
  }

  /**
   * 获取键的剩余生存时间（秒）
   * @param key 缓存键
   * @returns 剩余TTL（秒），-1表示没有过期时间，-2表示键不存在
   */
  async ttl(key: string): Promise<number> {
    try {
      const ttl = await this.redisClient.ttl(key);
      this.logger.debug(`缓存TTL查询: ${key} = ${ttl}秒`);
      return ttl;
    } catch (error) {
      this.logger.error(`缓存TTL查询失败: ${key}`, error);
      throw new Error(`RedisTTL查询失败: ${error.message}`);
    }
  }

  /**
   * 清空所有缓存（危险操作！）
   */
  async flushAll(): Promise<void> {
    try {
      await this.redisClient.flushAll();
      this.logger.warn('❗ 所有Redis数据已被清空');
    } catch (error) {
      this.logger.error('Redis清空失败', error);
      throw new Error(`Redis清空失败: ${error.message}`);
    }
  }

  /**
   * 测试 Redis 连接
   * @returns 连接状态
   */
  async testConnection(): Promise<boolean> {
    try {
      const testKey = 'connection_test';
      const testValue = 'test_value';

      await this.redisClient.set(testKey, testValue);
      const retrievedValue = await this.redisClient.get(testKey);
      await this.redisClient.del(testKey);

      const isConnected = retrievedValue === testValue;
      this.logger.log(`Redis连接测试: ${isConnected ? '成功' : '失败'}`);

      return isConnected;
    } catch (error) {
      this.logger.error('Redis连接测试失败:', error);
      return false;
    }
  }

  /**
   * 获取Redis连接状态
   * @returns 连接信息
   */
  getConnectionInfo(): any {
    try {
      let status = 'closed';
      if (this.redisClient.isReady) {
        status = 'ready';
      } else if (this.redisClient.isOpen) {
        status = 'connecting';
      }

      return {
        isOpen: this.redisClient.isOpen,
        isReady: this.redisClient.isReady,
        status,
      };
    } catch (error) {
      this.logger.warn('无法获取Redis连接信息:', error);
      return { isOpen: false, isReady: false, status: 'unknown' };
    }
  }

  /**
   * 获取Redis客户端实例（供高级操作使用）
   * @returns Redis客户端
   */
  getRedisClient(): RedisClientType {
    return this.redisClient;
  }
}

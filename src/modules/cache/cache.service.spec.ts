import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let cacheService: CacheService;

  const mockRedisClient = {
    set: jest.fn(),
    setEx: jest.fn(),
    pSetEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    ttl: jest.fn(),
    flushAll: jest.fn(),
    isOpen: true,
    isReady: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('set', () => {
    it('should set cache value with TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttlSeconds = 60;

      mockRedisClient.setEx.mockResolvedValue('OK');

      await cacheService.set(key, value, ttlSeconds);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(key, ttlSeconds, value);
    });

    it('should set cache value without TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';

      mockRedisClient.set.mockResolvedValue('OK');

      await cacheService.set(key, value);

      expect(mockRedisClient.set).toHaveBeenCalledWith(key, value);
    });

    it('should set cache value with object and stringify it', async () => {
      const key = 'test-key';
      const value = { name: 'Test', age: 30 };
      const ttlSeconds = 60;

      mockRedisClient.setEx.mockResolvedValue('OK');

      await cacheService.set(key, value, ttlSeconds);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(key, ttlSeconds, JSON.stringify(value));
    });

    it('should throw error when set fails', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttlSeconds = 60;

      mockRedisClient.setEx.mockRejectedValue(new Error('Redis error'));

      await expect(cacheService.set(key, value, ttlSeconds)).rejects.toThrow(
        'Redis设置失败: Redis error',
      );
    });
  });

  describe('setWithMilliseconds', () => {
    it('should set cache value with milliseconds TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttlMilliseconds = 60000;

      mockRedisClient.pSetEx.mockResolvedValue('OK');

      await cacheService.setWithMilliseconds(key, value, ttlMilliseconds);

      expect(mockRedisClient.pSetEx).toHaveBeenCalledWith(key, ttlMilliseconds, value);
    });

    it('should throw error when setWithMilliseconds fails', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttlMilliseconds = 60000;

      mockRedisClient.pSetEx.mockRejectedValue(new Error('Redis error'));

      await expect(cacheService.setWithMilliseconds(key, value, ttlMilliseconds)).rejects.toThrow(
        'Redis设置失败: Redis error',
      );
    });
  });

  describe('get', () => {
    it('should get cache value successfully', async () => {
      const key = 'test-key';
      const value = 'test-value';

      mockRedisClient.get.mockResolvedValue(value);

      const result = await cacheService.get<string>(key);

      expect(result).toBe(value);
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
    });

    it('should get and parse JSON cache value', async () => {
      const key = 'test-key';
      const value = { name: 'Test', age: 30 };
      const stringValue = JSON.stringify(value);

      mockRedisClient.get.mockResolvedValue(stringValue);

      const result = await cacheService.get<{ name: string; age: number }>(key);

      expect(result).toEqual(value);
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
    });

    it('should return null when key does not exist', async () => {
      const key = 'nonexistent-key';

      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheService.get<string>(key);

      expect(result).toBeNull();
    });

    it('should return string value when JSON parsing fails', async () => {
      const key = 'test-key';
      const value = 'invalid-json-string';

      mockRedisClient.get.mockResolvedValue(value);

      const result = await cacheService.get<string>(key);

      expect(result).toBe(value);
    });

    it('should throw error when get fails', async () => {
      const key = 'test-key';

      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      await expect(cacheService.get<string>(key)).rejects.toThrow('Redis获取失败: Redis error');
    });
  });

  describe('del', () => {
    it('should delete cache value successfully', async () => {
      const key = 'test-key';

      mockRedisClient.del.mockResolvedValue(1);

      await cacheService.del(key);

      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
    });

    it('should throw error when delete fails', async () => {
      const key = 'test-key';

      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));

      await expect(cacheService.del(key)).rejects.toThrow('Redis删除失败: Redis error');
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      const key = 'test-key';

      mockRedisClient.exists.mockResolvedValue(1);

      const result = await cacheService.exists(key);

      expect(result).toBe(true);
      expect(mockRedisClient.exists).toHaveBeenCalledWith(key);
    });

    it('should return false when key does not exist', async () => {
      const key = 'nonexistent-key';

      mockRedisClient.exists.mockResolvedValue(0);

      const result = await cacheService.exists(key);

      expect(result).toBe(false);
    });

    it('should throw error when exists check fails', async () => {
      const key = 'test-key';

      mockRedisClient.exists.mockRejectedValue(new Error('Redis error'));

      await expect(cacheService.exists(key)).rejects.toThrow('Redis存在检查失败: Redis error');
    });
  });

  describe('ttl', () => {
    it('should return TTL value', async () => {
      const key = 'test-key';
      const ttl = 60;

      mockRedisClient.ttl.mockResolvedValue(ttl);

      const result = await cacheService.ttl(key);

      expect(result).toBe(ttl);
      expect(mockRedisClient.ttl).toHaveBeenCalledWith(key);
    });

    it('should throw error when TTL query fails', async () => {
      const key = 'test-key';

      mockRedisClient.ttl.mockRejectedValue(new Error('Redis error'));

      await expect(cacheService.ttl(key)).rejects.toThrow('RedisTTL查询失败: Redis error');
    });
  });

  describe('flushAll', () => {
    it('should flush all cache successfully', async () => {
      mockRedisClient.flushAll.mockResolvedValue('OK');

      await cacheService.flushAll();

      expect(mockRedisClient.flushAll).toHaveBeenCalled();
    });

    it('should throw error when flushAll fails', async () => {
      mockRedisClient.flushAll.mockRejectedValue(new Error('Redis error'));

      await expect(cacheService.flushAll()).rejects.toThrow('Redis清空失败: Redis error');
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      const testKey = 'connection_test';
      const testValue = 'test_value';

      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue(testValue);
      mockRedisClient.del.mockResolvedValue(1);

      const result = await cacheService.testConnection();

      expect(result).toBe(true);
      expect(mockRedisClient.set).toHaveBeenCalledWith(testKey, testValue);
      expect(mockRedisClient.get).toHaveBeenCalledWith(testKey);
      expect(mockRedisClient.del).toHaveBeenCalledWith(testKey);
    });

    it('should return false when connection test fails', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue('different_value');
      mockRedisClient.del.mockResolvedValue(1);

      const result = await cacheService.testConnection();

      expect(result).toBe(false);
    });

    it('should return false when connection test throws error', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('getConnectionInfo', () => {
    it('should return connection info when client is ready', () => {
      // Mock redis client properties
      Object.defineProperty(mockRedisClient, 'isOpen', { value: true, writable: true });
      Object.defineProperty(mockRedisClient, 'isReady', { value: true, writable: true });

      const result = cacheService.getConnectionInfo();

      expect(result).toEqual({
        isOpen: true,
        isReady: true,
        status: 'ready',
      });
    });

    it('should return connection info when client is connecting', () => {
      // Mock redis client properties
      Object.defineProperty(mockRedisClient, 'isOpen', { value: true, writable: true });
      Object.defineProperty(mockRedisClient, 'isReady', { value: false, writable: true });

      const result = cacheService.getConnectionInfo();

      expect(result).toEqual({
        isOpen: true,
        isReady: false,
        status: 'connecting',
      });
    });

    it('should return connection info when client is closed', () => {
      // Mock redis client properties
      Object.defineProperty(mockRedisClient, 'isOpen', { value: false, writable: true });
      Object.defineProperty(mockRedisClient, 'isReady', { value: false, writable: true });

      const result = cacheService.getConnectionInfo();

      expect(result).toEqual({
        isOpen: false,
        isReady: false,
        status: 'closed',
      });
    });

    it('should return unknown status when error occurs', () => {
      // Mock redis client to throw error
      Object.defineProperty(mockRedisClient, 'isOpen', {
        get: () => {
          throw new Error('Access error');
        },
      });

      const result = cacheService.getConnectionInfo();

      expect(result).toEqual({
        isOpen: false,
        isReady: false,
        status: 'unknown',
      });
    });
  });

  describe('getRedisClient', () => {
    it('should return Redis client instance', () => {
      const result = cacheService.getRedisClient();

      expect(result).toBe(mockRedisClient);
    });
  });
});

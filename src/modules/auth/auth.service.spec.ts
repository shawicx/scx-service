import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import { CacheService } from '../cache/cache.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;

  const mockCacheService = {
    setWithMilliseconds: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should generate access token successfully', async () => {
      const userId = '11111111-1111-1111-1111-111111111111';
      const email = 'serve.suitor386@passinbox.com';

      mockCacheService.setWithMilliseconds.mockResolvedValue(undefined);

      const result = await authService.generateAccessToken(userId, email);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.split('.')).toHaveLength(2); // token.signature format
      expect(mockCacheService.setWithMilliseconds).toHaveBeenCalled();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token successfully', async () => {
      const userId = '11111111-1111-1111-1111-111111111111';
      const email = 'serve.suitor386@passinbox.com';

      mockCacheService.setWithMilliseconds.mockResolvedValue(undefined);

      const result = await authService.generateRefreshToken(userId, email);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.split('.')).toHaveLength(2); // token.signature format
      expect(mockCacheService.setWithMilliseconds).toHaveBeenCalled();
    });
  });

  describe('validateAccessToken', () => {
    it('should validate access token successfully', async () => {
      const userId = '11111111-1111-1111-1111-111111111111';
      const email = 'serve.suitor386@passinbox.com';

      // Generate a valid token for testing
      const payload = {
        userId,
        email,
        type: 'access',
        timestamp: Date.now(),
      };

      const token = Buffer.from(JSON.stringify(payload)).toString('base64');
      const signature = crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'default-secret')
        .update(token)
        .digest('hex');

      const accessToken = `${token}.${signature}`;

      mockCacheService.get.mockResolvedValue(accessToken);

      const result = await authService.validateAccessToken(accessToken);

      expect(result).toEqual({ userId, email });
    });

    it('should return null for invalid token format', async () => {
      const invalidToken = 'invalid.token.format';

      const result = await authService.validateAccessToken(invalidToken);

      expect(result).toBeNull();
    });

    it('should return null for invalid signature', async () => {
      const userId = '11111111-1111-1111-1111-111111111111';
      const email = 'serve.suitor386@passinbox.com';

      const payload = {
        userId,
        email,
        type: 'access',
        timestamp: Date.now(),
      };

      const token = Buffer.from(JSON.stringify(payload)).toString('base64');
      const invalidSignature = 'invalid-signature';
      const invalidToken = `${token}.${invalidSignature}`;

      mockCacheService.get.mockResolvedValue(invalidToken);

      const result = await authService.validateAccessToken(invalidToken);

      expect(result).toBeNull();
    });

    it('should return null for wrong token type', async () => {
      const userId = '11111111-1111-1111-1111-111111111111';
      const email = 'serve.suitor386@passinbox.com';

      // Generate a refresh token instead of access token
      const payload = {
        userId,
        email,
        type: 'refresh',
        timestamp: Date.now(),
      };

      const token = Buffer.from(JSON.stringify(payload)).toString('base64');
      const signature = crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'default-secret')
        .update(token)
        .digest('hex');

      const refreshToken = `${token}.${signature}`;

      mockCacheService.get.mockResolvedValue(refreshToken);

      const result = await authService.validateAccessToken(refreshToken);

      expect(result).toBeNull();
    });

    it('should return null when token not found in cache', async () => {
      const userId = '11111111-1111-1111-1111-111111111111';
      const email = 'serve.suitor386@passinbox.com';

      const payload = {
        userId,
        email,
        type: 'access',
        timestamp: Date.now(),
      };

      const token = Buffer.from(JSON.stringify(payload)).toString('base64');
      const signature = crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'default-secret')
        .update(token)
        .digest('hex');

      const accessToken = `${token}.${signature}`;

      mockCacheService.get.mockResolvedValue(null); // Token not in cache

      const result = await authService.validateAccessToken(accessToken);

      expect(result).toBeNull();
    });
  });

  describe('validateRefreshToken', () => {
    it('should validate refresh token successfully', async () => {
      const userId = '11111111-1111-1111-1111-111111111111';
      const email = 'serve.suitor386@passinbox.com';

      // Generate a valid refresh token for testing
      const payload = {
        userId,
        email,
        type: 'refresh',
        timestamp: Date.now(),
      };

      const token = Buffer.from(JSON.stringify(payload)).toString('base64');
      const signature = crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'default-secret')
        .update(token)
        .digest('hex');

      const refreshToken = `${token}.${signature}`;

      mockCacheService.get.mockResolvedValue(refreshToken);

      const result = await authService.validateRefreshToken(refreshToken);

      expect(result).toEqual({ userId, email });
    });

    it('should return null for invalid refresh token format', async () => {
      const invalidToken = 'invalid.token.format';

      const result = await authService.validateRefreshToken(invalidToken);

      expect(result).toBeNull();
    });

    it('should return null for wrong refresh token type', async () => {
      const userId = '11111111-1111-1111-1111-111111111111';
      const email = 'serve.suitor386@passinbox.com';

      // Generate an access token instead of refresh token
      const payload = {
        userId,
        email,
        type: 'access',
        timestamp: Date.now(),
      };

      const token = Buffer.from(JSON.stringify(payload)).toString('base64');
      const signature = crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'default-secret')
        .update(token)
        .digest('hex');

      const accessToken = `${token}.${signature}`;

      mockCacheService.get.mockResolvedValue(accessToken);

      const result = await authService.validateRefreshToken(accessToken);

      expect(result).toBeNull();
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const userId = '11111111-1111-1111-1111-111111111111';
      const email = 'serve.suitor386@passinbox.com';

      // Generate a valid refresh token for testing
      const payload = {
        userId,
        email,
        type: 'refresh',
        timestamp: Date.now(),
      };

      const token = Buffer.from(JSON.stringify(payload)).toString('base64');
      const signature = crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'default-secret')
        .update(token)
        .digest('hex');

      const refreshToken = `${token}.${signature}`;

      mockCacheService.get.mockResolvedValue(refreshToken);
      mockCacheService.setWithMilliseconds.mockResolvedValue(undefined);

      const result = await authService.refreshTokens(refreshToken);

      expect(result).toBeDefined();
      expect(result?.accessToken).toBeDefined();
      expect(result?.refreshToken).toBeDefined();
      expect(typeof result?.accessToken).toBe('string');
      expect(typeof result?.refreshToken).toBe('string');
    });

    it('should return null for invalid refresh token', async () => {
      const invalidToken = 'invalid.token';

      mockCacheService.get.mockResolvedValue(null);

      const result = await authService.refreshTokens(invalidToken);

      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const userId = '11111111-1111-1111-1111-111111111111';

      mockCacheService.del.mockResolvedValue(undefined);

      await authService.logout(userId);

      expect(mockCacheService.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate encryption key successfully', async () => {
      mockCacheService.setWithMilliseconds.mockResolvedValue(undefined);

      const result = await authService.generateEncryptionKey();

      expect(result).toBeDefined();
      expect(result.key).toBeDefined();
      expect(result.keyId).toBeDefined();
      expect(typeof result.key).toBe('string');
      expect(typeof result.keyId).toBe('string');
      expect(mockCacheService.setWithMilliseconds).toHaveBeenCalled();
    });
  });

  describe('getEncryptionKey', () => {
    it('should get encryption key successfully', async () => {
      const keyId = 'key123';
      const expectedKey = 'encryption-key';

      mockCacheService.get.mockResolvedValue(expectedKey);

      const result = await authService.getEncryptionKey(keyId);

      expect(result).toBe(expectedKey);
      expect(mockCacheService.get).toHaveBeenCalledWith(expect.stringContaining(keyId));
    });

    it('should return null when encryption key not found', async () => {
      const keyId = 'nonexistent-key';

      mockCacheService.get.mockResolvedValue(null);

      const result = await authService.getEncryptionKey(keyId);

      expect(result).toBeNull();
    });
  });
});

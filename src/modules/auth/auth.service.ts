import {
  accessTokenKey,
  encryptionKeyKey,
  refreshTokenKey,
} from '@/common/utils/cache-keys.constants';
import {
  ACCESS_TOKEN_TTL_MS,
  ENCRYPTION_KEY_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
} from '@/common/utils/ttl.constants';
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class AuthService {
  constructor(private readonly cacheService: CacheService) {}

  /**
   * 生成访问令牌
   * @param userId 用户ID
   * @param email 用户邮箱
   * @returns 访问令牌
   */
  async generateAccessToken(userId: string, email: string): Promise<string> {
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

    // 存储到Redis，有效期2小时
    await this.cacheService.setWithMilliseconds(
      accessTokenKey(userId),
      accessToken,
      ACCESS_TOKEN_TTL_MS,
    );

    return accessToken;
  }

  /**
   * 生成刷新令牌
   * @param userId 用户ID
   * @param email 用户邮箱
   * @returns 刷新令牌
   */
  async generateRefreshToken(userId: string, email: string): Promise<string> {
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

    // 存储到Redis，有效期7天
    await this.cacheService.setWithMilliseconds(
      refreshTokenKey(userId),
      refreshToken,
      REFRESH_TOKEN_TTL_MS,
    );

    return refreshToken;
  }

  /**
   * 验证访问令牌
   * @param token 访问令牌
   * @returns 用户信息或null
   */
  async validateAccessToken(token: string): Promise<{ userId: string; email: string } | null> {
    try {
      const [tokenPayload, signature] = token.split('.');
      if (!tokenPayload || !signature) {
        return null;
      }

      // 验证签名
      const expectedSignature = crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'default-secret')
        .update(tokenPayload)
        .digest('hex');

      if (signature !== expectedSignature) {
        return null;
      }

      // 解析payload
      const payload = JSON.parse(Buffer.from(tokenPayload, 'base64').toString());

      if (payload.type !== 'access') {
        return null;
      }

      // 检查Redis中是否存在该token
      const cachedToken = await this.cacheService.get(accessTokenKey(payload.userId));
      if (cachedToken !== token) {
        return null;
      }

      return { userId: payload.userId, email: payload.email };
    } catch {
      return null;
    }
  }

  /**
   * 验证刷新令牌
   * @param token 刷新令牌
   * @returns 用户信息或null
   */
  async validateRefreshToken(token: string): Promise<{ userId: string; email: string } | null> {
    try {
      const [tokenPayload, signature] = token.split('.');
      if (!tokenPayload || !signature) {
        return null;
      }

      // 验证签名
      const expectedSignature = crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'default-secret')
        .update(tokenPayload)
        .digest('hex');

      if (signature !== expectedSignature) {
        return null;
      }

      // 解析payload
      const payload = JSON.parse(Buffer.from(tokenPayload, 'base64').toString());

      if (payload.type !== 'refresh') {
        return null;
      }

      // 检查Redis中是否存在该token
      const cachedToken = await this.cacheService.get(refreshTokenKey(payload.userId));
      if (cachedToken !== token) {
        return null;
      }

      return { userId: payload.userId, email: payload.email };
    } catch {
      return null;
    }
  }

  /**
   * 刷新访问令牌
   * @param refreshToken 刷新令牌
   * @returns 新的访问令牌和刷新令牌
   */
  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    const userInfo = await this.validateRefreshToken(refreshToken);
    if (!userInfo) {
      return null;
    }

    // 生成新的tokens
    const newAccessToken = await this.generateAccessToken(userInfo.userId, userInfo.email);
    const newRefreshToken = await this.generateRefreshToken(userInfo.userId, userInfo.email);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * 登出（删除tokens）
   * @param userId 用户ID
   */
  async logout(userId: string): Promise<void> {
    await Promise.all([
      this.cacheService.del(accessTokenKey(userId)),
      this.cacheService.del(refreshTokenKey(userId)),
    ]);
  }

  /**
   * 生成加密密钥（用于前端密码加密）
   * @returns 临时加密密钥
   */
  async generateEncryptionKey(): Promise<{ key: string; keyId: string }> {
    const key = crypto.randomBytes(32).toString('hex');
    const keyId = crypto.randomUUID();

    // 密钥有效期5分钟
    await this.cacheService.setWithMilliseconds(
      encryptionKeyKey(keyId),
      key,
      ENCRYPTION_KEY_TTL_MS,
    );

    return { key, keyId };
  }

  /**
   * 获取加密密钥
   * @param keyId 密钥ID
   * @returns 加密密钥
   */
  async getEncryptionKey(keyId: string): Promise<string | null> {
    return await this.cacheService.get(encryptionKeyKey(keyId));
  }
}

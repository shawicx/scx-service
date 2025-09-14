import * as crypto from 'crypto';

export class CryptoUtil {
  private static readonly ALGORITHM = 'aes-256-ctr';
  private static readonly IV_LENGTH = 16;
  private static readonly KEY_LENGTH = 32;

  /**
   * 生成随机密钥
   * @returns 32字节的随机密钥（hex格式）
   */
  static generateKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString('hex');
  }

  /**
   * 加密文本（用于前端传输加密）
   * @param text 要加密的文本
   * @param key 加密密钥（hex格式）
   * @returns 加密后的文本（包含IV，用冒号分隔）
   */
  static encrypt(text: string, key: string): string {
    try {
      const keyBuffer = Buffer.from(key, 'hex');
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipheriv(this.ALGORITHM, keyBuffer, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // 格式: iv:encryptedText (都是hex格式)
      return `${iv.toString('hex')}:${encrypted}`;
    } catch {
      throw new Error('加密失败');
    }
  }

  /**
   * 解密文本（用于前端传输解密）
   * @param encryptedText 加密的文本（格式: iv:encryptedText）
   * @param key 解密密钥（hex格式）
   * @returns 解密后的明文
   */
  static decrypt(encryptedText: string, key: string): string {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 2) {
        throw new Error('加密数据格式错误');
      }

      const [ivHex, encrypted] = parts;
      const keyBuffer = Buffer.from(key, 'hex');
      const ivBuffer = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(this.ALGORITHM, keyBuffer, ivBuffer);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch {
      throw new Error('解密失败');
    }
  }

  /**
   * 验证加密数据完整性
   * @param encryptedText 加密文本
   * @returns 是否为有效的加密格式
   */
  static isValidEncryptedFormat(encryptedText: string): boolean {
    if (!encryptedText || typeof encryptedText !== 'string') {
      return false;
    }

    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      return false;
    }

    const [ivHex, encrypted] = parts;

    // 验证hex格式
    const hexPattern = /^[0-9a-fA-F]+$/;
    return (
      hexPattern.test(ivHex) && hexPattern.test(encrypted) && ivHex.length === this.IV_LENGTH * 2
    );
  }
}

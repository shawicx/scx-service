import { CryptoUtil } from '../src/common/utils/crypto.util';

// 测试加密解密功能
async function testCrypto() {
  try {
    // 生成密钥
    const key = CryptoUtil.generateKey();
    console.log('Generated key:', key);

    // 要加密的文本
    const plainText = 'TestPassword123!';
    console.log('Plain text:', plainText);

    // 加密
    const encrypted = CryptoUtil.encrypt(plainText, key);
    console.log('Encrypted:', encrypted);

    // 解密
    const decrypted = CryptoUtil.decrypt(encrypted, key);
    console.log('Decrypted:', decrypted);

    // 验证
    console.log('Decryption successful:', plainText === decrypted);

    // 测试提供的密码格式
    const providedPassword = '8639f4d2de4df804d7300f103c5bee43:b82522cfe7e2858519ef5de0f4';
    const isValidFormat = CryptoUtil.isValidEncryptedFormat(providedPassword);
    console.log('Provided password format is valid:', isValidFormat);

    if (!isValidFormat) {
      console.log(
        'The provided password format is invalid. It should be in the format: iv:encryptedText where both parts are hex strings.',
      );
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testCrypto();

import { CryptoUtil } from '../src/common/utils/crypto.util';

// 测试解密用户提供的密码
async function testDecrypt() {
  try {
    // 用户提供的参数
    const keyId = '0680c7fd-bba7-494e-a299-3ea9f3c97d94';
    const encryptedPassword = '8639f4d2de4df804d7300f103c5bee43:b82522cfe7e2858519ef5de0f4';

    console.log('Key ID:', keyId);
    console.log('Encrypted password:', encryptedPassword);

    // 验证格式
    const isValidFormat = CryptoUtil.isValidEncryptedFormat(encryptedPassword);
    console.log('Password format is valid:', isValidFormat);

    if (!isValidFormat) {
      console.log('Invalid password format');
      return;
    }

    // 分析密码组成部分
    const parts = encryptedPassword.split(':');
    const ivHex = parts[0];
    const encrypted = parts[1];

    console.log('IV (hex):', ivHex);
    console.log('IV length:', ivHex.length);
    console.log('Encrypted data (hex):', encrypted);
    console.log('Encrypted data length:', encrypted.length);

    // 检查是否为有效的十六进制字符串
    const hexPattern = /^[0-9a-fA-F]+$/;
    console.log('IV is hex:', hexPattern.test(ivHex));
    console.log('Encrypted data is hex:', hexPattern.test(encrypted));

    // 注意：我们无法解密用户提供的密码，因为我们没有对应的密钥
    // 在实际应用中，密钥会存储在Redis中，通过keyId获取
    console.log(
      '\nNote: We cannot decrypt the provided password without the corresponding encryption key.',
    );
    console.log(
      'In the actual application, the key would be stored in Redis and retrieved using the keyId.',
    );
  } catch (error) {
    console.error('Error:', error);
  }
}

testDecrypt();

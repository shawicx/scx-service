import { SystemException, SystemErrorCode } from './system.exception';

describe('SystemException', () => {
  describe('静态方法测试', () => {
    it('应该创建缺少token错误', () => {
      const exception = SystemException.missingToken();
      expect(exception.code).toBe(SystemErrorCode.MISSING_TOKEN);
      expect(exception.message).toBe('缺少访问令牌');
      expect(exception.name).toBe('SystemException');
    });

    it('应该创建参数错误', () => {
      const exception = SystemException.invalidParameter('自定义参数错误', { field: 'email' });
      expect(exception.code).toBe(SystemErrorCode.INVALID_PARAMETER);
      expect(exception.message).toBe('自定义参数错误');
      expect(exception.data).toEqual({ field: 'email' });
    });

    it('应该创建数据未找到错误', () => {
      const exception = SystemException.dataNotFound('用户不存在');
      expect(exception.code).toBe(SystemErrorCode.DATA_NOT_FOUND);
      expect(exception.message).toBe('用户不存在');
    });

    it('应该创建权限不足错误', () => {
      const exception = SystemException.insufficientPermission();
      expect(exception.code).toBe(SystemErrorCode.INSUFFICIENT_PERMISSION);
      expect(exception.message).toBe('权限不足');
    });

    it('应该创建邮箱已存在错误', () => {
      const exception = SystemException.emailExists();
      expect(exception.code).toBe(SystemErrorCode.EMAIL_EXISTS);
      expect(exception.message).toBe('该邮箱已被注册');
    });

    it('应该创建验证码无效错误', () => {
      const exception = SystemException.invalidVerificationCode();
      expect(exception.code).toBe(SystemErrorCode.INVALID_VERIFICATION_CODE);
      expect(exception.message).toBe('验证码无效或已过期');
    });

    it('应该创建登录凭据无效错误', () => {
      const exception = SystemException.invalidCredentials();
      expect(exception.code).toBe(SystemErrorCode.INVALID_CREDENTIALS);
      expect(exception.message).toBe('用户名或密码错误');
    });

    it('应该创建密钥过期错误', () => {
      const exception = SystemException.keyExpired();
      expect(exception.code).toBe(SystemErrorCode.KEY_EXPIRED);
      expect(exception.message).toBe('加密密钥已过期，请重新获取');
    });

    it('应该创建解密失败错误', () => {
      const exception = SystemException.decryptionFailed();
      expect(exception.code).toBe(SystemErrorCode.DECRYPTION_FAILED);
      expect(exception.message).toBe('数据解密失败');
    });

    it('应该创建资源已存在错误', () => {
      const exception = SystemException.resourceExists('角色名称已存在');
      expect(exception.code).toBe(SystemErrorCode.RESOURCE_EXISTS);
      expect(exception.message).toBe('角色名称已存在');
    });

    it('应该创建业务规则违反错误', () => {
      const exception = SystemException.businessRuleViolation('系统角色不可修改');
      expect(exception.code).toBe(SystemErrorCode.BUSINESS_RULE_VIOLATION);
      expect(exception.message).toBe('系统角色不可修改');
    });
  });

  describe('构造函数测试', () => {
    it('应该正确创建自定义异常', () => {
      const exception = new SystemException(SystemErrorCode.OPERATION_FAILED, '自定义操作失败', {
        details: 'some details',
      });

      expect(exception.code).toBe(SystemErrorCode.OPERATION_FAILED);
      expect(exception.message).toBe('自定义操作失败');
      expect(exception.data).toEqual({ details: 'some details' });
      expect(exception.name).toBe('SystemException');
    });

    it('应该正确处理没有data的情况', () => {
      const exception = new SystemException(SystemErrorCode.SERVICE_UNAVAILABLE, '服务不可用');

      expect(exception.code).toBe(SystemErrorCode.SERVICE_UNAVAILABLE);
      expect(exception.message).toBe('服务不可用');
      expect(exception.data).toBeUndefined();
    });
  });

  describe('错误码枚举测试', () => {
    it('应该包含所有预定义的错误码', () => {
      expect(SystemErrorCode.MISSING_TOKEN).toBe(9000);
      expect(SystemErrorCode.INVALID_PARAMETER).toBe(9001);
      expect(SystemErrorCode.DATA_NOT_FOUND).toBe(9002);
      expect(SystemErrorCode.INSUFFICIENT_PERMISSION).toBe(9003);
      expect(SystemErrorCode.EMAIL_EXISTS).toBe(9004);
      expect(SystemErrorCode.INVALID_VERIFICATION_CODE).toBe(9005);
      expect(SystemErrorCode.INVALID_CREDENTIALS).toBe(9006);
      expect(SystemErrorCode.RESOURCE_EXISTS).toBe(9007);
      expect(SystemErrorCode.OPERATION_FAILED).toBe(9008);
      expect(SystemErrorCode.SERVICE_UNAVAILABLE).toBe(9009);
      expect(SystemErrorCode.KEY_EXPIRED).toBe(9010);
      expect(SystemErrorCode.DECRYPTION_FAILED).toBe(9011);
      expect(SystemErrorCode.BUSINESS_RULE_VIOLATION).toBe(9012);
    });
  });
});

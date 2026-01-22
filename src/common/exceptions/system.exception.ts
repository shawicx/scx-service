/**
 * 系统业务错误码枚举
 */
export enum SystemErrorCode {
  /** 缺少token */
  MISSING_TOKEN = 9000,
  /** 请求参数错误 */
  INVALID_PARAMETER = 9001,
  /** 数据未找到 */
  DATA_NOT_FOUND = 9002,
  /** 权限不足 */
  INSUFFICIENT_PERMISSION = 9003,
  /** 邮箱已存在 */
  EMAIL_EXISTS = 9004,
  /** 验证码无效 */
  INVALID_VERIFICATION_CODE = 9005,
  /** 登录凭据无效 */
  INVALID_CREDENTIALS = 9006,
  /** 资源已存在 */
  RESOURCE_EXISTS = 9007,
  /** 操作失败 */
  OPERATION_FAILED = 9008,
  /** 服务不可用 */
  SERVICE_UNAVAILABLE = 9009,
  /** 密钥过期 */
  KEY_EXPIRED = 9010,
  /** 解密失败 */
  DECRYPTION_FAILED = 9011,
  /** 业务规则限制 */
  BUSINESS_RULE_VIOLATION = 9012,
  /** 账户已禁用 */
  ACCOUNT_DISABLED = 9013,
}

/**
 * 系统业务异常类
 */
export class SystemException extends Error {
  /**
   * 缺少token错误
   */
  static missingToken(message = '缺少访问令牌'): SystemException {
    return new SystemException(SystemErrorCode.MISSING_TOKEN, message);
  }

  /**
   * 请求参数错误
   */
  static invalidParameter(message = '请求参数错误', data?: any): SystemException {
    return new SystemException(SystemErrorCode.INVALID_PARAMETER, message, data);
  }

  /**
   * 数据未找到错误
   */
  static dataNotFound(message = '数据未找到', data?: any): SystemException {
    return new SystemException(SystemErrorCode.DATA_NOT_FOUND, message, data);
  }

  /**
   * 权限不足错误
   */
  static insufficientPermission(message = '权限不足'): SystemException {
    return new SystemException(SystemErrorCode.INSUFFICIENT_PERMISSION, message);
  }

  /**
   * 邮箱已存在错误
   */
  static emailExists(message = '该邮箱已被注册'): SystemException {
    return new SystemException(SystemErrorCode.EMAIL_EXISTS, message);
  }

  /**
   * 验证码无效错误
   */
  static invalidVerificationCode(message = '验证码无效或已过期'): SystemException {
    return new SystemException(SystemErrorCode.INVALID_VERIFICATION_CODE, message);
  }

  /**
   * 登录凭据无效错误
   */
  static invalidCredentials(message = '用户名或密码错误'): SystemException {
    return new SystemException(SystemErrorCode.INVALID_CREDENTIALS, message);
  }

  /**
   * 资源已存在错误
   */
  static resourceExists(message = '资源已存在'): SystemException {
    return new SystemException(SystemErrorCode.RESOURCE_EXISTS, message);
  }

  /**
   * 操作失败错误
   */
  static operationFailed(message = '操作失败', data?: any): SystemException {
    return new SystemException(SystemErrorCode.OPERATION_FAILED, message, data);
  }

  /**
   * 服务不可用错误
   */
  static serviceUnavailable(message = '服务暂时不可用'): SystemException {
    return new SystemException(SystemErrorCode.SERVICE_UNAVAILABLE, message);
  }

  /**
   * 密钥过期错误
   */
  static keyExpired(message = '加密密钥已过期，请重新获取'): SystemException {
    return new SystemException(SystemErrorCode.KEY_EXPIRED, message);
  }

  /**
   * 解密失败错误
   */
  static decryptionFailed(message = '数据解密失败'): SystemException {
    return new SystemException(SystemErrorCode.DECRYPTION_FAILED, message);
  }

  /**
   * 业务规则违反错误
   */
  static businessRuleViolation(message = '业务规则限制'): SystemException {
    return new SystemException(SystemErrorCode.BUSINESS_RULE_VIOLATION, message);
  }

  /**
   * 账户已禁用错误
   */
  static accountDisabled(message = '账户已被禁用'): SystemException {
    return new SystemException(SystemErrorCode.ACCOUNT_DISABLED, message);
  }

  readonly code: SystemErrorCode;
  readonly data?: any;

  constructor(code: SystemErrorCode, message: string, data?: any) {
    super(message);
    this.name = 'SystemException';
    this.code = code;
    this.data = data;
  }
}

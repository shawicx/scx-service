import { AiErrorCode } from './ai-error-code.enum';
import { SystemException } from '@/common/exceptions/system.exception';

export class AiException extends SystemException {
  static apiKeyNotConfigured(provider: string): AiException {
    return new AiException(
      AiErrorCode.API_KEY_NOT_CONFIGURED,
      `API密钥未配置，请在个人设置中添加${provider}的API密钥`,
      { provider },
    );
  }

  static invalidApiKey(provider: string): AiException {
    return new AiException(
      AiErrorCode.API_KEY_INVALID,
      `${provider}的API密钥格式无效，请检查后重试`,
      { provider },
    );
  }

  static providerNotAvailable(provider: string): AiException {
    return new AiException(AiErrorCode.PROVIDER_NOT_AVAILABLE, `${provider}平台暂时不可用`, {
      provider,
    });
  }

  static requestTimeout(provider: string): AiException {
    return new AiException(AiErrorCode.REQUEST_TIMEOUT, `请求${provider}超时，请稍后重试`, {
      provider,
    });
  }

  static rateLimitExceeded(provider: string): AiException {
    return new AiException(AiErrorCode.RATE_LIMIT_EXCEEDED, `请求${provider}频率过高，请稍后重试`, {
      provider,
    });
  }

  static authenticationFailed(provider: string): AiException {
    return new AiException(AiErrorCode.AUTHENTICATION_FAILED, `${provider}的API密钥认证失败`, {
      provider,
    });
  }

  static insufficientQuota(provider: string): AiException {
    return new AiException(AiErrorCode.INSUFFICIENT_QUOTA, `${provider}的API额度不足`, {
      provider,
    });
  }

  static fromContentPolicyViolation(provider: string, message?: string): AiException {
    return new AiException(
      AiErrorCode.CONTENT_POLICY_VIOLATION,
      message || `${provider}平台拒绝了该请求(违反内容策略)`,
      { provider },
    );
  }

  static fromProviderError(provider: string, message: string): AiException {
    return new AiException(AiErrorCode.SERVICE_ERROR, `${provider}平台服务错误: ${message}`, {
      provider,
      originalMessage: message,
    });
  }

  constructor(code: AiErrorCode, message: string, data?: any) {
    super(code as any, message, data);
    this.name = 'AiException';
  }
}

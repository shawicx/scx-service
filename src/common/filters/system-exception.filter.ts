import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { SystemException, SystemErrorCode } from '../exceptions/system.exception';

/**
 * 系统业务异常过滤器
 */
@Catch(SystemException)
export class SystemExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SystemExceptionFilter.name);

  catch(exception: SystemException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // 根据业务错误码映射HTTP状态码
    const httpStatus = this.mapToHttpStatus(exception.code);

    // 构建统一的错误响应格式
    const errorResponse = {
      success: false,
      code: exception.code,
      message: exception.message,
      data: exception.data || null,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // 记录错误日志
    this.logger.error(
      `业务异常: ${exception.message}`,
      {
        code: exception.code,
        url: request.url,
        method: request.method,
        ip: request.ip,
        userAgent: request.get('User-Agent'),
        data: exception.data,
      },
      exception.stack,
    );

    response.status(httpStatus).json(errorResponse);
  }

  /**
   * 将业务错误码映射为HTTP状态码
   */
  private mapToHttpStatus(errorCode: SystemErrorCode): number {
    switch (errorCode) {
      case SystemErrorCode.MISSING_TOKEN:
        return HttpStatus.UNAUTHORIZED; // 401

      case SystemErrorCode.INVALID_PARAMETER:
      case SystemErrorCode.INVALID_VERIFICATION_CODE:
      case SystemErrorCode.DECRYPTION_FAILED:
      case SystemErrorCode.BUSINESS_RULE_VIOLATION:
        return HttpStatus.BAD_REQUEST; // 400

      case SystemErrorCode.DATA_NOT_FOUND:
        return HttpStatus.NOT_FOUND; // 404

      case SystemErrorCode.INSUFFICIENT_PERMISSION:
        return HttpStatus.FORBIDDEN; // 403

      case SystemErrorCode.EMAIL_EXISTS:
      case SystemErrorCode.RESOURCE_EXISTS:
        return HttpStatus.CONFLICT; // 409

      case SystemErrorCode.INVALID_CREDENTIALS:
        return HttpStatus.UNAUTHORIZED; // 401

      case SystemErrorCode.KEY_EXPIRED:
        return HttpStatus.UNAUTHORIZED; // 401

      case SystemErrorCode.SERVICE_UNAVAILABLE:
        return HttpStatus.SERVICE_UNAVAILABLE; // 503

      case SystemErrorCode.OPERATION_FAILED:
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR; // 500
    }
  }
}

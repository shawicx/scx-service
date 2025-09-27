import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { SystemException, SystemErrorCode } from '../exceptions/system.exception';

/**
 * 系统业务异常过滤器
 */
@Catch(SystemException)
export class SystemExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SystemExceptionFilter.name);

  catch(exception: SystemException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    // 根据业务错误码映射HTTP状态码
    const httpStatus = this.mapToHttpStatus(exception.code);

    // 构建统一的错误响应格式
    const errorResponse = {
      success: false,
      statusCode: exception.code, // 使用业务错误码作为statusCode
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
        ip: this.getClientIp(request),
        userAgent: request.headers['user-agent'],
        data: exception.data,
      },
      exception.stack,
    );

    response.status(httpStatus).send(errorResponse);
  }

  private getClientIp(request: FastifyRequest): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.ip ||
      '127.0.0.1'
    );
  }

  /**
   * 将业务错误码映射为HTTP状态码
   */
  private mapToHttpStatus(errorCode: SystemErrorCode): number {
    switch (errorCode) {
      case SystemErrorCode.BUSINESS_RULE_VIOLATION:
      case SystemErrorCode.OPERATION_FAILED:
        return HttpStatus.OK; // 200

      case SystemErrorCode.MISSING_TOKEN:
        return HttpStatus.UNAUTHORIZED; // 401

      case SystemErrorCode.INVALID_PARAMETER:
      case SystemErrorCode.INVALID_VERIFICATION_CODE:
      case SystemErrorCode.DECRYPTION_FAILED:
        return HttpStatus.BAD_REQUEST; // 400

      case SystemErrorCode.DATA_NOT_FOUND:
        return HttpStatus.NOT_FOUND; // 404

      case SystemErrorCode.INSUFFICIENT_PERMISSION:
        return HttpStatus.FORBIDDEN; // 403

      case SystemErrorCode.EMAIL_EXISTS:
      case SystemErrorCode.RESOURCE_EXISTS:
        return HttpStatus.CONFLICT; // 409

      case SystemErrorCode.INVALID_CREDENTIALS:
      case SystemErrorCode.KEY_EXPIRED:
        return HttpStatus.UNAUTHORIZED; // 401

      case SystemErrorCode.SERVICE_UNAVAILABLE:
        return HttpStatus.SERVICE_UNAVAILABLE; // 503

      default:
        return HttpStatus.INTERNAL_SERVER_ERROR; // 500
    }
  }
}

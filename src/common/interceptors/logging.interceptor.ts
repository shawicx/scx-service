import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { getClientIp } from '@/common/utils/ip.util';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const response = ctx.getResponse<FastifyReply>();

    const { method, url, headers, body, query } = request;
    const userAgent = headers['user-agent'] || '';
    const ip = getClientIp(request);
    const startTime = Date.now();

    // 记录请求信息到 access 日志
    const requestLog = {
      logType: 'access',
      direction: 'request',
      method,
      url,
      ip,
      userAgent,
      query,
      body: this.sanitizeBody(body),
      headers: this.sanitizeHeaders(headers),
    };

    this.logger.info(`${method} ${url} - ${ip}`, requestLog);

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;

        // 记录成功响应到 access 日志
        const responseLog = {
          logType: 'access',
          direction: 'response',
          method,
          url,
          statusCode,
          duration: `${duration}ms`,
          ip,
          responseSize: JSON.stringify(data).length,
        };

        this.logger.info(`${method} ${url} - ${statusCode} - ${duration}ms - ${ip}`, responseLog);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        // 记录错误响应到 error 日志
        this.logger.error(`${method} ${url} - ${statusCode} - ${duration}ms - ${ip}`, {
          context: 'LoggingInterceptor',
          method,
          url,
          statusCode,
          duration: `${duration}ms`,
          ip,
          error: error.message,
          stack: error.stack,
        });

        return throwError(() => error);
      }),
    );
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    // 隐藏敏感头信息
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '***';
      }
    });
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };
    // 隐藏敏感字段
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    });
    return sanitized;
  }
}

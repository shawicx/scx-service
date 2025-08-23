import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const response = ctx.getResponse<FastifyReply>();

    const { method, url, headers, body, query } = request;
    const userAgent = headers['user-agent'] || '';
    const ip = this.getClientIp(request);
    const startTime = Date.now();

    // 记录请求信息
    const requestLog = {
      timestamp: new Date().toISOString(),
      method,
      url,
      ip,
      userAgent,
      query,
      body: this.sanitizeBody(body),
      headers: this.sanitizeHeaders(headers),
    };

    this.logger.log(`📥 ${method} ${url} - ${ip}`, 'REQUEST');
    this.logger.debug('Request Details', JSON.stringify(requestLog));

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;

        // 记录成功响应
        const responseLog = {
          timestamp: new Date().toISOString(),
          method,
          url,
          statusCode,
          duration: `${duration}ms`,
          ip,
          responseSize: JSON.stringify(data).length,
        };

        this.logger.log(`📤 ${method} ${url} - ${statusCode} - ${duration}ms - ${ip}`, 'RESPONSE');
        this.logger.debug('Response Details', JSON.stringify(responseLog, null, 2));
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        // 记录错误响应
        const errorLog = {
          timestamp: new Date().toISOString(),
          method,
          url,
          statusCode,
          duration: `${duration}ms`,
          ip,
          error: error.message,
          stack: error.stack,
        };

        this.logger.error(`❌ ${method} ${url} - ${statusCode} - ${duration}ms - ${ip}`, 'ERROR');
        this.logger.debug('Error Details', errorLog);

        return throwError(() => error);
      }),
    );
  }

  private getClientIp(request: FastifyRequest): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.ip ||
      '127.0.0.1'
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

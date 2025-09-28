import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest();

    return next.handle().pipe(
      map((data) => {
        let message: string;
        let responseData: T;

        // 如果返回的数据包含 message 字段，提取 message 并处理 data
        if (data && typeof data === 'object' && 'message' in data) {
          message = data.message as string;

          // 如果只有 message 字段，data 设为 null
          if (Object.keys(data).length === 1) {
            responseData = null as T;
          } else {
            // 如果还有其他字段，移除 message 字段后作为 data
            const { message: _, ...rest } = data as any;
            responseData = Object.keys(rest).length > 0 ? (rest as T) : (null as T);
          }
        } else {
          // 使用默认消息
          message = this.getSuccessMessage(response.statusCode);
          responseData = data;
        }

        return {
          statusCode: response.statusCode,
          message,
          data: responseData,
          timestamp: new Date().toISOString(),
          path: request.url,
          success: true,
        };
      }),
    );
  }

  private getSuccessMessage(statusCode: number): string {
    switch (statusCode) {
      case 200:
      case 201:
        return '请求成功';
      case 202:
        return '请求已接受';
      case 204:
        return '操作成功';
      default:
        return '操作成功';
    }
  }
}

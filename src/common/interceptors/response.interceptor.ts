import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * @description 响应拦截器 - 统一成功响应格式
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // 如果返回数据已经包含 success 字段，则不处理（可能是自定义响应格式）
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // 为成功响应添加统一格式
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}

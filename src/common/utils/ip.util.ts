import { FastifyRequest } from 'fastify';

/**
 * @description 从请求中获取客户端真实 IP 地址
 */
export function getClientIp(request: FastifyRequest): string {
  return (
    (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (request.headers['x-real-ip'] as string) ||
    request.ip ||
    '127.0.0.1'
  );
}

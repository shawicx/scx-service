import { SetMetadata } from '@nestjs/common';

/**
 * 公共路由装饰器，标记不需要鉴权的路由
 */
export const Public = () => SetMetadata('isPublic', true);

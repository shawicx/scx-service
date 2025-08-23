import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app/app.module';
import { generateSwaggerDocument } from './swagger-document';

async function bootstrap() {
  // 创建应用实例
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false, // 禁用Fastify内置日志，使用Winston
    }),
  );

  // 获取配置服务
  const configService = app.get(ConfigService);
  const isProduction = configService.get<boolean>('app.isProduction', false);
  const port = configService.get<number>('app.port', 3000);

  // 使用Winston日志
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // 全局管道配置
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 全局异常过滤器
  const { HttpExceptionFilter } = await import('./common/filters/http-exception.filter');
  app.useGlobalFilters(new HttpExceptionFilter());

  // 全局拦截器
  const { LoggingInterceptor } = await import('./common/interceptors/logging.interceptor');
  const { TransformInterceptor } = await import('./common/interceptors/transform.interceptor');
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  // 启用CORS
  app.enableCors();

  // 设置全局前缀
  app.setGlobalPrefix('api');

  // 生成Swagger文档
  await generateSwaggerDocument(app, configService);

  // 启动应用
  await app.listen(port, '0.0.0.0');

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  logger.log(
    `应用已启动: ${await app.getUrl()} (${isProduction ? '生产' : '开发'}环境)`,
    'Bootstrap',
  );
}

bootstrap().catch(() => {
  process.exit(1);
});

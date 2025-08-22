import { ConfigService } from '@nestjs/config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as packageJson from '../package.json';

/**
 * 生成接口 swagger 文档
 * @param app NestJS应用实例
 * @param configService 配置服务
 */
export const generateSwaggerDocument = async (
  app: NestFastifyApplication,
  configService: ConfigService,
) => {
  // 检查是否启用Swagger
  const isSwaggerEnabled = configService.get<boolean>('swagger.enabled', true);
  if (!isSwaggerEnabled) {
    return;
  }

  const title = configService.get<string>('swagger.title', packageJson.name);
  const description = configService.get<string>('swagger.description', packageJson.description);
  const version = configService.get<string>('swagger.version', packageJson.version);
  const path = configService.get<string>('swagger.path', 'api/docs');

  const options = new DocumentBuilder()
    .setTitle(title)
    .setDescription(description)
    .setVersion(version)
    .addBearerAuth()
    .addTag('health', '健康检查相关接口')
    .addTag('auth', '认证相关接口')
    .addTag('users', '用户相关接口')
    .addServer('/', '开发环境')
    .build();

  const document = await SwaggerModule.createDocument(app, options);

  // 添加自定义CSS以改善UI体验
  const customOptions = {
    customSiteTitle: `${title} API 文档`,
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin-top: 20px }
    `,
    swaggerOptions: {
      persistAuthorization: true,
    },
  };

  SwaggerModule.setup(path, app, document, customOptions);
};

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as packageJson from '../package.json';

/**
 * 生成接口 swagger 文档
 * @param app
 */
export const generateSwaggerDocument = async (app: NestFastifyApplication) => {
  const options = new DocumentBuilder()
    .addBearerAuth()
    .setTitle(packageJson.name)
    .setDescription(packageJson.description)
    .setTermsOfService('http://127.0.0.1/swagger/')
    .setVersion(packageJson.version)
    .build();

  const docs = await SwaggerModule.createDocument(app, options);

  SwaggerModule.setup('/api/doc', app, docs);
};

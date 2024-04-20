import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { NestFactory } from '@nestjs/core';
import { generateSwaggerDocument } from './swagger-document';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      // logger: FastifyLogger,
      logger: true,
    }),
  );
  await generateSwaggerDocument(app);

  await app.listen(3000);
}

bootstrap();

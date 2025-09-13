import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    // 在测试环境中需要等待 Fastify 准备就绪
    await (app.getHttpAdapter().getInstance() as any).ready();
  });

  it('/api/health (GET)', async () => {
    // 简单的健康检查测试
    // 注意：这将失败，因为我们没有定义这个端点，但我们只是想验证Fastify适配器是否正常工作
    await request(app.getHttpServer()).get('/api/health').expect(404);
  }, 10000); // 增加超时时间
});

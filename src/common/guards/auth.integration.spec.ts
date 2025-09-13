import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../../app/app.module';

describe('Authentication Guard (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    // 在测试环境中需要等待 Fastify 准备就绪
    await (app.getHttpAdapter().getInstance() as any).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow access to public routes without token', async () => {
    await request(app.getHttpServer()).get('/api/roles').expect(200);
  }, 10000); // 增加超时时间

  it('should deny access to protected routes without token', async () => {
    await request(app.getHttpServer()).post('/api/users/assign-role?id=123').expect(401);
  }, 10000); // 增加超时时间

  it('should deny access to protected routes with invalid token', async () => {
    await request(app.getHttpServer())
      .post('/api/users/assign-role?id=123')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  }, 10000); // 增加超时时间
});

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';

describe('AI Module (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    // 设置全局验证管道
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    await (app.getHttpAdapter().getInstance() as any).ready();

    dataSource = app.get<DataSource>(DataSource);
    jwtService = app.get<JwtService>(JwtService);

    // 创建测试用户
    const userRepository = dataSource.getRepository(User);
    const testUser = userRepository.create({
      username: 'ai_test_user',
      password: 'hashed_password_123',
      email: 'ai_test@example.com',
      preferences: {
        ai: {
          defaultProvider: 'copilot',
          providers: {
            copilot: {
              apiKey: process.env.TEST_COPILOT_API_KEY || 'ghu_test_key_12345',
              enabled: true,
            },
          },
        },
      },
    });

    const savedUser = await userRepository.save(testUser);
    testUserId = savedUser.id;

    // 生成 JWT token
    authToken = jwtService.sign({
      sub: testUserId,
      username: testUser.username,
    });
  });

  afterAll(async () => {
    // 清理测试数据
    if (dataSource) {
      const userRepository = dataSource.getRepository(User);
      await userRepository.delete({ id: testUserId });
    }

    await app.close();
  });

  describe('AI Controller', () => {
    describe('GET /ai/providers', () => {
      it('should return list of available providers', async () => {
        const response = await request(app.getHttpServer())
          .get('/ai/providers')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data[0]).toHaveProperty('type');
        expect(response.body.data[0]).toHaveProperty('name');
      });

      it('should return 401 without authorization', async () => {
        await request(app.getHttpServer()).get('/ai/providers').expect(401);
      });
    });

    describe('POST /ai/test-connection', () => {
      it('should test provider connection', async () => {
        const response = await request(app.getHttpServer())
          .post('/ai/test-connection')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ provider: 'copilot' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('provider', 'copilot');
        expect(response.body.data).toHaveProperty('connected');
        expect(typeof response.body.data.connected).toBe('boolean');
      });

      it('should return 400 for invalid provider', async () => {
        await request(app.getHttpServer())
          .post('/ai/test-connection')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ provider: 'invalid_provider' })
          .expect(400);
      });

      it('should return 400 when provider is missing', async () => {
        await request(app.getHttpServer())
          .post('/ai/test-connection')
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(400);
      });
    });

    describe('POST /ai/completion', () => {
      it('should generate AI completion', async () => {
        const response = await request(app.getHttpServer())
          .post('/ai/completion')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            messages: [{ role: 'user', content: 'Say "Hello, world!"' }],
            options: {
              temperature: 0.7,
              maxTokens: 100,
            },
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('content');
        expect(response.body.data).toHaveProperty('model');
        expect(response.body.data).toHaveProperty('tokensUsed');
        expect(response.body.data).toHaveProperty('finishReason');
        expect(response.body.data).toHaveProperty('provider');
        expect(typeof response.body.data.content).toBe('string');
      });

      it('should use default provider when not specified', async () => {
        const response = await request(app.getHttpServer())
          .post('/ai/completion')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            messages: [{ role: 'user', content: 'Hi' }],
          })
          .expect(200);

        expect(response.body.data.provider).toBe('copilot');
      });

      it('should use explicit provider when specified', async () => {
        const response = await request(app.getHttpServer())
          .post('/ai/completion')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            provider: 'copilot',
            messages: [{ role: 'user', content: 'Hi' }],
          })
          .expect(200);

        expect(response.body.data.provider).toBe('copilot');
      });

      it('should return 400 for invalid request body', async () => {
        await request(app.getHttpServer())
          .post('/ai/completion')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            messages: 'invalid',
          })
          .expect(400);
      });

      it('should return 401 without authorization', async () => {
        await request(app.getHttpServer())
          .post('/ai/completion')
          .send({
            messages: [{ role: 'user', content: 'Hi' }],
          })
          .expect(401);
      });

      it('should return error when API key not configured', async () => {
        // Create a user without AI config
        const userRepository = dataSource.getRepository(User);
        const noKeyUser = userRepository.create({
          username: 'no_key_user',
          password: 'hashed_password',
          email: 'nokey@example.com',
        });
        const savedUser = await userRepository.save(noKeyUser);

        const token = jwtService.sign({
          sub: savedUser.id,
          username: noKeyUser.username,
        });

        await request(app.getHttpServer())
          .post('/ai/completion')
          .set('Authorization', `Bearer ${token}`)
          .send({
            messages: [{ role: 'user', content: 'Hi' }],
          })
          .expect(500); // AiException returns 9500 which maps to 500

        // Cleanup
        await userRepository.delete({ id: savedUser.id });
      });
    });

    describe('GET /ai/requests', () => {
      it('should return request history with pagination', async () => {
        const response = await request(app.getHttpServer())
          .get('/ai/requests')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ page: 1, limit: 10 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('items');
        expect(response.body.data).toHaveProperty('total');
        expect(response.body.data).toHaveProperty('page', 1);
        expect(response.body.data).toHaveProperty('limit', 10);
        expect(Array.isArray(response.body.data.items)).toBe(true);
        expect(typeof response.body.data.total).toBe('number');
      });

      it('should use default pagination values', async () => {
        const response = await request(app.getHttpServer())
          .get('/ai/requests')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.page).toBe(1);
        expect(response.body.data.limit).toBe(20);
      });

      it('should return 401 without authorization', async () => {
        await request(app.getHttpServer()).get('/ai/requests').expect(401);
      });
    });

    describe('PUT /ai/config', () => {
      it('should update user AI config', async () => {
        const response = await request(app.getHttpServer())
          .put('/ai/config')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            defaultProvider: 'glm',
            providers: {
              glm: {
                apiKey: 'new_glm_key',
                enabled: true,
              },
            },
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('成功');
      });

      it('should return 400 for invalid provider', async () => {
        await request(app.getHttpServer())
          .put('/ai/config')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            defaultProvider: 'invalid_provider',
          })
          .expect(400);
      });
    });
  });

  describe('AI Stream Controller', () => {
    describe('POST /ai/stream/completion', () => {
      it('should return SSE stream', async () => {
        const response = await request(app.getHttpServer())
          .post('/ai/stream/completion')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            messages: [{ role: 'user', content: 'Say "Streaming test!"' }],
          })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/event-stream');
      });

      it('should return 401 without authorization', async () => {
        await request(app.getHttpServer())
          .post('/ai/stream/completion')
          .send({
            messages: [{ role: 'user', content: 'Hi' }],
          })
          .expect(401);
      });
    });
  });
});

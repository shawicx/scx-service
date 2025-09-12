import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../app/app.module';

describe('Authentication Guard (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow access to public routes without token', () => {
    return request(app.getHttpServer()).get('/api/roles').expect(200);
  });

  it('should deny access to protected routes without token', () => {
    return request(app.getHttpServer()).post('/api/users/assign-role?id=123').expect(401);
  });

  it('should deny access to protected routes with invalid token', () => {
    return request(app.getHttpServer())
      .post('/api/users/assign-role?id=123')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });
});

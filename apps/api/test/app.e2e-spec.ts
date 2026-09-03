import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.DATABASE_URL ??=
      'postgresql://planna:planna@localhost:5432/planna';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ data: { service: 'planna-api', status: 'ok' } });
  });

  it('/api/v1/me (GET) requires a bearer token', () => {
    return request(app.getHttpServer())
      .get('/api/v1/me')
      .expect(401)
      .expect({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Informe um token Bearer válido.',
        },
      });
  });

  afterEach(async () => {
    await app.close();
  });
});

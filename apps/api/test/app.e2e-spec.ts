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

  it('/api/v1/health (GET) returns one safe correlation id', async () => {
    const requestId = '123e4567-e89b-42d3-a456-426614174000';
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('x-request-id', requestId)
      .expect(200);

    expect(response.headers['x-request-id']).toBe(requestId);
    expect(response.body).toEqual({
      data: { service: 'planna-api', status: 'ok' },
      meta: { request_id: requestId },
    });
  });

  it('/api/v1/me (GET) requires a bearer token with correlation', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('x-request-id', 'invalid')
      .expect(401);

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f-]{27}$/,
    );
    expect(response.body).toEqual({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Informe um token Bearer válido.',
      },
      meta: { request_id: response.headers['x-request-id'] },
    });
  });

  afterEach(async () => {
    await app.close();
  });
});

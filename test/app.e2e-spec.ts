import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Health endpoints', () => {
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

  it('/health returns ok', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.status).toBe('ok');
        expect(body.data.service).toBe('sangapay-backend');
        expect(body.meta.requestId).toBeDefined();
      });
  });

  it('/ready returns ready', async () => {
    await request(app.getHttpServer())
      .get('/ready')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.status).toBe('ready');
        expect(body.data.checks.config.ok).toBe(true);
        expect(body.meta.requestId).toBeDefined();
      });
  });
});

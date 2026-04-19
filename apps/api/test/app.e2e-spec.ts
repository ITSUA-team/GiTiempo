import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

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

  it('GET /commons/health/live -> 200', async () => {
    const res = await request(app.getHttpServer()).get('/commons/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /commons/health/ready -> 200 + db connected', async () => {
    const res = await request(app.getHttpServer()).get('/commons/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('connected');
  });

  it('GET /commons/status -> environment + uptime', async () => {
    const res = await request(app.getHttpServer()).get('/commons/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('environment');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('propagates x-request-id response header', async () => {
    const res = await request(app.getHttpServer())
      .get('/commons/status')
      .set('x-request-id', 'fixed-test-id');
    expect(res.headers['x-request-id']).toBe('fixed-test-id');
  });

  // Reference to silence unused import warnings if needed elsewhere.
  void ValidationPipe;
});

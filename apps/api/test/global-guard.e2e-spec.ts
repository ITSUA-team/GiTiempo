import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Verifies the global `JwtAuthGuard` contract registered via `APP_GUARD`:
 *
 *  - Routes NOT marked `@SkipAuth()` require a bearer token.
 *  - Routes explicitly marked `@SkipAuth()` (login/refresh) or sitting in
 *    the `commons/health/*` infra surface remain reachable without auth.
 *
 * We intentionally do not register a dummy controller here. Verifying the
 * contract against a real protected route (`/users/me`) is stronger: it
 * proves the real application surface, not a test-only seam.
 */
describe('Global auth guard (e2e)', () => {
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

  it('protects GET /users/me without a bearer token (401)', async () => {
    const res = await request(app.getHttpServer()).get('/users/me');
    expect(res.status).toBe(401);
  });

  it('protects PATCH /users/me without a bearer token (401)', async () => {
    const res = await request(app.getHttpServer())
      .patch('/users/me')
      .send({ displayName: 'x' });
    expect(res.status).toBe(401);
  });

  it('rejects a malformed bearer token with 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
  });

  it('public /auth/login is reachable without auth (validation-only 400)', async () => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({});
    // 400 (validation) proves the route ran; 401 would mean the guard ran.
    expect(res.status).toBe(400);
  });

  it('public /commons/health/live is reachable without auth (200)', async () => {
    const res = await request(app.getHttpServer()).get('/commons/health/live');
    expect(res.status).toBe(200);
  });
});

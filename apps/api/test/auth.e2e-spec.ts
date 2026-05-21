import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ADMIN_FAKE_TOKEN, bearer, login } from './helpers/auth';

/**
 * End-to-end coverage for `/auth/*`. All flows use the fake Firebase
 * provider wired in `AuthModule` when `NODE_ENV=test`, so no real
 * Firebase credentials are required.
 *
 * Pre-requisites:
 *   - pnpm --filter @gitiempo/api db:migrate
 *   - pnpm --filter @gitiempo/api db:seed
 */
describe('Auth (e2e)', () => {
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

  describe('POST /auth/login', () => {
    it('exchanges a valid fake Firebase token for a token pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ firebaseIdToken: ADMIN_FAKE_TOKEN });

      expect(res.status).toBe(200);
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
      expect(typeof res.body.accessTokenExpiresIn).toBe('number');
    });

    it('rejects an invalid Firebase token with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ firebaseIdToken: 'not-a-test-token' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates the refresh token; the old one is no longer usable', async () => {
      const first = await login(app);

      const rotated = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: first.refreshToken });

      expect(rotated.status).toBe(200);
      expect(rotated.body.refreshToken).not.toBe(first.refreshToken);

      // Using the new one again must succeed.
      const rotated2 = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: rotated.body.refreshToken });
      expect(rotated2.status).toBe(200);

      // Replaying the very first (now-revoked) refresh token → reuse
      // detection → family destroyed → 401, and the latest rotated
      // token from that family must also be invalidated.
      const replay = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: first.refreshToken });
      expect(replay.status).toBe(401);

      const afterReuse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: rotated2.body.refreshToken });
      expect(afterReuse.status).toBe(401);
    });

    it('rejects an unknown refresh token with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'not-a-real-token' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('requires a bearer token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: 'whatever' });
      expect(res.status).toBe(401);
    });

    it('invalidates the presented refresh token; other sessions survive', async () => {
      // Two independent sessions for the same user.
      const sessionA = await login(app);
      const sessionB = await login(app);

      const out = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', bearer(sessionA.accessToken))
        .send({ refreshToken: sessionA.refreshToken });
      expect(out.status).toBe(204);

      // Session A's refresh token no longer works.
      const refreshA = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: sessionA.refreshToken });
      expect(refreshA.status).toBe(401);

      // Session B is unaffected.
      const refreshB = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: sessionB.refreshToken });
      expect(refreshB.status).toBe(200);
    });
  });

  describe('POST /auth/refresh (concurrency)', () => {
    it('atomic rotation ensures only one refresh per token can succeed', async () => {
      const session = await login(app);

      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refreshToken: session.refreshToken }),
        request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refreshToken: session.refreshToken }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 401]);

      const winningRefreshToken =
        res1.status === 200 ? res1.body.refreshToken : res2.body.refreshToken;

      const winnerStillWorks = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: winningRefreshToken });
      expect(winnerStillWorks.status).toBe(200);

      const replay = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: session.refreshToken });
      expect(replay.status).toBe(401);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * End-to-end tests for the Users module against the local Postgres.
 *
 * Pre-requisites (outside the test):
 *   - migrations applied:  pnpm --filter @gitiempo/api db:migrate
 *   - seed loaded:         pnpm --filter @gitiempo/api db:seed
 *
 * The "current" user is the first seeded user by email asc, which is
 * `alice@gitiempo.dev` per `src/db/seed.ts`.
 */
describe('Users (e2e)', () => {
  let app: INestApplication;
  const SEED_FIRST_EMAIL = 'alice@gitiempo.dev';

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

  describe('GET /users/me', () => {
    it('returns the first seeded user, without firebaseUid', async () => {
      const res = await request(app.getHttpServer()).get('/users/me');
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(SEED_FIRST_EMAIL);
      expect(res.body).not.toHaveProperty('firebaseUid');
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('updatedAt');
    });
  });

  describe('PATCH /users/me', () => {
    it('updates displayName and returns the new shape', async () => {
      const next = `Alice e2e ${Date.now()}`;
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .send({ displayName: next });

      expect(res.status).toBe(200);
      expect(res.body.displayName).toBe(next);
      expect(res.body.email).toBe(SEED_FIRST_EMAIL);
      expect(res.body).not.toHaveProperty('firebaseUid');
    });

    it('rejects an empty body with 400 + custom error envelope', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.error).toBe('BadRequest');
      expect(res.body.message).toBe('Validation failed');
      expect(Array.isArray(res.body.details)).toBe(true);
    });

    it('rejects an invalid avatarUrl (not a url) with 400', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .send({ avatarUrl: 'not-a-url' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('BadRequest');
      expect(res.body.details?.[0]?.path).toEqual(['avatarUrl']);
    });
  });
});

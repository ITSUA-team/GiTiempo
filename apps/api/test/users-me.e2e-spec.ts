import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ADMIN_EMAIL, bearer, login } from './helpers/auth';
import { getSeededAdminWorkspace } from './helpers/seeded-workspace';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import { users, workspaceMembers } from '../src/db/schema';
import { eq } from 'drizzle-orm';

/**
 * End-to-end tests for `/users/me` behind the global `JwtAuthGuard`.
 *
 * Pre-requisites (outside the test):
 *   - migrations applied:  pnpm --filter @gitiempo/api db:migrate
 *   - seed loaded:         pnpm --filter @gitiempo/api db:seed
 *
 * The suite logs in through the test-only fake Firebase provider and then
 * exercises `/users/me` with a real bearer token. No real Firebase creds
 * are required.
 */
describe('Users (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const tokens = await login(app);
    accessToken = tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /users/me', () => {
    it('returns 401 without a bearer token', async () => {
      const res = await request(app.getHttpServer()).get('/users/me');
      expect(res.status).toBe(401);
    });

    it('returns the authenticated user, without firebaseUid', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', bearer(accessToken));
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(ADMIN_EMAIL);
      expect(res.body).not.toHaveProperty('firebaseUid');
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('updatedAt');
    });
  });

  describe('PATCH /users/me', () => {
    it('returns 401 without a bearer token', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .send({ displayName: 'nope' });
      expect(res.status).toBe(401);
    });

    it('updates displayName and returns the new shape', async () => {
      const next = `Admin e2e ${Date.now()}`;
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', bearer(accessToken))
        .send({ displayName: next });

      expect(res.status).toBe(200);
      expect(res.body.displayName).toBe(next);
      expect(res.body.email).toBe(ADMIN_EMAIL);
      expect(res.body).not.toHaveProperty('firebaseUid');
    });

    it('rejects an empty body with 400 + custom error envelope', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', bearer(accessToken))
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
        .set('Authorization', bearer(accessToken))
        .send({ avatarUrl: 'not-a-url' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('BadRequest');
      expect(res.body.details?.[0]?.path).toEqual(['avatarUrl']);
    });

    it('returns 401 when the access token references a deleted user', async () => {
      const db = app.get<DrizzleDB>(DRIZZLE);
      const uid = `deleted-user-${Date.now()}`;
      const email = `${uid}@example.com`;
      const { workspace } = await getSeededAdminWorkspace(db);
      const [user] = await db
        .insert(users)
        .values({
          firebaseUid: uid,
          email,
          displayName: 'Deleted User',
          avatarUrl: null,
        })
        .returning();
      await db.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: user!.id,
        role: 'member',
      });
      const deletedUserTokens = await login(
        app,
        `test:${uid}:${email}:Deleted User`,
      );

      const getRes = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', bearer(deletedUserTokens.accessToken));
      const userId = getRes.body.id as string;

      await db.delete(users).where(eq(users.id, userId));

      const patchRes = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', bearer(deletedUserTokens.accessToken))
        .send({ displayName: 'Ghost' });

      expect(patchRes.status).toBe(401);

      const getRes2 = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', bearer(deletedUserTokens.accessToken));
      expect(getRes2.status).toBe(401);
    });
  });
});

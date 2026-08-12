import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ADMIN_EMAIL, bearer, login } from './helpers/auth';
import { getSeededAdminWorkspace } from './helpers/seeded-workspace';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import { users, workspaceMembers } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { workspaces } from '../src/db/schema';

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
  let db: DrizzleDB;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<DrizzleDB>(DRIZZLE);

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

  describe('GET /users/me/workspaces', () => {
    it('returns 401 without a bearer token', async () => {
      const res = await request(app.getHttpServer()).get(
        '/users/me/workspaces',
      );
      expect(res.status).toBe(401);
    });

    it('lists accessible memberships and marks the access-token workspace as current', async () => {
      const { admin, workspace: currentWorkspace } =
        await getSeededAdminWorkspace(db);
      const [extraWorkspace] = await db
        .insert(workspaces)
        .values({ name: `Users Me Extra ${Date.now()}` })
        .returning();
      if (!extraWorkspace) throw new Error('Failed to create extra workspace');

      try {
        await db.insert(workspaceMembers).values({
          workspaceId: extraWorkspace.id,
          userId: admin.id,
          role: 'member',
        });

        const res = await request(app.getHttpServer())
          .get('/users/me/workspaces')
          .set('Authorization', bearer(accessToken));

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.items)).toBe(true);
        expect(res.body.items).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              workspaceId: currentWorkspace.id,
              workspaceName: currentWorkspace.name,
              role: 'admin',
              isCurrent: true,
            }),
            expect.objectContaining({
              workspaceId: extraWorkspace.id,
              workspaceName: extraWorkspace.name,
              role: 'member',
              isCurrent: false,
            }),
          ]),
        );
        expect(
          res.body.items.filter(
            (item: { isCurrent: boolean }) => item.isCurrent,
          ),
        ).toHaveLength(1);
      } finally {
        await db
          .delete(workspaceMembers)
          .where(eq(workspaceMembers.workspaceId, extraWorkspace.id));
        await db.delete(workspaces).where(eq(workspaces.id, extraWorkspace.id));
      }
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

  describe('avatar ownership', () => {
    async function provisionMember(label: string) {
      const uid = `${label}-${Date.now()}`;
      const email = `${uid}@example.com`;
      const { workspace } = await getSeededAdminWorkspace(db);
      const [user] = await db
        .insert(users)
        .values({ firebaseUid: uid, email, displayName: 'Avatar Member' })
        .returning();
      await db.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: user!.id,
        role: 'member',
      });

      return { email, uid, user: user! };
    }

    it('defaults a row inserted without an avatar source to provider ownership', async () => {
      const { user } = await provisionMember('avatar-default');

      expect(user.avatarSource).toBe('provider');
      expect(user.avatarUrl).toBeNull();
    });

    it('fills then refreshes a provider-owned avatar across logins', async () => {
      const { email, uid } = await provisionMember('avatar-refresh');
      const first = 'https://cdn.example.com/google-first.png';
      const second = 'https://cdn.example.com/google-second.png';

      const firstLogin = await login(
        app,
        `test:${uid}:${email}:Member:${first}`,
      );
      const afterFirst = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', bearer(firstLogin.accessToken));
      expect(afterFirst.body.avatarUrl).toBe(first);

      const secondLogin = await login(
        app,
        `test:${uid}:${email}:Member:${second}`,
      );
      const afterSecond = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', bearer(secondLogin.accessToken));
      expect(afterSecond.body.avatarUrl).toBe(second);
    });

    it('never replaces a user-owned avatar on a later login', async () => {
      const { email, uid } = await provisionMember('avatar-owned');
      const chosen = 'https://cdn.example.com/chosen-by-member.png';

      const firstLogin = await login(
        app,
        `test:${uid}:${email}:Member:https://cdn.example.com/google-first.png`,
      );
      const patched = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', bearer(firstLogin.accessToken))
        .send({ avatarUrl: chosen });
      expect(patched.status).toBe(200);
      expect(patched.body.avatarUrl).toBe(chosen);

      const secondLogin = await login(
        app,
        `test:${uid}:${email}:Member:https://cdn.example.com/google-second.png`,
      );
      const afterSecond = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', bearer(secondLogin.accessToken));
      expect(afterSecond.body.avatarUrl).toBe(chosen);
    });

    it('never leaves a user-owned avatar holding a provider url under concurrency', async () => {
      const { email, uid, user } = await provisionMember('avatar-race');
      const chosen = 'https://cdn.example.com/chosen-under-race.png';

      const firstLogin = await login(
        app,
        `test:${uid}:${email}:Member:https://cdn.example.com/google-first.png`,
      );

      const [, patched] = await Promise.all([
        login(
          app,
          `test:${uid}:${email}:Member:https://cdn.example.com/google-race.png`,
        ),
        request(app.getHttpServer())
          .patch('/users/me')
          .set('Authorization', bearer(firstLogin.accessToken))
          .send({ avatarUrl: chosen }),
      ]);
      expect(patched.status).toBe(200);

      const [stored] = await db
        .select({
          avatarSource: users.avatarSource,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      if (stored!.avatarSource === 'user') {
        expect(stored!.avatarUrl).toBe(chosen);
      } else {
        expect(stored!.avatarUrl).not.toBe(chosen);
      }

      const finalLogin = await login(
        app,
        `test:${uid}:${email}:Member:https://cdn.example.com/google-final.png`,
      );
      const afterFinal = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', bearer(finalLogin.accessToken));

      if (stored!.avatarSource === 'user') {
        expect(afterFinal.body.avatarUrl).toBe(chosen);
      }
    });

    it('lets a member hand the avatar back to the provider by clearing it', async () => {
      const { email, uid } = await provisionMember('avatar-reset');
      const google = 'https://cdn.example.com/google-reset.png';

      const firstLogin = await login(
        app,
        `test:${uid}:${email}:Member:${google}`,
      );
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', bearer(firstLogin.accessToken))
        .send({ avatarUrl: 'https://cdn.example.com/chosen.png' });
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', bearer(firstLogin.accessToken))
        .send({ avatarUrl: null });

      const secondLogin = await login(
        app,
        `test:${uid}:${email}:Member:${google}`,
      );
      const afterSecond = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', bearer(secondLogin.accessToken));
      expect(afterSecond.body.avatarUrl).toBe(google);
    });

    it('does not clear a stored avatar when a login carries no picture', async () => {
      const { email, uid } = await provisionMember('avatar-nopicture');
      const google = 'https://cdn.example.com/google-kept.png';

      await login(app, `test:${uid}:${email}:Member:${google}`);
      const withoutPicture = await login(app, `test:${uid}:${email}:Member`);
      const afterSecond = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', bearer(withoutPicture.accessToken));
      expect(afterSecond.body.avatarUrl).toBe(google);
    });
  });
});

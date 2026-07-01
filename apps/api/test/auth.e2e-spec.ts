import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ADMIN_FAKE_TOKEN, bearer, login } from './helpers/auth';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  refreshTokens,
  users,
  workspaceMembers,
  workspaceSettings,
  workspaces,
} from '../src/db/schema';
import { TokenService } from '../src/auth/services/token.service';
import { getSeededAdminWorkspace } from './helpers/seeded-workspace';

let registerTrackerCounter = 1;
let authTrackerCounter = 1;

function uniqueRegisterPayload() {
  const suffix =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  return {
    email: `owner.${suffix}@example.com`,
    fullName: 'Owner Person',
    ownerAcknowledgement: true,
    password: 'password123',
    workspaceName: `Acme Studio ${suffix}`,
  };
}

function postRegister(
  app: INestApplication,
  payload: ReturnType<typeof uniqueRegisterPayload>,
) {
  return request(app.getHttpServer())
    .post('/auth/register')
    .set('X-Forwarded-For', `10.41.0.${registerTrackerCounter++}`)
    .send(payload);
}

function postAuth(app: INestApplication, path: string) {
  return request(app.getHttpServer())
    .post(path)
    .set('X-Forwarded-For', `10.42.0.${authTrackerCounter++}`);
}

/** End-to-end coverage for `/auth/*` using the fake Firebase provider. */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let tokens: TokenService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.getHttpAdapter().getInstance().set('trust proxy', true);
    await app.init();
    db = app.get<DrizzleDB>(DRIZZLE);
    tokens = app.get(TokenService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('exchanges a valid fake Firebase token for a token pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', `10.42.0.${authTrackerCounter++}`)
        .send({ firebaseIdToken: ADMIN_FAKE_TOKEN });

      expect(res.status).toBe(200);
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
      expect(typeof res.body.accessTokenExpiresIn).toBe('number');
    });

    it('rejects an invalid Firebase token with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', `10.42.0.${authTrackerCounter++}`)
        .send({ firebaseIdToken: 'not-a-test-token' });

      expect(res.status).toBe(401);
    });

    it('remains membership-gated for valid Firebase identities without a workspace member row', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', `10.42.0.${authTrackerCounter++}`)
        .send({
          firebaseIdToken: 'test:outside-uid:outside@example.com:Outside',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/register', () => {
    it('registers the first owner and returns the normal token pair', async () => {
      const payload = uniqueRegisterPayload();
      const res = await postRegister(app, payload);

      expect(res.status).toBe(201);
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
      expect(typeof res.body.accessTokenExpiresIn).toBe('number');

      const claims = tokens.verifyAccess(res.body.accessToken as string);
      expect(claims.email).toBe(payload.email);
      expect(claims.role).toBe('admin');

      const me = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', bearer(res.body.accessToken as string));
      expect(me.status).toBe(200);
      expect(me.body).toMatchObject({
        displayName: payload.fullName,
        email: payload.email,
        role: 'admin',
      });

      const [userRow] = await db
        .select()
        .from(users)
        .where(eq(users.id, claims.sub))
        .limit(1);
      expect(userRow).toMatchObject({
        displayName: payload.fullName,
        email: payload.email,
        firebaseUid: claims.firebaseUid,
      });

      const [workspaceRow] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, claims.workspaceId))
        .limit(1);
      expect(workspaceRow?.name).toBe(payload.workspaceName);

      const [memberRow] = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.userId, claims.sub),
            eq(workspaceMembers.workspaceId, claims.workspaceId),
          ),
        )
        .limit(1);
      expect(memberRow?.role).toBe('admin');

      const [settingsRow] = await db
        .select()
        .from(workspaceSettings)
        .where(eq(workspaceSettings.workspaceId, claims.workspaceId))
        .limit(1);
      expect(settingsRow).toMatchObject({
        currency: 'USD',
        timeZone: 'UTC',
      });

      const [refreshRow] = await db
        .select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.userId, claims.sub),
            eq(
              refreshTokens.tokenHash,
              tokens.hashRefreshToken(res.body.refreshToken as string),
            ),
          ),
        )
        .limit(1);
      expect(refreshRow?.revokedAt).toBeNull();
      expect(refreshRow?.workspaceId).toBe(claims.workspaceId);

      const refreshed = await postAuth(app, '/auth/refresh').send({
        refreshToken: res.body.refreshToken,
      });
      expect(refreshed.status).toBe(200);

      const refreshedClaims = tokens.verifyAccess(
        refreshed.body.accessToken as string,
      );
      expect(refreshedClaims.sub).toBe(claims.sub);
      expect(refreshedClaims.workspaceId).toBe(claims.workspaceId);
      expect(refreshedClaims.role).toBe('admin');
    });

    it('maps duplicate email failures to the shared registration code', async () => {
      const res = await postRegister(app, {
        ...uniqueRegisterPayload(),
        email: 'admin@example.com',
      });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('duplicate_email');
    });

    it('treats trimmed and case-insensitive email duplicates as duplicate_email', async () => {
      const payload = uniqueRegisterPayload();

      const first = await postRegister(app, payload);
      expect(first.status).toBe(201);

      const duplicateEmail = `  ${payload.email.toUpperCase()}  `;
      const second = await postRegister(app, {
        ...uniqueRegisterPayload(),
        email: duplicateEmail,
      });

      expect(second.status).toBe(409);
      expect(second.body.code).toBe('duplicate_email');
    });

    it('treats normalized workspace-name duplicates as workspace_name_unavailable', async () => {
      const payload = uniqueRegisterPayload();
      const workspaceName = `Acme Registration ${Date.now().toString(36)}`;
      const first = await postRegister(app, {
        ...payload,
        workspaceName,
      });
      expect(first.status).toBe(201);

      const secondPayload = uniqueRegisterPayload();
      const second = await postRegister(app, {
        ...secondPayload,
        workspaceName: `  ${workspaceName.toUpperCase().replace(' ', '   ')}  `,
      });

      expect(second.status).toBe(409);
      expect(second.body.code).toBe('workspace_name_unavailable');

      const [secondUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(btrim(${users.email})) = ${secondPayload.email}`)
        .limit(1);
      expect(secondUser).toBeUndefined();
    });

    it('maps blank workspace names to invalid_workspace_name', async () => {
      const res = await postRegister(app, {
        ...uniqueRegisterPayload(),
        workspaceName: '   ',
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('invalid_workspace_name');
    });

    it('maps weak passwords to weak_password', async () => {
      const res = await postRegister(app, {
        ...uniqueRegisterPayload(),
        password: 'short',
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('weak_password');
    });
  });

  describe('POST /auth/switch-workspace', () => {
    it('switches to another workspace membership, scopes the new token, and preserves that scope on refresh', async () => {
      const suffix = randomUUID();
      const { admin } = await getSeededAdminWorkspace(db);
      const [workspace] = await db
        .insert(workspaces)
        .values({ name: `Switched Workspace ${suffix}` })
        .returning();
      if (!workspace) throw new Error('Failed to create switched workspace');

      try {
        await db.insert(workspaceMembers).values({
          workspaceId: workspace.id,
          userId: admin.id,
          role: 'member',
        });

        const initialTokens = await login(app);
        const switched = await request(app.getHttpServer())
          .post('/auth/switch-workspace')
          .set('Authorization', bearer(initialTokens.accessToken))
          .send({
            refreshToken: initialTokens.refreshToken,
            workspaceId: workspace.id,
          });

        expect(switched.status).toBe(200);
        expect(typeof switched.body.accessToken).toBe('string');
        expect(typeof switched.body.refreshToken).toBe('string');

        const switchedClaims = tokens.verifyAccess(
          switched.body.accessToken as string,
        );
        expect(switchedClaims.workspaceId).toBe(workspace.id);
        expect(switchedClaims.role).toBe('member');

        const switchedWorkspace = await request(app.getHttpServer())
          .get('/workspace')
          .set('Authorization', bearer(switched.body.accessToken as string));
        expect(switchedWorkspace.status).toBe(200);
        expect(switchedWorkspace.body.name).toBe(workspace.name);

        const adminOnlyMembers = await request(app.getHttpServer())
          .get('/members')
          .set('Authorization', bearer(switched.body.accessToken as string));
        expect(adminOnlyMembers.status).toBe(403);

        const [refreshRow] = await db
          .select()
          .from(refreshTokens)
          .where(
            and(
              eq(refreshTokens.userId, admin.id),
              eq(
                refreshTokens.tokenHash,
                tokens.hashRefreshToken(switched.body.refreshToken as string),
              ),
            ),
          )
          .limit(1);
        expect(refreshRow?.workspaceId).toBe(workspace.id);

        const oldRefresh = await postAuth(app, '/auth/refresh').send({
          refreshToken: initialTokens.refreshToken,
        });
        expect(oldRefresh.status).toBe(401);

        const refreshed = await postAuth(app, '/auth/refresh').send({
          refreshToken: switched.body.refreshToken,
        });
        expect(refreshed.status).toBe(200);

        const refreshedClaims = tokens.verifyAccess(
          refreshed.body.accessToken as string,
        );
        expect(refreshedClaims.workspaceId).toBe(workspace.id);
        expect(refreshedClaims.role).toBe('member');
      } finally {
        await db
          .delete(refreshTokens)
          .where(eq(refreshTokens.workspaceId, workspace.id));
        await db
          .delete(workspaceMembers)
          .where(eq(workspaceMembers.workspaceId, workspace.id));
        await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
      }
    });

    it('rejects invalid switch payloads before issuing new tokens', async () => {
      const initialTokens = await login(app);
      const { workspace } = await getSeededAdminWorkspace(db);

      const invalidWorkspaceId = await request(app.getHttpServer())
        .post('/auth/switch-workspace')
        .set('Authorization', bearer(initialTokens.accessToken))
        .send({
          refreshToken: initialTokens.refreshToken,
          workspaceId: 'not-a-uuid',
        });

      expect(invalidWorkspaceId.status).toBe(400);

      const missingRefreshToken = await request(app.getHttpServer())
        .post('/auth/switch-workspace')
        .set('Authorization', bearer(initialTokens.accessToken))
        .send({ workspaceId: workspace.id });

      expect(missingRefreshToken.status).toBe(400);

      const payloadWithUnknownKey = await request(app.getHttpServer())
        .post('/auth/switch-workspace')
        .set('Authorization', bearer(initialTokens.accessToken))
        .send({
          refreshToken: initialTokens.refreshToken,
          workspaceId: workspace.id,
          unexpected: true,
        });

      expect(payloadWithUnknownKey.status).toBe(400);
    });

    it('rejects target workspaces where the caller has no membership', async () => {
      const [workspace] = await db
        .insert(workspaces)
        .values({ name: `Forbidden Workspace ${randomUUID()}` })
        .returning();
      if (!workspace) throw new Error('Failed to create forbidden workspace');

      try {
        const initialTokens = await login(app);
        const switched = await request(app.getHttpServer())
          .post('/auth/switch-workspace')
          .set('Authorization', bearer(initialTokens.accessToken))
          .send({
            refreshToken: initialTokens.refreshToken,
            workspaceId: workspace.id,
          });

        expect(switched.status).toBe(403);
      } finally {
        await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
      }
    });

    it('rejects refresh when the selected workspace membership is removed after switching', async () => {
      const suffix = randomUUID();
      const { admin } = await getSeededAdminWorkspace(db);
      const [workspace] = await db
        .insert(workspaces)
        .values({ name: `Removed Membership Workspace ${suffix}` })
        .returning();
      if (!workspace) throw new Error('Failed to create switched workspace');

      try {
        await db.insert(workspaceMembers).values({
          workspaceId: workspace.id,
          userId: admin.id,
          role: 'member',
        });

        const initialTokens = await login(app);
        const switched = await request(app.getHttpServer())
          .post('/auth/switch-workspace')
          .set('Authorization', bearer(initialTokens.accessToken))
          .send({
            refreshToken: initialTokens.refreshToken,
            workspaceId: workspace.id,
          });

        expect(switched.status).toBe(200);

        await db
          .delete(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.workspaceId, workspace.id),
              eq(workspaceMembers.userId, admin.id),
            ),
          );

        const refreshed = await postAuth(app, '/auth/refresh').send({
          refreshToken: switched.body.refreshToken,
        });

        expect(refreshed.status).toBe(401);
      } finally {
        await db
          .delete(refreshTokens)
          .where(eq(refreshTokens.workspaceId, workspace.id));
        await db
          .delete(workspaceMembers)
          .where(eq(workspaceMembers.workspaceId, workspace.id));
        await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
      }
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates the refresh token; the old one is no longer usable', async () => {
      const first = await login(app);

      const rotated = await postAuth(app, '/auth/refresh').send({
        refreshToken: first.refreshToken,
      });

      expect(rotated.status).toBe(200);
      expect(rotated.body.refreshToken).not.toBe(first.refreshToken);

      // Using the new one again must succeed.
      const rotated2 = await postAuth(app, '/auth/refresh').send({
        refreshToken: rotated.body.refreshToken,
      });
      expect(rotated2.status).toBe(200);

      // Replaying the very first (now-revoked) refresh token → reuse
      // detection → family destroyed → 401, and the latest rotated
      // token from that family must also be invalidated.
      const replay = await postAuth(app, '/auth/refresh').send({
        refreshToken: first.refreshToken,
      });
      expect(replay.status).toBe(401);

      const afterReuse = await postAuth(app, '/auth/refresh').send({
        refreshToken: rotated2.body.refreshToken,
      });
      expect(afterReuse.status).toBe(401);
    });

    it('rejects an unknown refresh token with 401', async () => {
      const res = await postAuth(app, '/auth/refresh').send({
        refreshToken: 'not-a-real-token',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('requires a bearer token', async () => {
      const res = await postAuth(app, '/auth/logout').send({
        refreshToken: 'whatever',
      });
      expect(res.status).toBe(401);
    });

    it('invalidates the presented refresh token; other sessions survive', async () => {
      // Two independent sessions for the same user.
      const sessionA = await login(app);
      const sessionB = await login(app);

      const out = await postAuth(app, '/auth/logout')
        .set('Authorization', bearer(sessionA.accessToken))
        .send({
          refreshToken: sessionA.refreshToken,
        });
      expect(out.status).toBe(204);

      // Session A's refresh token no longer works.
      const refreshA = await postAuth(app, '/auth/refresh').send({
        refreshToken: sessionA.refreshToken,
      });
      expect(refreshA.status).toBe(401);

      // Session B is unaffected.
      const refreshB = await postAuth(app, '/auth/refresh').send({
        refreshToken: sessionB.refreshToken,
      });
      expect(refreshB.status).toBe(200);
    });
  });

  describe('POST /auth/refresh (concurrency)', () => {
    it('atomic rotation ensures only one refresh per token can succeed', async () => {
      const session = await login(app);

      const [res1, res2] = await Promise.all([
        postAuth(app, '/auth/refresh').send({
          refreshToken: session.refreshToken,
        }),
        postAuth(app, '/auth/refresh').send({
          refreshToken: session.refreshToken,
        }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 401]);

      const winningRefreshToken =
        res1.status === 200 ? res1.body.refreshToken : res2.body.refreshToken;

      const winnerStillWorks = await postAuth(app, '/auth/refresh').send({
        refreshToken: winningRefreshToken,
      });
      expect(winnerStillWorks.status).toBe(200);
    });
  });
});

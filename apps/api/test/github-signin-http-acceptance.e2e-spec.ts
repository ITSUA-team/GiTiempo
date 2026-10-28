import { createHash, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { eq, inArray, sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  firebaseIdentityReservations,
  githubAccountLinks,
  githubAuthorizationGenerations,
  githubOauthGrants,
  firebaseSubjectBindings,
  refreshTokens,
  users,
  workspaceMembers,
  workspaceSettings,
  workspaces,
} from '../src/db/schema';
import { GithubAccountOauthClientService } from '../src/github/services/github-account-oauth-client.service';
import { AuthService } from '../src/auth/services/auth.service';
import type { FakeFirebaseAdminService } from '../src/auth/services/firebase-admin.fake';
import { FIREBASE_ADMIN } from '../src/auth/services/firebase-admin.interface';

/** Controlled HTTP acceptance probe; GitHub transport is the only simulated boundary. */
describe('manual HTTP acceptance: GitHub sign-in handoff', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let oauth: GithubAccountOauthClientService;
  let auth: AuthService;
  let firebase: FakeFirebaseAdminService;
  let workspaceId: string;
  const userId = randomUUID();
  const uid = `signin-http-${userId}`;
  const email = `signin-http-${userId}@example.test`;
  const githubId = String(9_000_000_000_000 + Date.now());
  const extensionUserIds: string[] = [];
  const socialUserIds: string[] = [];
  const socialWorkspaceIds: string[] = [];

  function stubProvider(profileEmail = email, profileGithubId = githubId) {
    vi.spyOn(oauth, 'exchangeCode').mockResolvedValue({
      accessToken: 'simulated-oauth-access',
      refreshToken: 'simulated-oauth-refresh',
      tokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scopes: ['user:email', 'read:org', 'read:project'],
    });
    vi.spyOn(oauth, 'getCurrentUser').mockResolvedValue({
      githubUserId: profileGithubId,
      login: 'safe-signin-user',
      avatarUrl: null,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json([{ email: profileEmail, verified: true, primary: true }]),
      ),
    );
  }

  async function persistenceSnapshot(memberId: string) {
    const [link] = await db
      .select({
        id: githubAccountLinks.id,
        githubUserId: githubAccountLinks.githubUserId,
        updatedAt: githubAccountLinks.updatedAt,
      })
      .from(githubAccountLinks)
      .where(eq(githubAccountLinks.userId, memberId))
      .limit(1);
    const grants = link
      ? await db
          .select({
            id: githubOauthGrants.id,
            accessTokenEncrypted: githubOauthGrants.accessTokenEncrypted,
            refreshTokenEncrypted: githubOauthGrants.refreshTokenEncrypted,
            scopes: githubOauthGrants.scopes,
            tokenExpiresAt: githubOauthGrants.tokenExpiresAt,
            refreshTokenExpiresAt: githubOauthGrants.refreshTokenExpiresAt,
            updatedAt: githubOauthGrants.updatedAt,
          })
          .from(githubOauthGrants)
          .where(eq(githubOauthGrants.accountLinkId, link.id))
      : [];
    const [generation] = await db
      .select({ generation: githubAuthorizationGenerations.generation })
      .from(githubAuthorizationGenerations)
      .where(eq(githubAuthorizationGenerations.userId, memberId))
      .limit(1);
    const sessions = await db
      .select({ id: refreshTokens.id })
      .from(refreshTokens)
      .where(eq(refreshTokens.userId, memberId));
    return {
      link,
      grants: grants.map(
        ({
          id,
          accessTokenEncrypted,
          refreshTokenEncrypted,
          scopes,
          tokenExpiresAt,
          refreshTokenExpiresAt,
          updatedAt,
        }) => ({
          id,
          digest: createHash('sha256')
            .update(
              JSON.stringify({
                accessTokenEncrypted,
                refreshTokenEncrypted,
                scopes,
                tokenExpiresAt,
                refreshTokenExpiresAt,
              }),
            )
            .digest('hex'),
          updatedAt,
        }),
      ),
      generation,
      sessionIds: sessions.map(({ id }) => id),
    };
  }

  async function createExtensionMember(browser: 'chrome' | 'firefox') {
    const id = randomUUID();
    const extensionEmail = `signin-http-${browser}-${id}@example.test`;
    const extensionGithubId = String(
      9_100_000_000_000 + extensionUserIds.length,
    );
    await firebase.verifyIdToken(
      `test:signin-http-${browser}-${id}:${extensionEmail}:Sign-in ${browser}:provider=google.com`,
    );
    extensionUserIds.push(id);
    await db.insert(users).values({
      id,
      firebaseUid: `signin-http-${browser}-${id}`,
      email: extensionEmail,
      displayName: `Sign-in ${browser} acceptance user`,
    });
    await db
      .insert(workspaceMembers)
      .values({ workspaceId, userId: id, role: 'admin' });
    return { id, email: extensionEmail, githubId: extensionGithubId };
  }

  async function startExtensionHandoff(
    browser: 'chrome' | 'firefox',
    challenge: string,
  ) {
    const start = await request(app.getHttpServer())
      .get('/auth/github/start')
      .query({ app: 'extension', browser, challenge })
      .expect(302);
    const state = new URL(start.headers.location).searchParams.get('state')!;
    const callback = await request(app.getHttpServer())
      .get('/auth/github/callback')
      .query({ code: 'simulated-code', state })
      .expect(302);
    return new URL(callback.headers.location);
  }

  async function startAndCallback(appName: 'user' | 'admin') {
    const start = await request(app.getHttpServer())
      .get('/auth/github/start')
      .query({ app: appName, redirect: '/profile' })
      .expect(302);
    const githubUrl = new URL(start.headers.location);
    expect(githubUrl.searchParams.get('scope')).toBe(
      'user:email read:org read:project',
    );
    const state = githubUrl.searchParams.get('state')!;
    const cookie = String(start.headers['set-cookie']).split(';', 1)[0]!;
    const callback = await request(app.getHttpServer())
      .get('/auth/github/callback')
      .set('Cookie', cookie)
      .query({ code: 'simulated-code', state })
      .expect(302);
    return new URL(callback.headers.location);
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    await app.init();
    db = app.get(DRIZZLE);
    oauth = app.get(GithubAccountOauthClientService);
    auth = app.get(AuthService);
    firebase = app.get(FIREBASE_ADMIN);
    const config = app.get(ConfigService);
    config.set('GITHUB_SIGNIN_CLIENT_ID', 'simulated-client');
    config.set('GITHUB_SIGNIN_CLIENT_SECRET', 'simulated-secret');
    config.set('USER_SPA_URL', 'http://localhost:5173');
    config.set('ADMIN_SPA_URL', 'http://localhost:5174');
    config.set(
      'GITHUB_SIGNIN_EXTENSION_REDIRECT_URL',
      'https://chrome-extension.invalid/callback',
    );
    config.set(
      'GITHUB_SIGNIN_EXTENSION_FIREFOX_REDIRECT_URL',
      'https://firefox-extension.invalid/callback',
    );
    const [workspace] = await db
      .insert(workspaces)
      .values({ name: `Sign-in HTTP ${randomUUID()}` })
      .returning();
    workspaceId = workspace!.id;
    await firebase.verifyIdToken(
      `test:${uid}:${email}:Sign-in acceptance user:provider=google.com`,
    );
    await db.insert(users).values({
      id: userId,
      firebaseUid: uid,
      email,
      displayName: 'Sign-in acceptance user',
    });
    await db
      .insert(workspaceMembers)
      .values({ workspaceId, userId, role: 'admin' });
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await db
      .delete(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));
    for (const extensionUserId of extensionUserIds) {
      await db.delete(users).where(eq(users.id, extensionUserId));
    }
    if (socialUserIds.length > 0) {
      await db
        .delete(refreshTokens)
        .where(inArray(refreshTokens.userId, socialUserIds));
      await db
        .delete(workspaceMembers)
        .where(inArray(workspaceMembers.userId, socialUserIds));
    }
    if (socialUserIds.length > 0) {
      await db
        .delete(workspaceSettings)
        .where(inArray(workspaceSettings.workspaceId, socialWorkspaceIds));
      await db
        .delete(workspaces)
        .where(inArray(workspaces.id, socialWorkspaceIds));
    }
    if (socialWorkspaceIds.length > 0) {
      await db
        .delete(firebaseIdentityReservations)
        .where(inArray(firebaseIdentityReservations.userId, socialUserIds));
    }
    if (socialUserIds.length > 0) {
      await db.delete(users).where(inArray(users.id, socialUserIds));
    }
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    await app.close();
  });

  it('stages and redeems a browser-bound user handoff once, then persists identity atomically', async () => {
    stubProvider();
    const redirect = await startAndCallback('user');
    expect(redirect.origin + redirect.pathname).toBe(
      'http://localhost:5173/auth/github/callback',
    );
    const code = redirect.searchParams.get('code')!;
    expect(code).not.toContain('simulated-oauth-access');
    const session = await request(app.getHttpServer())
      .post('/auth/github/session')
      .send({ code })
      .expect(200);
    expect(typeof session.body.accessToken).toBe('string');
    expect(typeof session.body.refreshToken).toBe('string');
    expect(
      (
        await db
          .select()
          .from(githubAccountLinks)
          .where(eq(githubAccountLinks.userId, userId))
      )[0]?.githubUserId,
    ).toBe(githubId);
    await request(app.getHttpServer())
      .post('/auth/github/session')
      .send({ code })
      .expect(401);
  });

  it('returns the admin handoff to the configured admin destination without an account switch', async () => {
    vi.restoreAllMocks();
    stubProvider();
    const redirect = await startAndCallback('admin');
    expect(redirect.origin + redirect.pathname).toBe(
      'http://localhost:5174/auth/github/callback',
    );
    const session = await request(app.getHttpServer())
      .post('/auth/github/session')
      .send({ code: redirect.searchParams.get('code') })
      .expect(200);
    expect(typeof session.body.accessToken).toBe('string');
  });

  it('creates no durable new-account state at callback and atomically provisions it only on valid session proof', async () => {
    const candidateEmail = `github-candidate-${randomUUID()}@example.test`;
    const candidateGithubId = String(9_200_000_000_000 + Date.now());
    vi.restoreAllMocks();
    stubProvider(candidateEmail, candidateGithubId);

    const redirect = await startAndCallback('user');
    const code = redirect.searchParams.get('code')!;
    expect(
      await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, candidateEmail)),
    ).toEqual([]);

    const session = await request(app.getHttpServer())
      .post('/auth/github/session')
      .send({ code })
      .expect(200);
    expect(typeof session.body.accessToken).toBe('string');
    expect(typeof session.body.refreshToken).toBe('string');

    const [createdUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, candidateEmail));
    expect(createdUser).toBeDefined();
    socialUserIds.push(createdUser!.id);
    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, createdUser!.id));
    expect(membership).toMatchObject({ role: 'admin' });
    socialWorkspaceIds.push(membership!.workspaceId);
    const [createdWorkspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, membership!.workspaceId));
    expect(createdWorkspace?.name).toBe('Workspace');
    const [settings] = await db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, membership!.workspaceId));
    expect(settings).toMatchObject({ currency: 'USD', timeZone: 'UTC' });
    expect(
      (
        await db
          .select()
          .from(githubAccountLinks)
          .where(eq(githubAccountLinks.userId, createdUser!.id))
      )[0]?.githubUserId,
    ).toBe(candidateGithubId);

    await request(app.getHttpServer())
      .post('/auth/github/session')
      .send({ code })
      .expect(401);
  });

  it('does not let a verified GitHub email adopt an unverified manual-registration account', async () => {
    const email = `github-preclaim-${randomUUID()}@example.test`;
    const githubUserId = String(9_250_000_000_000 + Date.now());
    await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Forwarded-For', `10.44.${Date.now() % 250}.1`)
      .send({
        email,
        fullName: 'Manual Preclaim Victim',
        ownerAcknowledgement: true,
        password: 'password123',
        workspaceName: `Manual Preclaim ${randomUUID()}`,
      })
      .expect(201);
    const [manualUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    const [manualMembership] = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, manualUser!.id));
    if (!manualUser || !manualMembership) {
      throw new Error('Expected manual registration fixture');
    }

    try {
      vi.restoreAllMocks();
      stubProvider(email, githubUserId);
      const redirect = await startAndCallback('user');
      expect(redirect.origin + redirect.pathname).toBe(
        'http://localhost:5173/login',
      );
      expect(redirect.searchParams.get('githubError')).toBe(
        'identity_proof_required',
      );
      expect(redirect.searchParams.get('code')).toBeNull();
      expect(
        await db
          .select({ id: githubAccountLinks.id })
          .from(githubAccountLinks)
          .where(eq(githubAccountLinks.userId, manualUser.id)),
      ).toEqual([]);
      expect(
        await db
          .select({ userId: firebaseSubjectBindings.userId })
          .from(firebaseSubjectBindings)
          .where(eq(firebaseSubjectBindings.userId, manualUser.id)),
      ).toEqual([]);
      expect(
        await db
          .select({ id: workspaceMembers.id })
          .from(workspaceMembers)
          .where(eq(workspaceMembers.userId, manualUser.id)),
      ).toHaveLength(1);
      expect(
        await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email)),
      ).toEqual([{ id: manualUser.id }]);
    } finally {
      await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.userId, manualUser.id));
      await db
        .delete(workspaceMembers)
        .where(eq(workspaceMembers.userId, manualUser.id));
      await db
        .delete(workspaceSettings)
        .where(eq(workspaceSettings.workspaceId, manualMembership.workspaceId));
      await db
        .delete(workspaces)
        .where(eq(workspaces.id, manualMembership.workspaceId));
      await db.delete(users).where(eq(users.id, manualUser.id));
      await db
        .delete(firebaseIdentityReservations)
        .where(eq(firebaseIdentityReservations.normalizedEmail, email));
    }
  });

  it('concurrently resolves Google and GitHub sign-in for one verified email to one foundation', async () => {
    const sharedUid = `shared-social-${randomUUID()}`;
    const sharedEmail = `${sharedUid}@example.test`;
    const sharedGithubId = String(9_300_000_000_000 + Date.now());
    vi.restoreAllMocks();
    stubProvider(sharedEmail, sharedGithubId);
    const redirect = await startAndCallback('user');
    const code = redirect.searchParams.get('code')!;

    const [googleLogin, githubExchange] = await Promise.all([
      request(app.getHttpServer())
        .post('/auth/login')
        .send({
          firebaseIdToken: `test:${sharedUid}:${sharedEmail}:Shared Social:provider=google.com`,
        }),
      request(app.getHttpServer()).post('/auth/github/session').send({ code }),
    ]);
    expect(googleLogin.status).toBe(200);
    expect(githubExchange.status).toBe(200);

    const matchingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, sharedEmail));
    expect(matchingUsers).toHaveLength(1);
    const [sharedUser] = matchingUsers;
    socialUserIds.push(sharedUser!.id);
    const memberships = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, sharedUser!.id));
    expect(memberships).toHaveLength(1);
    expect(memberships[0]?.role).toBe('admin');
    socialWorkspaceIds.push(memberships[0]!.workspaceId);
    const aliases = await db
      .select()
      .from(firebaseSubjectBindings)
      .where(eq(firebaseSubjectBindings.userId, sharedUser!.id));
    expect(
      sharedUser!.firebaseUid === sharedUid ||
        aliases.some((alias) => alias.firebaseUid === sharedUid),
    ).toBe(true);
    expect(
      (
        await db
          .select()
          .from(githubAccountLinks)
          .where(eq(githubAccountLinks.userId, sharedUser!.id))
      )[0]?.githubUserId,
    ).toBe(sharedGithubId);
  });

  it('retains an exact GitHub Firebase reservation after a SQL rollback and adopts it on retry', async () => {
    const reservationEmail = `github-retry-${randomUUID()}@example.test`;
    await expect(
      auth.provisionSocialSession(
        {
          provider: 'github',
          email: reservationEmail,
          displayName: 'Retry Candidate',
        },
        async (tx) => {
          await tx.execute(sql.raw('SELECT 1 / 0'));
        },
      ),
    ).rejects.toThrow();

    const [reservation] = await db
      .select()
      .from(firebaseIdentityReservations)
      .where(
        eq(firebaseIdentityReservations.normalizedEmail, reservationEmail),
      );
    expect(reservation).toMatchObject({ state: 'confirmed' });
    expect(reservation?.firebaseUid).toBeTruthy();
    expect(
      await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, reservationEmail)),
    ).toEqual([]);

    const session = await auth.provisionSocialSession({
      provider: 'github',
      email: reservationEmail,
      displayName: 'Retry Candidate',
    });
    expect(typeof session.accessToken).toBe('string');
    const [adoptedUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, reservationEmail));
    expect(adoptedUser?.firebaseUid).toBe(reservation?.firebaseUid);
    socialUserIds.push(adoptedUser!.id);
    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, adoptedUser!.id));
    socialWorkspaceIds.push(membership!.workspaceId);
  });

  it.each([
    ['chrome', 'https://chrome-extension.invalid'],
    ['firefox', 'https://firefox-extension.invalid'],
  ] as const)(
    'uses the configured %s extension destination and leaves failed or replayed handoffs without session, link, or grant mutations',
    async (browser, destination) => {
      const member = await createExtensionMember(browser);
      const verifier = `acceptance-${browser}-verifier-0123456789-abcdef`;
      const challenge = createHash('sha256').update(verifier).digest('hex');

      vi.restoreAllMocks();
      stubProvider(member.email, member.githubId);
      const failedRedirect = await startExtensionHandoff(browser, challenge);
      expect(failedRedirect.origin + failedRedirect.pathname).toBe(
        `${destination}/callback`,
      );
      const failedCode = failedRedirect.searchParams.get('code')!;
      const beforeFailedExchange = await persistenceSnapshot(member.id);
      expect(beforeFailedExchange).toMatchObject({
        link: undefined,
        grants: [],
        sessionIds: [],
      });
      await request(app.getHttpServer())
        .post('/auth/github/session')
        .send({ code: failedCode })
        .expect(401);
      expect(await persistenceSnapshot(member.id)).toEqual(
        beforeFailedExchange,
      );
      await request(app.getHttpServer())
        .post('/auth/github/session')
        .send({ code: failedCode, verifier })
        .expect(401);
      expect(await persistenceSnapshot(member.id)).toEqual(
        beforeFailedExchange,
      );

      vi.restoreAllMocks();
      stubProvider(member.email, member.githubId);
      const successRedirect = await startExtensionHandoff(browser, challenge);
      expect(successRedirect.origin + successRedirect.pathname).toBe(
        `${destination}/callback`,
      );
      const code = successRedirect.searchParams.get('code')!;
      await request(app.getHttpServer())
        .post('/auth/github/session')
        .send({ code, verifier })
        .expect(200);
      const afterSuccessfulExchange = await persistenceSnapshot(member.id);
      expect(afterSuccessfulExchange.link?.githubUserId).toBe(member.githubId);
      expect(afterSuccessfulExchange.grants).toHaveLength(1);
      expect(afterSuccessfulExchange.sessionIds).toHaveLength(1);

      await request(app.getHttpServer())
        .post('/auth/github/session')
        .send({ code, verifier })
        .expect(401);
      expect(await persistenceSnapshot(member.id)).toEqual(
        afterSuccessfulExchange,
      );
    },
  );
});

import { createHash, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  githubAccountLinks,
  githubAuthorizationGenerations,
  githubOauthGrants,
  refreshTokens,
  users,
  workspaceMembers,
  workspaces,
} from '../src/db/schema';
import { GithubAccountOauthClientService } from '../src/github/services/github-account-oauth-client.service';

/** Controlled HTTP acceptance probe; GitHub transport is the only simulated boundary. */
describe('manual HTTP acceptance: GitHub sign-in handoff', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let oauth: GithubAccountOauthClientService;
  let workspaceId: string;
  const userId = randomUUID();
  const uid = `signin-http-${userId}`;
  const email = `signin-http-${userId}@example.test`;
  const githubId = String(9_000_000_000_000 + Date.now());
  const extensionUserIds: string[] = [];

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

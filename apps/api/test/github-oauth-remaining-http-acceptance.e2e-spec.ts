import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { AppModule } from '../src/app.module';
import { FIREBASE_ADMIN } from '../src/auth/services/firebase-admin.interface';
import type { FakeFirebaseAdminService } from '../src/auth/services/firebase-admin.fake';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  githubAccountLinks,
  githubConnections,
  githubOauthGrants,
  refreshTokens,
  tasks,
  timeEntries,
  users,
  workspaceGitHubInstallations,
  workspaceGitHubOrganizations,
  workspaceMembers,
  workspaces,
} from '../src/db/schema';
import { GithubAccountOauthClientService } from '../src/github/services/github-account-oauth-client.service';
import { GithubAccountService } from '../src/github/services/github-account.service';
import { GithubInstallationTokenProviderService } from '../src/github/services/github-installation-token-provider.service';
import { GithubOauthClientService } from '../src/github/services/github-oauth-client.service';
import { bearer, login } from './helpers/auth';

/**
 * Controlled HTTP acceptance probe. Nest routing, cookies, OAuth persistence and
 * authorization-generation checks are real; provider responses and App token
 * minting are simulated.
 */
describe('manual HTTP acceptance: remaining OAuth account-linking boundaries', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let accounts: GithubAccountService;
  let firebase: FakeFirebaseAdminService;
  let signInOAuth: GithubAccountOauthClientService;
  let appOAuth: GithubOauthClientService;
  let workspaceId: string;
  const createdUserIds: string[] = [];

  const oauthTokens = {
    accessToken: 'simulated-oauth-access',
    refreshToken: 'simulated-oauth-refresh',
    tokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    scopes: ['user:email', 'read:org', 'read:project'],
  };

  function cookieFrom(response: request.Response): string {
    return String(response.headers['set-cookie']).split(';', 1)[0]!;
  }

  async function createMember(label: string) {
    const id = randomUUID();
    const uid = `remaining-oauth-${label}-${id}`;
    const email = `${uid}@example.test`;
    createdUserIds.push(id);
    await db.insert(users).values({
      id,
      firebaseUid: uid,
      email,
      displayName: `Remaining OAuth ${label}`,
    });
    await db
      .insert(workspaceMembers)
      .values({ workspaceId, userId: id, role: 'admin' });
    firebase.setAlternativeProviders(uid, ['password']);
    const tokens = await login(app, `test:${uid}:${email}:Remaining OAuth`);
    return { id, uid, email, accessToken: tokens.accessToken };
  }

  async function saveOAuthIdentity(
    memberId: string,
    githubUserId: string,
  ): Promise<void> {
    const version = await accounts.getVersion(memberId);
    await accounts.saveOAuth(
      memberId,
      { githubUserId, login: `safe-${githubUserId}`, avatarUrl: null },
      oauthTokens,
      version.generation,
      new Date(),
    );
  }

  async function snapshot(memberId: string) {
    const [links, grants, appConnections, sessions, installations] =
      await Promise.all([
        db
          .select({ githubUserId: githubAccountLinks.githubUserId })
          .from(githubAccountLinks)
          .where(eq(githubAccountLinks.userId, memberId)),
        db
          .select({ id: githubOauthGrants.id })
          .from(githubOauthGrants)
          .innerJoin(
            githubAccountLinks,
            eq(githubOauthGrants.accountLinkId, githubAccountLinks.id),
          )
          .where(eq(githubAccountLinks.userId, memberId)),
        db
          .select({ id: githubConnections.id })
          .from(githubConnections)
          .where(eq(githubConnections.userId, memberId)),
        db
          .select({ id: refreshTokens.id })
          .from(refreshTokens)
          .where(eq(refreshTokens.userId, memberId)),
        db
          .select({ id: workspaceGitHubInstallations.id })
          .from(workspaceGitHubInstallations)
          .where(eq(workspaceGitHubInstallations.workspaceId, workspaceId)),
      ]);
    return { links, grants, appConnections, sessions, installations };
  }

  function stubSignInProvider(email: string, githubUserId: string): void {
    vi.spyOn(signInOAuth, 'exchangeCode').mockResolvedValue(oauthTokens);
    vi.spyOn(signInOAuth, 'getCurrentUser').mockResolvedValue({
      githubUserId,
      login: 'safe-signin-user',
      avatarUrl: null,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const parsed = new URL(url);
        if (parsed.pathname === '/user/emails') {
          return Response.json([{ email, verified: true, primary: true }]);
        }
        if (parsed.pathname.startsWith('/user/memberships/orgs/')) {
          return Response.json({
            state: 'active',
            organization: { login: 'PolicyOnly' },
          });
        }
        throw new Error(
          `Unexpected controlled GitHub request: ${parsed.pathname}`,
        );
      }),
    );
  }

  async function startAndCallback(cookie: string | undefined, state: string) {
    const callback = request(app.getHttpServer())
      .get('/auth/github/callback')
      .query({ code: 'simulated-code', state });
    if (cookie) callback.set('Cookie', cookie);
    return callback.expect(302);
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    await app.init();
    db = app.get(DRIZZLE);
    accounts = app.get(GithubAccountService);
    firebase = app.get(FIREBASE_ADMIN);
    signInOAuth = app.get(GithubAccountOauthClientService);
    appOAuth = app.get(GithubOauthClientService);
    const config = app.get(ConfigService);
    config.set('APP_URL', 'http://localhost:3000');
    config.set('GITHUB_SIGNIN_CLIENT_ID', 'simulated-client');
    config.set('GITHUB_SIGNIN_CLIENT_SECRET', 'simulated-secret');
    config.set('GITHUB_APP_CLIENT_ID', 'simulated-app-client');
    config.set('GITHUB_APP_CLIENT_SECRET', 'simulated-app-secret');
    config.set('GITHUB_APP_ID', '42');
    config.set('GITHUB_APP_SLUG', 'simulated-app');
    config.set('USER_SPA_URL', 'http://localhost:5173');
    config.set('ADMIN_SPA_URL', 'http://localhost:5174');
    const [workspace] = await db
      .insert(workspaces)
      .values({ name: `Remaining OAuth HTTP ${randomUUID()}` })
      .returning();
    workspaceId = workspace!.id;
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.spyOn(
      (
        accounts as unknown as {
          oauthClient: GithubAccountOauthClientService;
        }
      ).oauthClient,
      'revoke',
    ).mockResolvedValue(true);
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    for (const userId of createdUserIds) {
      await db.delete(users).where(eq(users.id, userId));
    }
    await app.close();
  });

  it('accepts an OAuth-only organization policy and starts App setup while keeping private browsing and tracking unavailable before installation', async () => {
    const member = await createMember('policy-only');
    await saveOAuthIdentity(member.id, `policy-only-${member.id}`);
    vi.spyOn(
      app.get(GithubInstallationTokenProviderService),
      'appToken',
    ).mockResolvedValue('simulated-app-jwt');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const parsed = new URL(url);
        if (parsed.pathname === '/user/orgs') {
          return Response.json([]);
        }
        if (parsed.pathname === '/user/memberships/orgs/PolicyOnly') {
          return Response.json({
            state: 'active',
            organization: { id: 1, login: 'PolicyOnly' },
          });
        }
        if (parsed.pathname === '/orgs/PolicyOnly/installation') {
          return new Response(null, { status: 404 });
        }
        throw new Error(
          `Unexpected controlled GitHub request: ${parsed.pathname}`,
        );
      }),
    );

    await request(app.getHttpServer())
      .post('/workspace/github/organizations')
      .set('Authorization', bearer(member.accessToken))
      .send({ organizationLogin: 'PolicyOnly' })
      .expect(201);
    expect(
      await db
        .select()
        .from(workspaceGitHubOrganizations)
        .where(eq(workspaceGitHubOrganizations.workspaceId, workspaceId)),
    ).toHaveLength(1);

    await request(app.getHttpServer())
      .get('/github/repos')
      .set('Authorization', bearer(member.accessToken))
      .query({ ownerType: 'organization', owner: 'PolicyOnly', limit: 10 })
      .expect(404);
    const setup = await request(app.getHttpServer())
      .post('/workspace/github/installations/setup')
      .set('Authorization', bearer(member.accessToken))
      .send({ organizationLogin: 'PolicyOnly' })
      .expect(201);
    expect(setup.body.state).toEqual(expect.any(String));
    expect(setup.body.existingInstallationId).toBeUndefined();
    const installUrl = new URL(setup.body.installationUrl);
    expect(installUrl.origin).toBe('https://github.com');
    expect(installUrl.pathname).toBe('/apps/simulated-app/installations/new');
    expect(installUrl.searchParams.get('state')).toBe(setup.body.state);
    const tracking = await request(app.getHttpServer())
      .post('/time-entries/timer/start-from-github')
      .set('Authorization', bearer(member.accessToken))
      .send({ githubRepo: 'PolicyOnly/private', issueNumber: 1 })
      .expect(409);
    expect(tracking.body.code).toBe('github_installation_required');
    expect(
      await db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)),
    ).toEqual([]);
    expect(
      await db
        .select()
        .from(timeEntries)
        .where(eq(timeEntries.workspaceId, workspaceId)),
    ).toEqual([]);
    expect((await snapshot(member.id)).installations).toEqual([]);
  });

  it('releases a fully disconnected identity and lets a newly initiated GitHub login recreate it for the existing member', async () => {
    const member = await createMember('relogin');
    const githubUserId = `relogin-${member.id}`;
    await saveOAuthIdentity(member.id, githubUserId);
    await request(app.getHttpServer())
      .delete('/github/connection')
      .set('Authorization', bearer(member.accessToken))
      .expect(200);
    expect((await snapshot(member.id)).links).toEqual([]);

    stubSignInProvider(member.email, githubUserId);
    const start = await request(app.getHttpServer())
      .get('/auth/github/start')
      .query({ app: 'user', redirect: '/profile' })
      .expect(302);
    const state = new URL(start.headers.location).searchParams.get('state')!;
    const callback = await startAndCallback(cookieFrom(start), state);
    const handoff = new URL(callback.headers.location).searchParams.get(
      'code',
    )!;
    await request(app.getHttpServer())
      .post('/auth/github/session')
      .send({ code: handoff })
      .expect(200);
    expect((await snapshot(member.id)).links).toEqual([{ githubUserId }]);
    expect((await snapshot(member.id)).grants).toHaveLength(1);
  });

  it('burns stale sign-in and authenticated callbacks after Disconnect and rejects replayed or wrong-purpose state without restoring credentials', async () => {
    const member = await createMember('stale');
    const githubUserId = `stale-${member.id}`;
    await saveOAuthIdentity(member.id, githubUserId);
    stubSignInProvider(member.email, githubUserId);

    const start = await request(app.getHttpServer())
      .get('/auth/github/start')
      .query({ app: 'user' })
      .expect(302);
    const state = new URL(start.headers.location).searchParams.get('state')!;
    const cookie = cookieFrom(start);
    const staged = await startAndCallback(cookie, state);
    const handoff = new URL(staged.headers.location).searchParams.get('code')!;

    await request(app.getHttpServer())
      .delete('/github/connection')
      .set('Authorization', bearer(member.accessToken))
      .expect(200);
    const afterDisconnect = await snapshot(member.id);
    expect(afterDisconnect).toMatchObject({
      links: [],
      grants: [],
      appConnections: [],
    });
    await request(app.getHttpServer())
      .post('/auth/github/session')
      .send({ code: handoff })
      .expect(401);
    expect(await snapshot(member.id)).toEqual(afterDisconnect);

    const replay = await startAndCallback(undefined, state);
    expect(
      new URL(replay.headers.location).searchParams.get('githubError'),
    ).toBe('state');
    expect(await snapshot(member.id)).toEqual(afterDisconnect);

    await saveOAuthIdentity(member.id, githubUserId);
    vi.spyOn(appOAuth, 'exchangeCode').mockResolvedValue({
      accessToken: 'simulated-app-access',
      refreshToken: 'simulated-app-refresh',
      tokenExpiresAt: new Date(Date.now() + 60_000),
      refreshTokenExpiresAt: new Date(Date.now() + 120_000),
    });
    vi.spyOn(appOAuth, 'getCurrentUser').mockResolvedValue({
      githubUserId,
      login: 'safe-app-user',
      avatarUrl: null,
    });
    const appAuthorization = await request(app.getHttpServer())
      .get('/github/auth-url')
      .set('Authorization', bearer(member.accessToken))
      .expect(200);
    const accountLinkState = new URL(
      appAuthorization.body.authorizationUrl,
    ).searchParams.get('state')!;
    await request(app.getHttpServer())
      .delete('/github/connection')
      .set('Authorization', bearer(member.accessToken))
      .expect(200);
    const beforeAuthenticatedCallback = await snapshot(member.id);
    const staleAuthenticatedCallback = await request(app.getHttpServer())
      .get('/github/callback')
      .query({ code: 'simulated-app-code', state: accountLinkState })
      .expect(302);
    expect(
      new URL(staleAuthenticatedCallback.headers.location).searchParams.get(
        'code',
      ),
    ).toBe('github_exchange_failed');
    expect(await snapshot(member.id)).toEqual(beforeAuthenticatedCallback);

    const wrongPurpose = await request(app.getHttpServer())
      .get('/auth/github/callback')
      .query({ code: 'simulated-code', state: accountLinkState })
      .expect(302);
    expect(
      new URL(wrongPurpose.headers.location).searchParams.get('githubError'),
    ).toBe('state');
    expect(await snapshot(member.id)).toEqual(beforeAuthenticatedCallback);
  });
});

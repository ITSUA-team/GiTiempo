import { createHash, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  githubAccountLinks,
  githubConnections,
  githubOauthGrants,
  refreshTokens,
  users,
  workspaceMembers,
  workspaces,
} from '../src/db/schema';
import { GithubAccountService } from '../src/github/services/github-account.service';
import { GithubConnectionsService } from '../src/github/services/github-connections.service';
import { GithubAccountOauthClientService } from '../src/github/services/github-account-oauth-client.service';
import { bearer, login } from './helpers/auth';

describe('manual HTTP acceptance: partial OAuth permission and App isolation', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let accounts: GithubAccountService;
  let connections: GithubConnectionsService;
  let accountOauth: GithubAccountOauthClientService;
  const members: Array<{
    id: string;
    uid: string;
    email: string;
    workspaceId: string;
  }> = [];
  const fetchMock =
    vi.fn<(url: string | URL, init?: RequestInit) => Promise<Response>>();
  const response = (body: unknown, status = 200) =>
    Response.json(body, { status });
  const provider = (fn: (url: URL, init?: RequestInit) => Response) => {
    fetchMock.mockImplementation(async (url, init) => fn(new URL(url), init));
    vi.stubGlobal('fetch', fetchMock);
  };
  async function member(label: string) {
    const id = randomUUID(),
      uid = `partial-${label}-${id}`,
      email = `${uid}@example.test`;
    const [workspace] = await db
      .insert(workspaces)
      .values({ name: `Partial ${label} ${id}` })
      .returning();
    await db
      .insert(users)
      .values({ id, firebaseUid: uid, email, displayName: label });
    await db
      .insert(workspaceMembers)
      .values({ workspaceId: workspace!.id, userId: id, role: 'admin' });
    const item = { id, uid, email, workspaceId: workspace!.id };
    members.push(item);
    return item;
  }
  async function snapshot(id: string) {
    const [link] = await db
      .select()
      .from(githubAccountLinks)
      .where(eq(githubAccountLinks.userId, id));
    const grants = link
      ? await db
          .select({
            scopes: githubOauthGrants.scopes,
            encrypted: githubOauthGrants.accessTokenEncrypted,
          })
          .from(githubOauthGrants)
          .where(eq(githubOauthGrants.accountLinkId, link.id))
      : [];
    const apps = await db
      .select({
        githubUserId: githubConnections.githubUserId,
        encrypted: githubConnections.accessTokenEncrypted,
      })
      .from(githubConnections)
      .where(eq(githubConnections.userId, id));
    const sessions = await db
      .select({ id: refreshTokens.id })
      .from(refreshTokens)
      .where(eq(refreshTokens.userId, id));
    return {
      link: link && { githubUserId: link.githubUserId, login: link.login },
      grants: grants.map((g) => ({
        scopes: g.scopes,
        digest: createHash('sha256').update(g.encrypted).digest('hex'),
      })),
      apps: apps.map((g) => ({
        githubUserId: g.githubUserId,
        digest: createHash('sha256')
          .update(g.encrypted ?? '')
          .digest('hex'),
      })),
      sessions: sessions.map((s) => s.id),
    };
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
    connections = app.get(GithubConnectionsService);
    accountOauth = app.get(GithubAccountOauthClientService);
  });
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });
  afterAll(async () => {
    vi.unstubAllGlobals();
    for (const m of members) {
      await db
        .delete(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, m.workspaceId));
      await db.delete(users).where(eq(users.id, m.id));
      await db.delete(workspaces).where(eq(workspaces.id, m.workspaceId));
    }
    await app.close();
  });

  it('redeems a partial-consent sign-in, then gates discovery without creating policy', async () => {
    const m = await member('partial');
    vi.spyOn(accountOauth, 'exchangeCode').mockResolvedValue({
      accessToken: 'oauth-partial',
      refreshToken: null,
      tokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scopes: ['user:email'],
    });
    vi.spyOn(accountOauth, 'getCurrentUser').mockResolvedValue({
      githubUserId: 'partial-id',
      login: 'partial-user',
      avatarUrl: null,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json([{ email: m.email, verified: true, primary: true }]),
      ),
    );
    const start = await request(app.getHttpServer())
      .get('/auth/github/start')
      .query({ app: 'user' })
      .expect(302);
    const state = new URL(start.headers.location).searchParams.get('state')!;
    const cookie = String(start.headers['set-cookie']).split(';', 1)[0]!;
    const callback = await request(app.getHttpServer())
      .get('/auth/github/callback')
      .set('Cookie', cookie)
      .query({ code: 'partial-code', state })
      .expect(302);
    const handoff = new URL(callback.headers.location).searchParams.get(
      'code',
    )!;
    expect(callback.headers.location).toContain('/auth/github/callback?code=');
    const session = await request(app.getHttpServer())
      .post('/auth/github/session')
      .send({ code: handoff })
      .expect(200);
    expect(typeof session.body.accessToken).toBe('string');
    expect((await snapshot(m.id)).grants[0]?.scopes).toEqual(['user:email']);
    await request(app.getHttpServer())
      .get('/github/organizations')
      .set('Authorization', bearer(session.body.accessToken))
      .expect(403);
    const before = await snapshot(m.id);
    const add = await request(app.getHttpServer())
      .post('/workspace/github/organizations')
      .set('Authorization', bearer(session.body.accessToken))
      .send({ organizationLogin: 'NoScope' })
      .expect(400);
    expect(add.body.code).toBe(
      'workspace_github_organization_permission_required',
    );
    expect(await snapshot(m.id)).toEqual(before);
  });

  it('does not create an identity, grant or session when the provider denies sign-in', async () => {
    const m = await member('denied');
    const before = await snapshot(m.id);
    const exchange = vi.spyOn(accountOauth, 'exchangeCode');
    const start = await request(app.getHttpServer())
      .get('/auth/github/start')
      .query({ app: 'user' })
      .expect(302);
    const state = new URL(start.headers.location).searchParams.get('state')!;
    const cookie = String(start.headers['set-cookie']).split(';', 1)[0]!;
    const callback = await request(app.getHttpServer())
      .get('/auth/github/callback')
      .set('Cookie', cookie)
      .query({ error: 'access_denied', state })
      .expect(302);
    const destination = new URL(callback.headers.location);
    expect(destination.pathname).toBe('/login');
    expect(destination.searchParams.get('githubError')).toBe('denied');
    expect(destination.searchParams.has('code')).toBe(false);
    expect(exchange).not.toHaveBeenCalled();
    expect(await snapshot(m.id)).toEqual(before);
  });

  it('keeps an App-only migrated-equivalent connection usable while discovery requires OAuth', async () => {
    const m = await member('app-only');
    const profile = {
      githubUserId: 'legacy-app-id',
      login: 'legacy-app-user',
      avatarUrl: null,
    };
    // The migration backfills identity ownership but never fabricates an OAuth grant.
    // Migration execution itself is covered separately by github-identity-migration.
    await db.insert(githubAccountLinks).values({ userId: m.id, ...profile });
    const version = await accounts.getVersion(m.id);
    await connections.upsertConnected(
      m.id,
      profile,
      {
        accessToken: 'legacy-app-credential',
        refreshToken: 'legacy-app-refresh',
        tokenExpiresAt: new Date(Date.now() + 600_000),
        refreshTokenExpiresAt: new Date(Date.now() + 1_200_000),
      },
      { generation: version.generation, startedAt: new Date() },
    );
    const token = (await login(app, `test:${m.uid}:${m.email}:app-only`))
      .accessToken;
    provider((url, init) => {
      expect((init?.headers as Record<string, string>).Authorization).toBe(
        'Bearer legacy-app-credential',
      );
      expect(url.pathname).toBe('/users/legacy-app-user/projectsV2');
      return response([
        {
          node_id: 'PVT_legacy',
          number: 1,
          title: 'App-only project',
          owner: { login: profile.login },
          state: 'open',
          description: null,
          html_url: 'https://github.com/users/legacy-app-user/projects/1',
          updated_at: '2026-10-09T08:00:00Z',
        },
      ]);
    });
    const status = await request(app.getHttpServer())
      .get('/github/connection')
      .set('Authorization', bearer(token))
      .expect(200);
    expect(status.body.capabilities.personalData).toBe('ready');
    expect(status.body.capabilities.organizationDiscovery).toBe(
      'authorization_required',
    );
    const projects = await request(app.getHttpServer())
      .get('/github/projects')
      .query({ ownerType: 'personal', limit: 20 })
      .set('Authorization', bearer(token))
      .expect(200);
    expect(projects.body.items[0]?.id).toBe('PVT_legacy');
    const before = await snapshot(m.id);
    const providerCalls = fetchMock.mock.calls.length;
    const discovery = await request(app.getHttpServer())
      .get('/github/organizations')
      .set('Authorization', bearer(token))
      .expect(404);
    expect(discovery.body.message).toBe('GitHub OAuth authorization not found');
    expect(fetchMock).toHaveBeenCalledTimes(providerCalls);
    expect(await snapshot(m.id)).toEqual(before);
  });

  it('keeps App-backed Projects usable without OAuth read:project and sends only the App credential', async () => {
    const m = await member('app-projects');
    const version = await accounts.getVersion(m.id);
    await accounts.saveOAuth(
      m.id,
      { githubUserId: 'app-id', login: 'app-user', avatarUrl: null },
      {
        accessToken: 'oauth-no-project',
        refreshToken: null,
        tokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scopes: ['user:email', 'read:org'],
      },
      version.generation,
      new Date(),
    );
    await connections.upsertConnected(
      m.id,
      { githubUserId: 'app-id', login: 'app-user', avatarUrl: null },
      {
        accessToken: 'app-only-secret',
        refreshToken: 'app-refresh',
        tokenExpiresAt: new Date(Date.now() + 600_000),
        refreshTokenExpiresAt: new Date(Date.now() + 1_200_000),
      },
      { generation: version.generation, startedAt: new Date() },
    );
    const token = (await login(app, `test:${m.uid}:${m.email}:app-projects`))
      .accessToken;
    provider((url, init) => {
      expect((init?.headers as Record<string, string>).Authorization).toBe(
        'Bearer app-only-secret',
      );
      expect(url.pathname).toBe('/users/app-user/projectsV2');
      return response([]);
    });
    const status = await request(app.getHttpServer())
      .get('/github/connection')
      .set('Authorization', bearer(token))
      .expect(200);
    expect(status.body.oauth.missingScopes).toContain('read:project');
    expect(status.body.capabilities.personalData).toBe('ready');
    await request(app.getHttpServer())
      .get('/github/projects')
      .query({ ownerType: 'personal', limit: 20 })
      .set('Authorization', bearer(token))
      .expect(200);
  });

  it('rejects a different App callback identity without changing either stored credential family', async () => {
    const m = await member('mismatch');
    const version = await accounts.getVersion(m.id);
    await accounts.saveOAuth(
      m.id,
      { githubUserId: 'owner-id', login: 'owner', avatarUrl: null },
      {
        accessToken: 'oauth-owner',
        refreshToken: null,
        tokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scopes: ['user:email', 'read:org'],
      },
      version.generation,
      new Date(),
    );
    await connections.upsertConnected(
      m.id,
      { githubUserId: 'owner-id', login: 'owner', avatarUrl: null },
      {
        accessToken: 'app-owner',
        refreshToken: 'app-refresh',
        tokenExpiresAt: new Date(Date.now() + 60_000),
        refreshTokenExpiresAt: new Date(Date.now() + 120_000),
      },
      { generation: version.generation, startedAt: new Date() },
    );
    const token = (await login(app, `test:${m.uid}:${m.email}:mismatch`))
      .accessToken;
    const before = await snapshot(m.id);
    provider((url) =>
      url.hostname === 'github.com'
        ? response({
            access_token: 'different-app',
            refresh_token: 'refresh',
            token_type: 'bearer',
          })
        : response({ id: 'different-id', login: 'different' }),
    );
    const start = await request(app.getHttpServer())
      .get('/github/auth-url')
      .set('Authorization', bearer(token))
      .expect(200);
    const state = new URL(start.body.authorizationUrl).searchParams.get(
      'state',
    )!;
    const callback = await request(app.getHttpServer())
      .get('/github/callback')
      .query({ code: 'different', state })
      .expect(302);
    expect(new URL(callback.headers.location).searchParams.get('code')).toBe(
      'github_identity_mismatch',
    );
    expect(await snapshot(m.id)).toEqual(before);
  });
});

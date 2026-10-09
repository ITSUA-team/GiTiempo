import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import {
  afterAll,
  afterEach,
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
  githubConnections,
  projects,
  users,
  workspaceGitHubInstallations,
  workspaceGitHubOrganizations,
  workspaceMembers,
  workspaces,
} from '../src/db/schema';
import { GithubAccountService } from '../src/github/services/github-account.service';
import { GithubInstallationTokenProviderService } from '../src/github/services/github-installation-token-provider.service';
import { bearer, login } from './helpers/auth';

// HTTP routes, OAuth persistence, authorization and PostgreSQL are real.
// Only GitHub responses and App token minting are simulated; no live roles change.
describe('manual HTTP acceptance: OAuth-member installation setup', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let accounts: GithubAccountService;
  let userId: string;
  let workspaceId: string;
  let accessToken: string;
  let providerRequests: string[];
  const organizationLogin = 'MemberSetupOrg';
  const installation = {
    id: 420,
    app_id: 42,
    target_type: 'Organization',
    account: { id: 321, login: organizationLogin },
    suspended_at: null,
    permissions: { issues: 'read', members: 'read', metadata: 'read' },
  };
  const tokens = {
    appToken: vi.fn().mockResolvedValue('simulated-app-jwt'),
    getToken: vi.fn().mockResolvedValue('simulated-installation-token'),
    invalidate: vi.fn(),
  };

  async function startSetup() {
    return request(app.getHttpServer())
      .post('/workspace/github/installations/setup')
      .set('Authorization', bearer(accessToken))
      .send({ organizationLogin });
  }

  async function confirmExistingInstallation() {
    const setup = await startSetup();
    expect(setup.status).toBe(201);
    expect(setup.body.existingInstallationId).toBe('420');
    const result = await request(app.getHttpServer())
      .post('/workspace/github/installations/complete')
      .set('Authorization', bearer(accessToken))
      .send({
        state: setup.body.state,
        installationId: setup.body.existingInstallationId,
      })
      .expect(201);
    return result.body as { id: string; status: string };
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GithubInstallationTokenProviderService)
      .useValue(tokens)
      .compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(DRIZZLE);
    accounts = app.get(GithubAccountService);
    const config = app.get(ConfigService);
    config.set('GITHUB_APP_ID', '42');
    config.set('GITHUB_APP_SLUG', 'controlled-member-app');
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    providerRequests = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        const path = new URL(url).pathname;
        providerRequests.push(path);
        const authorization = new Headers(init?.headers).get('Authorization');
        if (path === `/user/memberships/orgs/${organizationLogin}`) {
          expect(authorization).toBe('Bearer simulated-member-oauth');
          return Response.json({
            state: 'active',
            role: 'member',
            organization: installation.account,
          });
        }
        if (
          path === `/orgs/${organizationLogin}/installation` ||
          path === '/app/installations/420'
        ) {
          expect(authorization).toBe('Bearer simulated-app-jwt');
          return Response.json(installation);
        }
        throw new Error(`Unexpected controlled provider request: ${path}`);
      }),
    );
    userId = randomUUID();
    workspaceId = randomUUID();
    const uid = `setup-acceptance-${userId}`;
    const email = `${uid}@example.test`;
    await db.transaction(async (tx) => {
      await tx
        .insert(workspaces)
        .values({ id: workspaceId, name: 'Controlled member setup' });
      await tx.insert(users).values({
        id: userId,
        firebaseUid: uid,
        email,
        displayName: 'Setup acceptance',
      });
      await tx
        .insert(workspaceMembers)
        .values({ workspaceId, userId, role: 'admin' });
      await tx.insert(workspaceGitHubOrganizations).values({
        workspaceId,
        organizationLogin,
        normalizedLogin: organizationLogin.toLowerCase(),
        createdByUserId: userId,
      });
    });
    const version = await accounts.getVersion(userId);
    await accounts.saveOAuth(
      userId,
      {
        githubUserId: `controlled-${userId}`,
        login: 'ordinary-github-member',
        avatarUrl: null,
      },
      {
        accessToken: 'simulated-member-oauth',
        refreshToken: null,
        tokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scopes: ['user:email', 'read:org', 'read:project'],
      },
      version.generation,
      new Date(),
    );
    accessToken = (await login(app, `test:${uid}:${email}:Setup acceptance`))
      .accessToken;
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await db.transaction(async (tx) => {
      await tx.delete(workspaces).where(eq(workspaces.id, workspaceId));
      await tx.delete(users).where(eq(users.id, userId));
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('links and re-verifies the exact existing installation for a GitHub member without personal App authorization', async () => {
    const confirmed = await confirmExistingInstallation();
    expect(confirmed.status).toBe('verified');
    expect(tokens.getToken).toHaveBeenCalledWith({
      installationId: '420',
      authorizationVersion: 0,
      permissions: { issues: 'read', metadata: 'read', members: 'read' },
    });
    const [saved] = await db
      .select()
      .from(workspaceGitHubInstallations)
      .where(eq(workspaceGitHubInstallations.workspaceId, workspaceId));
    expect(saved).toMatchObject({
      appId: '42',
      installationId: '420',
      organizationId: '321',
      organizationLogin,
      status: 'verified',
      verifiedByUserId: userId,
    });
    await request(app.getHttpServer())
      .post(`/workspace/github/installations/${confirmed.id}/reverify`)
      .set('Authorization', bearer(accessToken))
      .expect(200);
    const list = await request(app.getHttpServer())
      .get('/workspace/github/installations')
      .set('Authorization', bearer(accessToken))
      .expect(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].status).toBe('verified');
    expect(JSON.stringify(list.body)).not.toMatch(
      /simulated-|accessToken|privateKey/,
    );
    expect(providerRequests).not.toContain('/user/installations');
    expect(
      await db
        .select()
        .from(githubConnections)
        .where(eq(githubConnections.userId, userId)),
    ).toEqual([]);
  });

  it('keeps private repositories, issues, Projects and both imports unavailable after successful installation setup', async () => {
    await confirmExistingInstallation();
    const providerCallsBefore = providerRequests.length;
    const tokenCallsBefore = tokens.getToken.mock.calls.length;
    for (const path of ['/github/repos', '/github/projects']) {
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', bearer(accessToken))
        .query({
          ownerType: 'organization',
          owner: organizationLogin,
          limit: 10,
        })
        .expect(404);
    }
    await request(app.getHttpServer())
      .get(`/github/repos/${organizationLogin}/private/issues`)
      .set('Authorization', bearer(accessToken))
      .expect(404);
    const repositoryImport = await request(app.getHttpServer())
      .post('/projects/import/github')
      .set('Authorization', bearer(accessToken))
      .send({ githubRepos: [`${organizationLogin}/private`] })
      .expect(200);
    const projectImport = await request(app.getHttpServer())
      .post('/projects/import/github-projects')
      .set('Authorization', bearer(accessToken))
      .send({ githubProjects: [{ githubProjectId: 'PVT_controlled_private' }] })
      .expect(200);
    for (const response of [repositoryImport, projectImport]) {
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0]).toMatchObject({
        status: 'failed',
        projectId: null,
      });
    }
    expect(
      await db
        .select()
        .from(projects)
        .where(eq(projects.workspaceId, workspaceId)),
    ).toEqual([]);
    expect(
      await db
        .select()
        .from(githubConnections)
        .where(eq(githubConnections.userId, userId)),
    ).toEqual([]);
    expect(providerRequests).toHaveLength(providerCallsBefore);
    expect(tokens.getToken).toHaveBeenCalledTimes(tokenCallsBefore);
  });

  it('retains GiTiempo admin and allowed-organization requirements even when the GitHub App exists', async () => {
    await db
      .delete(workspaceGitHubOrganizations)
      .where(eq(workspaceGitHubOrganizations.workspaceId, workspaceId));
    expect((await startSetup()).status).toBe(403);
    expect(providerRequests).toEqual([]);
    await db
      .update(workspaceMembers)
      .set({ role: 'member' })
      .where(eq(workspaceMembers.userId, userId));
    expect((await startSetup()).status).toBe(403);
    expect(
      await db
        .select()
        .from(workspaceGitHubInstallations)
        .where(eq(workspaceGitHubInstallations.workspaceId, workspaceId)),
    ).toEqual([]);
  });
});

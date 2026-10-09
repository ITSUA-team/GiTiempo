import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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
  githubOauthGrants,
  workspaceGitHubOrganizations,
  users,
  workspaceMembers,
  workspaces,
} from '../src/db/schema';
import { GithubAccountService } from '../src/github/services/github-account.service';
import { bearer, login } from './helpers/auth';

/**
 * Controlled HTTP acceptance probe. The Nest app, OAuth grant persistence,
 * GitHub API client, pagination, and workspace policy service are real; only
 * outbound GitHub HTTP responses are simulated.
 */
describe('manual HTTP acceptance: GitHub organization discovery', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let accounts: GithubAccountService;
  let accessToken: string;
  let workspaceId: string;
  let userId: string;
  let userEmail: string;

  const providerFetch = vi.fn<(url: string | URL) => Promise<Response>>();

  function githubResponse(
    body: unknown,
    options: { status?: number; link?: string } = {},
  ): Response {
    return new Response(JSON.stringify(body), {
      status: options.status ?? 200,
      headers: {
        'content-type': 'application/json',
        ...(options.link ? { link: options.link } : {}),
      },
    });
  }

  function installProvider(
    responder: (url: URL) => Response | Promise<Response>,
  ): void {
    providerFetch.mockImplementation(async (url) => responder(new URL(url)));
    vi.stubGlobal('fetch', providerFetch);
  }

  async function saveOAuth(scopes: string[]): Promise<void> {
    const version = await accounts.getVersion(userId);
    await accounts.saveOAuth(
      userId,
      {
        githubUserId: `organization-http-${userId}`,
        login: 'organization-http-admin',
        avatarUrl: null,
      },
      {
        accessToken: 'simulated-org-discovery-access',
        refreshToken: null,
        tokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scopes,
      },
      version.generation,
      new Date(),
    );
  }

  async function policySnapshot() {
    const rows = await db
      .select({
        id: workspaceGitHubOrganizations.id,
        organizationLogin: workspaceGitHubOrganizations.organizationLogin,
        normalizedLogin: workspaceGitHubOrganizations.normalizedLogin,
        createdByUserId: workspaceGitHubOrganizations.createdByUserId,
      })
      .from(workspaceGitHubOrganizations)
      .where(eq(workspaceGitHubOrganizations.workspaceId, workspaceId))
      .orderBy(workspaceGitHubOrganizations.normalizedLogin);
    const [grant] = await db
      .select({ scopes: githubOauthGrants.scopes })
      .from(githubOauthGrants)
      .innerJoin(
        githubAccountLinks,
        eq(githubOauthGrants.accountLinkId, githubAccountLinks.id),
      )
      .where(eq(githubAccountLinks.userId, userId))
      .limit(1);
    return { rows, grantScopes: grant?.scopes ?? [] };
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(DRIZZLE);
    accounts = app.get(GithubAccountService);

    const suffix = randomUUID();
    userId = randomUUID();
    userEmail = `organization-http-${suffix}@example.test`;
    const [workspace] = await db
      .insert(workspaces)
      .values({ name: `Organization HTTP ${suffix}` })
      .returning();
    workspaceId = workspace!.id;
    await db.insert(users).values({
      id: userId,
      firebaseUid: `organization-http-${suffix}`,
      email: userEmail,
      displayName: 'Organization HTTP admin',
    });
    await db
      .insert(workspaceMembers)
      .values({ workspaceId, userId, role: 'admin' });
    await saveOAuth(['user:email', 'read:org', 'read:project']);
    accessToken = (
      await login(
        app,
        `test:organization-http-${suffix}:${userEmail}:Organization HTTP admin`,
      )
    ).accessToken;
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    providerFetch.mockReset();
    await saveOAuth(['user:email', 'read:org', 'read:project']);
    await db
      .delete(workspaceGitHubOrganizations)
      .where(eq(workspaceGitHubOrganizations.workspaceId, workspaceId));
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await db
      .delete(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    await app.close();
  });

  it('collects multiple provider pages and deduplicates overlapping organization memberships', async () => {
    installProvider((url) => {
      const page = url.searchParams.get('page');
      if (url.pathname === '/user/orgs' && page === '1') {
        return githubResponse(
          [
            { login: 'Alpha', html_url: 'https://github.com/Alpha' },
            { login: 'Shared', html_url: 'https://github.com/Shared' },
          ],
          {
            link: '<https://api.github.com/user/orgs?per_page=100&page=2>; rel="next"',
          },
        );
      }
      if (url.pathname === '/user/orgs' && page === '2') {
        return githubResponse([{ login: 'Beta' }]);
      }
      if (url.pathname === '/user/memberships/orgs' && page === '1') {
        return githubResponse(
          [
            { state: 'active', organization: { login: 'shared' } },
            { state: 'active', organization: { login: 'Gamma' } },
          ],
          {
            link: '<https://api.github.com/user/memberships/orgs?state=active&per_page=100&page=2>; rel="next"',
          },
        );
      }
      if (url.pathname === '/user/memberships/orgs' && page === '2') {
        return githubResponse([
          { state: 'active', organization: { login: 'BETA' } },
        ]);
      }
      throw new Error(`Unexpected GitHub request: ${url}`);
    });

    const response = await request(app.getHttpServer())
      .get('/github/organizations')
      .set('Authorization', bearer(accessToken))
      .expect(200);

    expect(
      response.body.items.map((item: { login: string }) => item.login),
    ).toEqual(['Alpha', 'Shared', 'Beta', 'Gamma']);
    expect(providerFetch).toHaveBeenCalledTimes(4);
  });

  it('returns an explicit empty result when the provider reports no organizations or memberships', async () => {
    installProvider(() => githubResponse([]));

    const response = await request(app.getHttpServer())
      .get('/github/organizations')
      .set('Authorization', bearer(accessToken))
      .expect(200);

    expect(response.body).toEqual({ items: [] });
  });

  it('fails discovery rather than returning a silently truncated result when a later page fails', async () => {
    installProvider((url) => {
      const page = url.searchParams.get('page');
      if (url.pathname === '/user/orgs' && page === '1') {
        return githubResponse([{ login: 'First' }], {
          link: '<https://api.github.com/user/orgs?per_page=100&page=2>; rel="next"',
        });
      }
      if (url.pathname === '/user/orgs' && page === '2') {
        return githubResponse({ message: 'provider outage' }, { status: 502 });
      }
      if (url.pathname === '/user/memberships/orgs') return githubResponse([]);
      throw new Error(`Unexpected GitHub request: ${url}`);
    });

    const response = await request(app.getHttpServer())
      .get('/github/organizations')
      .set('Authorization', bearer(accessToken))
      .expect(503);

    expect(response.body).not.toHaveProperty('items');

    // A transient discovery failure must not disable the independent manual
    // membership-validation path.
    installProvider((url) => {
      if (url.pathname === '/user/orgs') return githubResponse([]);
      if (url.pathname === '/user/memberships/orgs/ManualRecovery') {
        return githubResponse({
          state: 'active',
          organization: { login: 'ManualRecovery' },
        });
      }
      throw new Error(`Unexpected GitHub request: ${url}`);
    });
    const manual = await request(app.getHttpServer())
      .post('/workspace/github/organizations')
      .set('Authorization', bearer(accessToken))
      .send({ organizationLogin: 'ManualRecovery' })
      .expect(201);
    expect(manual.body.organizationLogin).toBe('ManualRecovery');
  });

  it('returns a distinct restricted-organization recovery response and keeps policy storage unchanged', async () => {
    installProvider((url) => {
      if (url.pathname === '/user/orgs') return githubResponse([]);
      if (url.pathname === '/user/memberships/orgs/Restricted') {
        return githubResponse(
          { message: 'OAuth application access restricted' },
          { status: 403 },
        );
      }
      throw new Error(`Unexpected GitHub request: ${url}`);
    });
    const before = await policySnapshot();

    const response = await request(app.getHttpServer())
      .post('/workspace/github/organizations')
      .set('Authorization', bearer(accessToken))
      .send({ organizationLogin: 'Restricted' })
      .expect(400);

    expect(response.body).toMatchObject({
      code: 'workspace_github_organization_oauth_access_blocked',
      recovery: {
        reason: 'workspace_github_organization_oauth_access_blocked',
      },
    });
    expect(await policySnapshot()).toEqual(before);
  });

  it('rejects manual addition for missing OAuth permission and inactive or absent membership without saving policy', async () => {
    await saveOAuth(['user:email', 'read:project']);
    const beforePermission = await policySnapshot();
    const permission = await request(app.getHttpServer())
      .post('/workspace/github/organizations')
      .set('Authorization', bearer(accessToken))
      .send({ organizationLogin: 'NeedsScope' })
      .expect(400);
    expect(permission.body).toMatchObject({
      code: 'workspace_github_organization_permission_required',
      recovery: { reason: 'workspace_github_organization_permission_required' },
    });
    expect(providerFetch).not.toHaveBeenCalled();
    expect(await policySnapshot()).toEqual(beforePermission);

    await saveOAuth(['user:email', 'read:org', 'read:project']);
    installProvider((url) => {
      if (url.pathname === '/user/orgs') return githubResponse([]);
      if (url.pathname === '/user/memberships/orgs/Inactive') {
        return githubResponse({
          state: 'pending',
          organization: { login: 'Inactive' },
        });
      }
      if (url.pathname === '/user/memberships/orgs/Absent') {
        return githubResponse({ message: 'not found' }, { status: 404 });
      }
      if (url.pathname === '/user/memberships/orgs') return githubResponse([]);
      throw new Error(`Unexpected GitHub request: ${url}`);
    });
    const beforeMembership = await policySnapshot();

    for (const organizationLogin of ['Inactive', 'Absent']) {
      const response = await request(app.getHttpServer())
        .post('/workspace/github/organizations')
        .set('Authorization', bearer(accessToken))
        .send({ organizationLogin })
        .expect(400);
      expect(response.body).toMatchObject({
        code: 'workspace_github_organization_not_visible',
        recovery: { reason: 'workspace_github_organization_not_visible' },
      });
    }
    expect(await policySnapshot()).toEqual(beforeMembership);
  });
});

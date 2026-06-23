import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import { GithubApiClientService } from '../src/github/services/github-api-client.service';
import { GithubConnectionsService } from '../src/github/services/github-connections.service';
import {
  workspaceGitHubOrganizations,
  users,
  workspaceMembers,
  workspaceSettings,
  workspaces,
} from '../src/db/schema';
import { bearer, login } from './helpers/auth';

describe('Workspace settings (e2e)', () => {
  const githubApiClient = {
    getAuthenticatedUserOrganizationMembership: vi.fn(),
    getProjectOwner: vi.fn(),
    listActiveOrganizationMemberships: vi.fn(),
    listOwners: vi.fn(),
    listProjectIssues: vi.fn(),
    listProjects: vi.fn(),
    listRepositories: vi.fn(),
    listRepositoryIssues: vi.fn(),
  };

  let app: INestApplication;
  let db: DrizzleDB;
  let adminToken: string;
  let workspaceId: string;
  let adminUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GithubApiClientService)
      .useValue(githubApiClient)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<DrizzleDB>(DRIZZLE);
    const githubConnections = app.get(GithubConnectionsService);

    const suffix = randomUUID();
    const adminUid = `workspace-settings-admin-${suffix}`;
    const adminEmail = `${adminUid}@example.com`;

    const [workspace] = await db
      .insert(workspaces)
      .values({ name: `Workspace Settings ${suffix}` })
      .returning();
    if (!workspace) throw new Error('Failed to create test workspace');
    workspaceId = workspace.id;

    const [adminUser] = await db
      .insert(users)
      .values({
        firebaseUid: adminUid,
        email: adminEmail,
        displayName: 'Workspace Settings Admin',
        avatarUrl: null,
      })
      .returning();
    if (!adminUser) throw new Error('Failed to create test admin');
    adminUserId = adminUser.id;

    await db.insert(workspaceMembers).values({
      workspaceId,
      userId: adminUserId,
      role: 'admin',
    });
    await db.insert(workspaceSettings).values({
      workspaceId,
      currency: 'USD',
      defaultHourlyRate: 100,
      timeZone: 'UTC',
    });
    await githubConnections.upsertConnected(
      adminUserId,
      {
        githubUserId: '123',
        login: 'octocat',
        avatarUrl: null,
      },
      {
        accessToken: 'ghu_access_token',
        refreshToken: 'ghr_refresh_token',
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    );

    const tokens = await login(
      app,
      `test:${adminUid}:${adminEmail}:Workspace Settings Admin`,
    );
    adminToken = tokens.accessToken;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    githubApiClient.listOwners.mockResolvedValue({ items: [] });
    githubApiClient.getAuthenticatedUserOrganizationMembership.mockResolvedValue(
      null,
    );
    githubApiClient.listActiveOrganizationMemberships.mockResolvedValue({
      items: [],
    });
  });

  afterAll(async () => {
    if (workspaceId) {
      await db
        .delete(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, workspaceId));
      await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    }
    if (adminUserId) {
      await db.delete(users).where(eq(users.id, adminUserId));
    }
    if (app) await app.close();
  });

  describe('GET /workspace', () => {
    it('returns current workspace with correct shape', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace')
        .set('Authorization', bearer(adminToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('updatedAt');
      expect(typeof res.body.id).toBe('string');
      expect(typeof res.body.name).toBe('string');
    });
  });

  describe('GET /workspace/settings', () => {
    it('returns settings with seed defaults', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/settings')
        .set('Authorization', bearer(adminToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('workspaceId');
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('updatedAt');
      expect(res.body.currency).toBe('USD');
      expect(res.body.defaultHourlyRate).toBe(100);
      expect(res.body.timeZone).toBe('UTC');
    });
  });

  describe('GET /workspace/github/organizations', () => {
    it('returns an empty policy list when the workspace has no allowed organizations', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/github/organizations')
        .set('Authorization', bearer(adminToken));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ items: [] });

      const rows = await db
        .select()
        .from(workspaceGitHubOrganizations)
        .where(eq(workspaceGitHubOrganizations.workspaceId, workspaceId));
      expect(rows).toEqual([]);
    });
  });

  describe('POST /workspace/github/organizations', () => {
    it('creates an allowed organization and persists the saved row', async () => {
      githubApiClient.listOwners.mockResolvedValue({
        items: [
          {
            login: 'Octo-Org',
            label: 'Octo-Org',
            type: 'organization',
            avatarUrl: null,
            url: 'https://github.com/Octo-Org',
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/workspace/github/organizations')
        .set('Authorization', bearer(adminToken))
        .send({ organizationLogin: 'octo-org' });

      expect(res.status).toBe(201);
      expect(res.body.organizationLogin).toBe('Octo-Org');
      expect(res.body.workspaceId).toBe(workspaceId);
      expect(typeof res.body.id).toBe('string');
      expect(githubApiClient.listOwners).toHaveBeenCalledWith(
        'ghu_access_token',
        {
          login: 'octocat',
          avatarUrl: null,
        },
        'organization',
      );

      const rows = await db
        .select()
        .from(workspaceGitHubOrganizations)
        .where(eq(workspaceGitHubOrganizations.workspaceId, workspaceId));
      expect(rows).toHaveLength(1);
      expect(rows[0]?.organizationLogin).toBe('Octo-Org');
      expect(rows[0]?.normalizedLogin).toBe('octo-org');
      expect(rows[0]?.createdByUserId).toBe(adminUserId);
    });
  });

  describe('DELETE /workspace/github/organizations/:organizationId', () => {
    it('removes only the targeted workspace organization row', async () => {
      const [otherWorkspace] = await db
        .insert(workspaces)
        .values({ name: `Other Workspace ${randomUUID()}` })
        .returning();
      if (!otherWorkspace) {
        throw new Error('Failed to create other workspace');
      }

      try {
        const [targetRow] = await db
          .insert(workspaceGitHubOrganizations)
          .values({
            workspaceId,
            organizationLogin: 'Delete-Me',
            normalizedLogin: 'delete-me',
            createdByUserId: adminUserId,
          })
          .returning();
        const [otherRow] = await db
          .insert(workspaceGitHubOrganizations)
          .values({
            workspaceId: otherWorkspace.id,
            organizationLogin: 'Keep-Me',
            normalizedLogin: 'keep-me',
            createdByUserId: adminUserId,
          })
          .returning();
        if (!targetRow || !otherRow) {
          throw new Error(
            'Failed to create workspace GitHub organization rows',
          );
        }

        const res = await request(app.getHttpServer())
          .delete(`/workspace/github/organizations/${targetRow.id}`)
          .set('Authorization', bearer(adminToken));

        expect(res.status).toBe(204);
        expect(res.text).toBe('');

        const workspaceRows = await db
          .select()
          .from(workspaceGitHubOrganizations)
          .where(eq(workspaceGitHubOrganizations.workspaceId, workspaceId));
        expect(workspaceRows.map((row) => row.id)).not.toContain(targetRow.id);

        const otherWorkspaceRows = await db
          .select()
          .from(workspaceGitHubOrganizations)
          .where(
            eq(workspaceGitHubOrganizations.workspaceId, otherWorkspace.id),
          );
        expect(otherWorkspaceRows.map((row) => row.id)).toContain(otherRow.id);
      } finally {
        await db
          .delete(workspaceGitHubOrganizations)
          .where(
            eq(workspaceGitHubOrganizations.workspaceId, otherWorkspace.id),
          );
        await db.delete(workspaces).where(eq(workspaces.id, otherWorkspace.id));
      }
    });
  });

  describe('PATCH /workspace/settings', () => {
    it('updates currency', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workspace/settings')
        .set('Authorization', bearer(adminToken))
        .send({ currency: 'EUR' });

      expect(res.status).toBe(200);
      expect(res.body.currency).toBe('EUR');

      const verify = await request(app.getHttpServer())
        .get('/workspace/settings')
        .set('Authorization', bearer(adminToken));
      expect(verify.body.currency).toBe('EUR');

      const [row] = await db
        .select()
        .from(workspaceSettings)
        .where(eq(workspaceSettings.workspaceId, workspaceId));
      expect(row?.currency).toBe('EUR');
    });

    it('updates defaultHourlyRate', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workspace/settings')
        .set('Authorization', bearer(adminToken))
        .send({ defaultHourlyRate: 150 });

      expect(res.status).toBe(200);
      expect(res.body.defaultHourlyRate).toBe(150);

      const verify = await request(app.getHttpServer())
        .get('/workspace/settings')
        .set('Authorization', bearer(adminToken));
      expect(verify.body.defaultHourlyRate).toBe(150);
    });

    it('sets defaultHourlyRate to null', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workspace/settings')
        .set('Authorization', bearer(adminToken))
        .send({ defaultHourlyRate: null });

      expect(res.status).toBe(200);
      expect(res.body.defaultHourlyRate).toBeNull();

      const verify = await request(app.getHttpServer())
        .get('/workspace/settings')
        .set('Authorization', bearer(adminToken));
      expect(verify.body.defaultHourlyRate).toBeNull();
    });

    it('updates timeZone', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workspace/settings')
        .set('Authorization', bearer(adminToken))
        .send({ timeZone: 'Europe/Kyiv' });

      expect(res.status).toBe(200);
      expect(res.body.timeZone).toBe('Europe/Kyiv');

      const verify = await request(app.getHttpServer())
        .get('/workspace/settings')
        .set('Authorization', bearer(adminToken));
      expect(verify.body.timeZone).toBe('Europe/Kyiv');

      const [row] = await db
        .select()
        .from(workspaceSettings)
        .where(eq(workspaceSettings.workspaceId, workspaceId));
      expect(row?.timeZone).toBe('Europe/Kyiv');
    });

    it('returns 400 for empty body', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workspace/settings')
        .set('Authorization', bearer(adminToken))
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid currency format', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workspace/settings')
        .set('Authorization', bearer(adminToken))
        .send({ currency: 'usd' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid timeZone', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workspace/settings')
        .set('Authorization', bearer(adminToken))
        .send({ timeZone: 'Not/AZone' });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /workspace', () => {
    it('updates workspace name', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workspace')
        .set('Authorization', bearer(adminToken))
        .send({ name: 'Updated Workspace' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Workspace');

      const verify = await request(app.getHttpServer())
        .get('/workspace')
        .set('Authorization', bearer(adminToken));
      expect(verify.body.name).toBe('Updated Workspace');

      const [row] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId));
      expect(row?.name).toBe('Updated Workspace');
    });

    it('returns 400 for empty body', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workspace')
        .set('Authorization', bearer(adminToken))
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 400 for name exceeding max length', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workspace')
        .set('Authorization', bearer(adminToken))
        .send({ name: 'x'.repeat(256) });

      expect(res.status).toBe(400);
    });
  });
});

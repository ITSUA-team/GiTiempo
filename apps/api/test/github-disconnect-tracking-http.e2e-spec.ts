import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { TokenService } from '../src/auth/services/token.service';
import { FIREBASE_ADMIN } from '../src/auth/services/firebase-admin.interface';
import type { FakeFirebaseAdminService } from '../src/auth/services/firebase-admin.fake';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  githubConnections,
  githubOauthGrants,
  projectAssignments,
  projectExternalRefs,
  projects,
  tasks,
  timeEntries,
  users,
  workspaceGitHubInstallations,
  workspaceGitHubOrganizations,
  workspaceMembers,
  workspaces,
} from '../src/db/schema';
import { GithubAccountService } from '../src/github/services/github-account.service';
import { GithubConnectionsService } from '../src/github/services/github-connections.service';
import { GithubInstallationTokenProviderService } from '../src/github/services/github-installation-token-provider.service';
import { GithubApiClientService } from '../src/github/services/github-api-client.service';

describe('manual HTTP acceptance: Disconnect preserves installation tracking', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let tokens: TokenService;
  let accounts: GithubAccountService;
  let connections: GithubConnectionsService;
  let firebase: FakeFirebaseAdminService;
  let workspaceId: string;
  let projectId: string;
  const assignedId = randomUUID();
  const unassignedId = randomUUID();
  const assignedUid = `tracking-assigned-${assignedId}`;
  const unassignedUid = `tracking-unassigned-${unassignedId}`;
  const provider = {
    appToken: vi.fn().mockResolvedValue('installation-app-token'),
    getToken: vi.fn().mockResolvedValue('installation-access-token'),
    invalidate: vi.fn(),
  };
  const api = {
    getRepository: vi.fn().mockResolvedValue({
      id: 'repo-1',
      name: 'private',
      fullName: 'TrackingOrg/private',
      owner: 'TrackingOrg',
      visibility: 'private',
      url: 'https://github.com/TrackingOrg/private',
    }),
    getRepositoryIssue: vi.fn(
      async ({ issueNumber }: { issueNumber: number }) => ({
        id: `issue-${issueNumber}`,
        number: issueNumber,
        title: `Issue ${issueNumber}`,
        state: 'open',
        url: `https://github.com/TrackingOrg/private/issues/${issueNumber}`,
      }),
    ),
  };
  const profile = {
    githubUserId: String(8_000_000_000_000 + Date.now()),
    login: 'safe-tracking-user',
    avatarUrl: null,
  };

  function bearer(
    userId: string,
    uid: string,
    role: 'member' | 'admin' = 'member',
  ) {
    return `Bearer ${tokens.signAccess({ sub: userId, firebaseUid: uid, email: `${uid}@example.test`, workspaceId, role })}`;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GithubInstallationTokenProviderService)
      .useValue(provider)
      .overrideProvider(GithubApiClientService)
      .useValue(api)
      .compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(DRIZZLE);
    tokens = app.get(TokenService);
    accounts = app.get(GithubAccountService);
    connections = app.get(GithubConnectionsService);
    firebase = app.get(FIREBASE_ADMIN);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/app/installations/'))
          return Response.json({
            id: 420,
            app_id: 42,
            target_type: 'Organization',
            account: { id: 321, login: 'TrackingOrg' },
            suspended_at: null,
          });
        if (url.includes('/orgs/TrackingOrg'))
          return Response.json({ id: 321, login: 'TrackingOrg' });
        throw new Error(`Unexpected controlled GitHub transport: ${url}`);
      }),
    );
    const [workspace] = await db
      .insert(workspaces)
      .values({ name: `Disconnect tracking ${randomUUID()}` })
      .returning();
    workspaceId = workspace!.id;
    await db.insert(users).values([
      {
        id: assignedId,
        firebaseUid: assignedUid,
        email: `${assignedUid}@example.test`,
        displayName: 'Assigned',
      },
      {
        id: unassignedId,
        firebaseUid: unassignedUid,
        email: `${unassignedUid}@example.test`,
        displayName: 'Unassigned',
      },
    ]);
    await db.insert(workspaceMembers).values([
      { workspaceId, userId: assignedId, role: 'member' },
      { workspaceId, userId: unassignedId, role: 'member' },
    ]);
    await db.insert(workspaceGitHubOrganizations).values({
      workspaceId,
      organizationLogin: 'TrackingOrg',
      normalizedLogin: 'trackingorg',
      createdByUserId: assignedId,
    });
    await db.insert(workspaceGitHubInstallations).values({
      workspaceId,
      organizationId: '321',
      organizationLogin: 'TrackingOrg',
      normalizedOrganizationLogin: 'trackingorg',
      installationId: '420',
      appId: '42',
      status: 'verified',
      authorizationVersion: 1,
      verifiedByUserId: assignedId,
      verifiedAt: new Date(),
    });
    const [project] = await db
      .insert(projects)
      .values({
        workspaceId,
        name: 'Mapped public project',
        visibility: 'public',
        defaultBillableForTasks: false,
      })
      .returning();
    projectId = project!.id;
    await db.insert(projectExternalRefs).values({
      workspaceId,
      projectId,
      provider: 'github',
      externalType: 'repository',
      externalKey: 'TrackingOrg/private',
    });
    await db.insert(projectAssignments).values({
      workspaceId,
      projectId,
      userId: assignedId,
      assignedBy: assignedId,
    });
    const version = await accounts.getVersion(assignedId);
    await accounts.saveOAuth(
      assignedId,
      profile,
      {
        accessToken: 'oauth-personal',
        refreshToken: 'oauth-refresh',
        tokenExpiresAt: null,
        refreshTokenExpiresAt: new Date(Date.now() + 120_000),
        scopes: ['user:email', 'read:org', 'read:project'],
      },
      version.generation,
      new Date(),
    );
    await connections.upsertConnected(
      assignedId,
      profile,
      {
        accessToken: 'app-personal',
        refreshToken: 'app-refresh',
        tokenExpiresAt: new Date(Date.now() + 60_000),
        refreshTokenExpiresAt: new Date(Date.now() + 120_000),
      },
      { generation: version.generation, startedAt: new Date() },
    );
    firebase.setAlternativeProviders(assignedUid, ['password']);
    vi.spyOn(
      (
        accounts as unknown as {
          oauthClient: { revoke: () => Promise<boolean> };
        }
      ).oauthClient,
      'revoke',
    ).mockResolvedValue(true);
    vi.spyOn(
      (
        accounts as unknown as {
          appOauthClient: { revoke: () => Promise<boolean> };
        }
      ).appOauthClient,
      'revoke',
    ).mockResolvedValue(true);
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await db
      .delete(timeEntries)
      .where(eq(timeEntries.workspaceId, workspaceId));
    await db.delete(tasks).where(eq(tasks.workspaceId, workspaceId));
    await db.delete(projects).where(eq(projects.workspaceId, workspaceId));
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    await db.delete(users).where(eq(users.id, assignedId));
    await db.delete(users).where(eq(users.id, unassignedId));
    await app.close();
  });

  it('keeps installation-backed tracking and assignment enforcement after full personal Disconnect', async () => {
    const personalAccess = vi.spyOn(connections, 'getValidAccessToken');
    const workspaceRecords = () =>
      Promise.all([
        db
          .select()
          .from(workspaceGitHubInstallations)
          .where(eq(workspaceGitHubInstallations.workspaceId, workspaceId)),
        db
          .select()
          .from(workspaceGitHubOrganizations)
          .where(eq(workspaceGitHubOrganizations.workspaceId, workspaceId)),
        db.select().from(projects).where(eq(projects.id, projectId)),
        db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)),
        db
          .select()
          .from(timeEntries)
          .where(eq(timeEntries.workspaceId, workspaceId)),
      ]);
    const assigned = bearer(assignedId, assignedUid);
    const unassigned = bearer(unassignedId, unassignedUid);
    const first = await request(app.getHttpServer())
      .post('/time-entries/timer/start-from-github')
      .set('Authorization', assigned)
      .send({ githubRepo: 'TrackingOrg/private', issueNumber: 1 })
      .expect(201);
    const entryId = first.body.id as string;
    expect(provider.getToken).toHaveBeenCalled();
    const identity = await accounts.findByUserId(assignedId);
    expect(identity).not.toBeNull();
    const beforeUnlink = await workspaceRecords();
    const disconnect = await request(app.getHttpServer())
      .delete('/github/connection')
      .set('Authorization', assigned)
      .expect(200);
    expect(disconnect.body).toEqual({
      disconnected: true,
      providerRevocation: 'confirmed',
    });
    expect(await accounts.findByUserId(assignedId)).toBeNull();
    expect(
      await db
        .select()
        .from(githubOauthGrants)
        .where(eq(githubOauthGrants.accountLinkId, identity!.id)),
    ).toHaveLength(0);
    expect(
      (
        await db
          .select()
          .from(githubConnections)
          .where(eq(githubConnections.userId, assignedId))
      ).length,
    ).toBe(0);
    expect(
      (
        await db
          .select()
          .from(workspaceGitHubInstallations)
          .where(eq(workspaceGitHubInstallations.workspaceId, workspaceId))
      )[0]?.status,
    ).toBe('verified');
    expect(
      (await db.select().from(projects).where(eq(projects.id, projectId)))
        .length,
    ).toBe(1);
    expect(await workspaceRecords()).toEqual(beforeUnlink);
    expect(
      (await db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)))
        .length,
    ).toBe(1);
    await request(app.getHttpServer())
      .post('/time-entries/timer/stop')
      .set('Authorization', assigned)
      .send({ expectedTimerId: entryId })
      .expect(200);
    const second = await request(app.getHttpServer())
      .post('/time-entries/timer/start-from-github')
      .set('Authorization', assigned)
      .send({ githubRepo: 'TrackingOrg/private', issueNumber: 2 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/time-entries/timer/stop')
      .set('Authorization', assigned)
      .send({ expectedTimerId: second.body.id })
      .expect(200);
    const beforeDenied = (
      await db
        .select()
        .from(timeEntries)
        .where(eq(timeEntries.workspaceId, workspaceId))
    ).length;
    const tasksBeforeDenied = await db
      .select()
      .from(tasks)
      .where(eq(tasks.workspaceId, workspaceId));
    const denied = await request(app.getHttpServer())
      .post('/time-entries/timer/start-from-github')
      .set('Authorization', unassigned)
      .send({ githubRepo: 'TrackingOrg/private', issueNumber: 3 })
      .expect(403);
    expect(denied.body.code).toBe('project_assignment_required');
    expect(
      await db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)),
    ).toEqual(tasksBeforeDenied);
    expect(personalAccess).not.toHaveBeenCalled();
    expect(
      (
        await db
          .select()
          .from(timeEntries)
          .where(eq(timeEntries.workspaceId, workspaceId))
      ).length,
    ).toBe(beforeDenied);
    expect(
      (
        await db
          .select()
          .from(projectAssignments)
          .where(eq(projectAssignments.userId, unassignedId))
      ).length,
    ).toBe(0);
  });
});

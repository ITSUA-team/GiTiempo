import { createHmac, randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
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
import { eq } from 'drizzle-orm';
import { AppModule } from '../src/app.module';
import type { AuthUser } from '../src/auth/types/auth-user';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  projects,
  projectAssignments,
  projectExternalRefs,
  tasks,
  timeEntries,
  users,
  workspaces,
  workspaceMembers,
  workspaceGitHubOrganizations,
  workspaceGitHubInstallations,
  githubInstallationSetupStates,
} from '../src/db/schema';
import { GithubInstallationsService } from '../src/github/services/github-installations.service';
import { GithubInstallationTokenProviderService } from '../src/github/services/github-installation-token-provider.service';
import { GithubConnectionsService } from '../src/github/services/github-connections.service';
import { GithubApiClientService } from '../src/github/services/github-api-client.service';
import { TimeEntriesService } from '../src/time-entries/services/time-entries.service';

// Real authorization, mapping, transactions and PostgreSQL; only GitHub transport is stubbed.
describe('Installation tracking authorization (real PostgreSQL)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let installations: GithubInstallationsService;
  let timers: TimeEntriesService;
  let admin: AuthUser;
  let member: AuthUser;
  let workspaceId: string;
  let projectId: string;
  let associationId: string;
  const ownedUsers: string[] = [];
  const connection = {
    getValidAccessToken: vi.fn(async (userId: string) => {
      if (userId !== admin.sub)
        throw new Error('No personal GitHub integration');
      return 'owner-user-token';
    }),
  };
  const tokens = {
    appToken: vi.fn().mockResolvedValue('app-jwt'),
    getToken: vi.fn().mockResolvedValue('installation-token'),
    invalidate: vi.fn(),
  };
  const api = {
    getRepository: vi.fn().mockResolvedValue({
      id: '500',
      name: 'private',
      fullName: 'InstallationE2E/private',
      owner: 'InstallationE2E',
      visibility: 'private',
      url: 'https://github.com/InstallationE2E/private',
    }),
    getRepositoryIssue: vi.fn(
      async ({ issueNumber }: { issueNumber: number }) => ({
        id: `issue-${issueNumber}`,
        number: issueNumber,
        title: `Private issue ${issueNumber}`,
        state: 'open',
        url: `https://github.com/InstallationE2E/private/issues/${issueNumber}`,
      }),
    ),
  };
  const installation = {
    id: 420,
    app_id: 42,
    target_type: 'Organization',
    account: { id: 321, login: 'InstallationE2E' },
    suspended_at: null,
    permissions: {
      issues: 'read',
      members: 'read',
      metadata: 'read',
      organization_projects: 'read',
    },
  };
  const input = { githubRepo: 'installatione2e/private', issueNumber: 1 };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GithubConnectionsService)
      .useValue(connection)
      .overrideProvider(GithubInstallationTokenProviderService)
      .useValue(tokens)
      .overrideProvider(GithubApiClientService)
      .useValue(api)
      .compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(DRIZZLE);
    installations = app.get(GithubInstallationsService);
    timers = app.get(TimeEntriesService);
    const config = app.get(ConfigService);
    config.set('GITHUB_APP_ID', '42');
    config.set('GITHUB_APP_SLUG', 'test-app');
    config.set('GITHUB_APP_WEBHOOK_SECRET', 'test-webhook-secret');
    config.set('ADMIN_SPA_URL', 'http://localhost:5174');
  });
  beforeEach(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/user/installations'))
          return Response.json({ installations: [{ id: 420 }] });
        if (url.includes('/user/memberships/orgs/'))
          return Response.json({
            state: 'active',
            role: 'admin',
            organization: { id: 321, login: 'InstallationE2E' },
          });
        if (url.includes('/app/installations/'))
          return Response.json(installation);
        if (url.includes('/orgs/') && url.endsWith('/installation'))
          return Response.json(installation);
        if (url.includes('/orgs/'))
          return Response.json({ id: 321, login: 'InstallationE2E' });
        throw new Error(`Unexpected GitHub transport path: ${url}`);
      }),
    );
    const [workspace] = await db
      .insert(workspaces)
      .values({ name: `Installation tracking E2E ${randomUUID()}` })
      .returning();
    workspaceId = workspace!.id;
    for (const role of ['admin', 'member'] as const) {
      const uid = randomUUID();
      const [row] = await db
        .insert(users)
        .values({
          firebaseUid: uid,
          email: `${uid}@example.test`,
          displayName: role,
        })
        .returning();
      ownedUsers.push(row!.id);
      const auth = {
        sub: row!.id,
        workspaceId,
        role,
        email: row!.email,
        firebaseUid: uid,
      };
      if (role === 'admin') admin = auth;
      else member = auth;
      await db
        .insert(workspaceMembers)
        .values({ workspaceId, userId: row!.id, role });
    }
    await db.insert(workspaceGitHubOrganizations).values({
      workspaceId,
      organizationLogin: 'InstallationE2E',
      normalizedLogin: 'installatione2e',
      createdByUserId: admin.sub,
    });
    const setup = await installations.setup(admin, {
      organizationLogin: 'InstallationE2E',
    });
    const linked = await installations.complete(admin, {
      state: setup.state,
      installationId: '420',
    });
    associationId = linked.id;
    const [project] = await db
      .insert(projects)
      .values({
        workspaceId,
        name: 'Mapped private repository',
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
      externalKey: 'InstallationE2E/private',
    });
    await db.insert(projectAssignments).values({
      workspaceId,
      projectId,
      userId: member.sub,
      assignedBy: admin.sub,
    });
    connection.getValidAccessToken.mockClear();
  });
  afterEach(async () => {
    await db
      .delete(timeEntries)
      .where(eq(timeEntries.workspaceId, workspaceId));
    await db.delete(tasks).where(eq(tasks.workspaceId, workspaceId));
    await db.delete(projects).where(eq(projects.workspaceId, workspaceId));
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    for (const id of ownedUsers.splice(0))
      await db.delete(users).where(eq(users.id, id));
    vi.unstubAllGlobals();
  });
  afterAll(async () => {
    await app?.close();
  });

  it('completes owner setup and starts a private issue for an assigned member with no personal connection', async () => {
    const result = await timers.startTimerFromGitHub(member, input);
    expect(result.source).toBe('extension');
    expect(result.isBillable).toBe(false);
    expect(connection.getValidAccessToken).not.toHaveBeenCalled();
    const status = await installations.list(workspaceId);
    expect(status.items[0]?.status).toBe('verified');
    expect(JSON.stringify(status)).not.toMatch(
      /installation-token|app-jwt|owner-user-token/,
    );
  });
  it('rejects replayed setup without replacing the verified link', async () => {
    const setup = await installations.setup(admin, {
      organizationLogin: 'InstallationE2E',
    });
    await installations.complete(admin, {
      state: setup.state,
      installationId: '420',
    });
    await expect(
      installations.complete(admin, {
        state: setup.state,
        installationId: '420',
      }),
    ).rejects.toThrow(/expired|used/);
    expect((await installations.list(workspaceId)).items).toHaveLength(1);
  });
  it.each([
    'wrong-app',
    'wrong-org',
    'not-owner',
    'not-accessible',
    'permissions',
  ])(
    'preserves the verified link when replacement fails: %s',
    async (failure) => {
      const setup = await installations.setup(admin, {
        organizationLogin: 'InstallationE2E',
      });
      const originalFetch = globalThis.fetch;
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) => {
          if (
            url.includes('/app/installations/') &&
            ['wrong-app', 'wrong-org', 'permissions'].includes(failure)
          ) {
            return Response.json({
              ...installation,
              ...(failure === 'wrong-app' ? { app_id: 99 } : {}),
              ...(failure === 'wrong-org'
                ? { account: { id: 999, login: 'InstallationE2E' } }
                : {}),
              ...(failure === 'permissions'
                ? { permissions: { metadata: 'read' } }
                : {}),
            });
          }
          if (url.includes('/user/memberships/') && failure === 'not-owner')
            return Response.json({
              state: 'active',
              role: 'member',
              organization: { id: 321, login: 'InstallationE2E' },
            });
          if (
            url.includes('/user/installations') &&
            failure === 'not-accessible'
          )
            return Response.json({ installations: [] });
          return originalFetch(url);
        }),
      );
      await expect(
        installations.complete(admin, {
          state: setup.state,
          installationId: '420',
        }),
      ).rejects.toThrow();
      const list = await installations.list(workspaceId);
      expect(list.items).toHaveLength(1);
      expect(list.items[0]).toMatchObject({
        id: associationId,
        status: 'verified',
        installationId: '420',
      });
    },
  );
  it('rejects expired and wrong-user setup states', async () => {
    const setup = await installations.setup(admin, {
      organizationLogin: 'InstallationE2E',
    });
    await expect(
      installations.complete(member, {
        state: setup.state,
        installationId: '420',
      }),
    ).rejects.toThrow();
    await db
      .update(githubInstallationSetupStates)
      .set({ expiresAt: new Date(0) })
      .where(eq(githubInstallationSetupStates.state, setup.state));
    await expect(
      installations.complete(admin, {
        state: setup.state,
        installationId: '420',
      }),
    ).rejects.toThrow(/expired|used/);
  });
  it('rechecks lost administrator role after remote setup verification', async () => {
    const setup = await installations.setup(admin, {
      organizationLogin: 'InstallationE2E',
    });
    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/user/installations'))
          await db
            .update(workspaceMembers)
            .set({ role: 'member' })
            .where(eq(workspaceMembers.userId, admin.sub));
        return originalFetch(url);
      }),
    );
    await expect(
      installations.complete(admin, {
        state: setup.state,
        installationId: '420',
      }),
    ).rejects.toThrow(/Admin/);
    expect((await installations.list(workspaceId)).items[0]?.status).toBe(
      'verified',
    );
  });
  it('denies an unassigned public-project member without task/time/assignment side effects', async () => {
    await db
      .delete(projectAssignments)
      .where(eq(projectAssignments.projectId, projectId));
    await expect(
      timers.startTimerFromGitHub(member, input),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'project_assignment_required',
      }),
    });
    expect(
      await db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(timeEntries)
        .where(eq(timeEntries.workspaceId, workspaceId)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(projectAssignments)
        .where(eq(projectAssignments.workspaceId, workspaceId)),
    ).toHaveLength(0);
  });
  it('rechecks installation disconnect committed during provider lookup and rolls back writes', async () => {
    let release!: () => void;
    let entered!: () => void;
    const reached = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    api.getRepositoryIssue.mockImplementationOnce(async ({ issueNumber }) => {
      entered();
      await blocked;
      return {
        id: `issue-${issueNumber}`,
        number: issueNumber,
        title: 'Private issue',
        state: 'open',
        url: 'https://github.com/InstallationE2E/private/issues/1',
      };
    });
    const start = timers.startTimerFromGitHub(member, input);
    const denial = expect(start).rejects.toThrow();
    await reached;
    await installations.disconnect(admin, associationId);
    release();
    await denial;
    expect(
      await db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(timeEntries)
        .where(eq(timeEntries.workspaceId, workspaceId)),
    ).toHaveLength(0);
  });
  it('persists repository access invalidation across instances without reactivating a disconnected link', async () => {
    const context = await installations.prepareIssue(
      member,
      'InstallationE2E',
      'private',
      1,
    );
    const body = Buffer.from(
      JSON.stringify({ installation: { id: 420 }, action: 'removed' }),
    );
    const headers = {
      signature: `sha256=${createHmac('sha256', 'test-webhook-secret').update(body).digest('hex')}`,
      deliveryId: randomUUID(),
      event: 'installation_repositories',
    };
    await installations.handleWebhook(headers, body);
    await expect(
      db.transaction((tx) => installations.assertCurrent(tx, member, context)),
    ).rejects.toThrow();
    await installations.disconnect(admin, associationId);
    const unsuspend = Buffer.from(
      JSON.stringify({ installation: { id: 420 }, action: 'unsuspend' }),
    );
    await installations.handleWebhook(
      {
        signature: `sha256=${createHmac('sha256', 'test-webhook-secret').update(unsuspend).digest('hex')}`,
        deliveryId: randomUUID(),
        event: 'installation',
      },
      unsuspend,
    );
    expect((await installations.list(workspaceId)).items[0]?.status).toBe(
      'disconnected',
    );
  });
  it('blocks lifecycle access loss, ignores replay, and still stops the owned timer', async () => {
    const running = await timers.startTimerFromGitHub(member, input);
    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('/app/installations/')
          ? Response.json({
              ...installation,
              suspended_at: new Date().toISOString(),
            })
          : originalFetch(url),
      ),
    );
    const body = Buffer.from(
      JSON.stringify({ installation: { id: 420 }, action: 'suspend' }),
    );
    const headers = {
      signature: `sha256=${createHmac('sha256', 'test-webhook-secret').update(body).digest('hex')}`,
      deliveryId: randomUUID(),
      event: 'installation',
    };
    await installations.handleWebhook(headers, body);
    const [first] = await db
      .select()
      .from(workspaceGitHubInstallations)
      .where(eq(workspaceGitHubInstallations.id, associationId));
    await installations.handleWebhook(headers, body);
    const [second] = await db
      .select()
      .from(workspaceGitHubInstallations)
      .where(eq(workspaceGitHubInstallations.id, associationId));
    expect(second!.authorizationVersion).toBe(first!.authorizationVersion);
    expect(second!.status).toBe('suspended');
    await expect(
      timers.startTimerFromGitHub(member, { ...input, issueNumber: 2 }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'github_installation_unavailable',
      }),
    });
    const stopped = await timers.stopTimer(member, {
      expectedTimerId: running.id,
    });
    expect(stopped.endedAt).not.toBeNull();
  });
});

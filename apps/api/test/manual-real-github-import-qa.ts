import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import request from 'supertest';
import { and, count, eq } from 'drizzle-orm';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import { assertE2eDatabase } from '../src/db/e2e-database';
import type { DrizzleDB } from '../src/db/db.types';
import { GithubOauthClientService } from '../src/github/services/github-oauth-client.service';
import {
  githubAccountLinks,
  githubAuthorizationGenerations,
  githubConnections,
  projectAssignments,
  projectExternalRefs,
  projects,
  taskExternalRefs,
  tasks,
  timeEntries,
  users,
  workspaceGitHubOrganizations,
  workspaceMembers,
  workspaces,
} from '../src/db/schema';
import { bearer, login } from './helpers/auth';

type SourceConnection = {
  githubUserId: string;
  login: string;
  avatarUrl: string | null;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  tokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
};

type Repository = { fullName: string };
type Board = { id: string };

const email = 'oleksii.tsukanov@itsua.com';
const organizations = ['My-test-org-for-clock', 'ITSUA-team'];
const MINIMUM_ACCESS_TOKEN_VALIDITY_MS = 15 * 60 * 1_000;

function fail(message: string): never {
  throw new Error(message);
}

function assertIsolatedQaEnvironment(): void {
  const targetUrl = process.env.DATABASE_URL;
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  if (
    process.env.NODE_ENV !== 'test' ||
    !targetUrl ||
    !sourceUrl ||
    targetUrl === sourceUrl
  ) {
    fail('Unsafe live import QA environment');
  }
  try {
    const target = new URL(targetUrl);
    const source = new URL(sourceUrl);
    const targetDatabase = target.pathname.slice(1);
    const sourceDatabase = source.pathname.slice(1);
    const targetIsLoopback =
      target.hostname === 'localhost' ||
      target.hostname === '127.0.0.1' ||
      target.hostname === '::1';
    if (
      !targetIsLoopback ||
      !targetDatabase.startsWith('gitiempo_qa_live_import_') ||
      !sourceDatabase ||
      targetDatabase === sourceDatabase
    ) {
      fail('Unsafe live import QA environment');
    }
  } catch {
    fail('Unsafe live import QA environment');
  }
}

function assertSourceTokensAreFresh(source: SourceConnection): void {
  const now = Date.now();
  if (
    !(source.tokenExpiresAt instanceof Date) ||
    source.tokenExpiresAt.getTime() < now + MINIMUM_ACCESS_TOKEN_VALIDITY_MS ||
    !(source.refreshTokenExpiresAt instanceof Date) ||
    source.refreshTokenExpiresAt.getTime() <= now
  ) {
    fail('Personal GitHub App credentials are not fresh enough for live QA');
  }
}

async function sourceConnection(): Promise<SourceConnection> {
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  if (!sourceUrl) fail('SOURCE_DATABASE_URL is required');

  const client = new Client({ connectionString: sourceUrl });
  await client.connect();
  try {
    const result = await client.query<SourceConnection>(
      `SELECT gc.github_user_id AS "githubUserId", gc.login, gc.avatar_url AS "avatarUrl",
              gc.access_token_encrypted AS "accessTokenEncrypted",
              gc.refresh_token_encrypted AS "refreshTokenEncrypted",
              gc.token_expires_at AS "tokenExpiresAt",
              gc.refresh_token_expires_at AS "refreshTokenExpiresAt"
         FROM users u
         JOIN github_connections gc ON gc.user_id = u.id
        WHERE lower(u.email) = lower($1)
          AND gc.connected = true
          AND gc.access_token_encrypted IS NOT NULL
          AND gc.refresh_token_encrypted IS NOT NULL
        ORDER BY u.updated_at DESC
        LIMIT 1`,
      [email],
    );
    const row = result.rows[0];
    if (!row) fail('No usable personal GitHub App connection is available');
    assertSourceTokensAreFresh(row);
    return row;
  } finally {
    await client.end();
  }
}

async function run(): Promise<void> {
  let app: INestApplication | undefined;
  assertIsolatedQaEnvironment();
  await assertE2eDatabase();
  const source = await sourceConnection();
  let refreshAttempts = 0;
  const suffix = randomUUID();
  const uid = `live-github-import-qa-${suffix}`;
  const qaEmail = `${uid}@example.test`;

  try {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GithubOauthClientService)
      .useValue({
        refresh: async () => {
          refreshAttempts += 1;
          throw new Error('QA must not refresh copied GitHub credentials');
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
    const db = app.get<DrizzleDB>(DRIZZLE);

    const [workspace] = await db
      .insert(workspaces)
      .values({ name: `Live GitHub import QA ${suffix}` })
      .returning({ id: workspaces.id });
    if (!workspace) fail('Could not create QA workspace');

    const [user] = await db
      .insert(users)
      .values({
        firebaseUid: uid,
        email: qaEmail,
        displayName: 'Live import QA',
      })
      .returning({ id: users.id });
    if (!user) fail('Could not create QA user');
    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: 'admin',
    });
    await db.insert(githubAccountLinks).values({
      userId: user.id,
      githubUserId: source.githubUserId,
      login: source.login,
      avatarUrl: source.avatarUrl,
    });
    await db.insert(githubAuthorizationGenerations).values({ userId: user.id });
    await db.insert(githubConnections).values({
      userId: user.id,
      githubUserId: source.githubUserId,
      login: source.login,
      avatarUrl: source.avatarUrl,
      accessTokenEncrypted: source.accessTokenEncrypted,
      refreshTokenEncrypted: source.refreshTokenEncrypted,
      tokenExpiresAt: source.tokenExpiresAt,
      refreshTokenExpiresAt: source.refreshTokenExpiresAt,
      connected: true,
    });
    await db.insert(workspaceGitHubOrganizations).values(
      organizations.map((organizationLogin) => ({
        workspaceId: workspace.id,
        organizationLogin,
        normalizedLogin: organizationLogin.toLowerCase(),
        createdByUserId: user.id,
      })),
    );

    const token = (await login(app, `test:${uid}:${qaEmail}:Live import QA`))
      .accessToken;
    const server = app.getHttpServer();
    const deniedOrganization = await request(server)
      .get(
        '/github/repos?ownerType=organization&owner=not-approved-for-qa&limit=1',
      )
      .set('Authorization', bearer(token));
    if (deniedOrganization.status !== 404)
      fail(`Organization policy denial returned ${deniedOrganization.status}`);
    const noConnectionUid = `live-import-no-connection-${suffix}`;
    const noConnectionEmail = `${noConnectionUid}@example.test`;
    const [noConnectionUser] = await db
      .insert(users)
      .values({
        firebaseUid: noConnectionUid,
        email: noConnectionEmail,
        displayName: 'No connection QA',
      })
      .returning({ id: users.id });
    if (!noConnectionUser) fail('Could not create no-connection QA user');
    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: noConnectionUser.id,
      role: 'admin',
    });
    const noConnectionToken = (
      await login(
        app,
        `test:${noConnectionUid}:${noConnectionEmail}:No connection QA`,
      )
    ).accessToken;
    const noConnectionBrowse = await request(server)
      .get('/github/repos?ownerType=personal&limit=1')
      .set('Authorization', bearer(noConnectionToken));
    if (noConnectionBrowse.status !== 404)
      fail(`No-credential browse returned ${noConnectionBrowse.status}`);
    const browse = async <T>(
      path: string,
    ): Promise<{ body: T; status: number }> => {
      const response = await request(server)
        .get(path)
        .set('Authorization', bearer(token));
      return { body: response.body as T, status: response.status };
    };

    let repositories: Repository[] = [];
    let boards: Board[] = [];
    let repositoryOrganization = '';
    let boardOrganization = '';
    const projectBrowseStatuses: Record<string, number> = {};
    for (const organization of organizations) {
      const result = await browse<{ items: Repository[] }>(
        `/github/repos?ownerType=organization&owner=${encodeURIComponent(organization)}&limit=20`,
      );
      if (result.status !== 200) {
        fail(`Repository browse for ${organization} returned ${result.status}`);
      }
      if (repositories.length === 0 && result.body.items.length > 0) {
        repositories = result.body.items;
        repositoryOrganization = organization;
      }
      const projectResult = await browse<{ items: Board[] }>(
        `/github/projects?ownerType=organization&owner=${encodeURIComponent(organization)}&limit=20`,
      );
      projectBrowseStatuses[organization] = projectResult.status;
      if (
        projectResult.status === 200 &&
        boards.length === 0 &&
        projectResult.body.items.length > 0
      ) {
        boards = projectResult.body.items;
        boardOrganization = organization;
      }
    }
    const repository = repositories[0]?.fullName;
    if (!repository)
      fail(
        'No permitted live repository was returned for the QA organizations',
      );

    const [externalProject] = await db
      .insert(projects)
      .values({
        workspaceId: workspace.id,
        name: `External reference QA ${suffix}`,
        trackingMode: 'external-reference',
        visibility: 'private',
      })
      .returning({ id: projects.id });
    if (!externalProject) fail('Could not create external QA project');
    await db.insert(projectExternalRefs).values({
      workspaceId: workspace.id,
      projectId: externalProject.id,
      provider: 'github',
      externalType: 'repository',
      externalKey: repository,
      externalUrl: `https://github.com/${repository}`,
      referenceProvenance: 'user-supplied',
      syncedAt: null,
    });
    const [task] = await db
      .insert(tasks)
      .values({
        workspaceId: workspace.id,
        projectId: externalProject.id,
        title: 'Existing external history',
      })
      .returning({ id: tasks.id });
    if (!task) fail('Could not create QA task');
    await db.insert(taskExternalRefs).values({
      workspaceId: workspace.id,
      projectId: externalProject.id,
      taskId: task.id,
      provider: 'github',
      externalType: 'issue',
      externalKey: `${repository}#1`,
      externalUrl: `https://github.com/${repository}/issues/1`,
      referenceProvenance: 'user-supplied',
      syncedAt: null,
    });
    const endedAt = new Date();
    await db.insert(timeEntries).values({
      workspaceId: workspace.id,
      userId: user.id,
      taskId: task.id,
      startedAt: new Date(endedAt.getTime() - 60_000),
      endedAt,
      durationSeconds: 60,
      source: 'extension',
    });

    const repositoryImport = await request(server)
      .post('/projects/import/github')
      .set('Authorization', bearer(token))
      .send({ githubRepos: [repository] });
    if (repositoryImport.status !== 200)
      fail(`Repository import returned ${repositoryImport.status}`);
    const reused = repositoryImport.body.results?.[0];
    if (
      reused?.status !== 'already-imported' ||
      reused.projectId !== externalProject.id
    ) {
      fail('Repository import did not preserve the external project identity');
    }
    const [preserved] = await db
      .select({
        trackingMode: projects.trackingMode,
        referenceProvenance: projectExternalRefs.referenceProvenance,
        syncedAt: projectExternalRefs.syncedAt,
      })
      .from(projects)
      .innerJoin(
        projectExternalRefs,
        eq(projectExternalRefs.projectId, projects.id),
      )
      .where(eq(projects.id, externalProject.id));
    const history = await db
      .select({ id: timeEntries.id })
      .from(timeEntries)
      .where(eq(timeEntries.taskId, task.id));
    const assignments = await db
      .select({ id: projectAssignments.id })
      .from(projectAssignments)
      .where(eq(projectAssignments.projectId, externalProject.id));
    if (
      preserved?.trackingMode !== 'external-reference' ||
      preserved.referenceProvenance !== 'user-supplied' ||
      preserved.syncedAt !== null ||
      history.length !== 1 ||
      assignments.length !== 0
    )
      fail(
        'Repository import changed external project provenance, history, or assignments',
      );

    const managedRepository =
      repositories.find((item) => item.fullName !== repository)?.fullName ??
      null;
    let managedProjectId: string | null = null;
    let managedRepositoryStatus: string | null = null;
    if (managedRepository) {
      const imported = await request(server)
        .post('/projects/import/github')
        .set('Authorization', bearer(token))
        .send({ githubRepos: [managedRepository] });
      if (imported.status !== 200)
        fail(`Managed repository import returned ${imported.status}`);
      managedRepositoryStatus = imported.body.results?.[0]?.status ?? null;
      managedProjectId = imported.body.results?.[0]?.projectId ?? null;
      if (managedRepositoryStatus !== 'imported')
        fail('Normal managed repository import did not create its project');
    }

    let managedConflictStatus: string | null = null;
    let inactiveManagedReassociationStatus: string | null = null;

    let boardStatus: string | null = null;
    if (boards[0]) {
      await db
        .update(projects)
        .set({ isActive: false })
        .where(eq(projects.id, externalProject.id));
      await db.insert(projectExternalRefs).values({
        workspaceId: workspace.id,
        projectId: externalProject.id,
        provider: 'github',
        externalType: 'project',
        externalKey: boards[0].id,
        externalUrl: null,
        referenceProvenance: 'user-supplied',
        syncedAt: null,
      });
      const before = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.workspaceId, workspace.id));
      const boardImport = await request(server)
        .post('/projects/import/github-projects')
        .set('Authorization', bearer(token))
        .send({
          githubProjects: [
            { githubProjectId: boards[0].id, githubRepos: [repository] },
          ],
        });
      if (boardImport.status !== 200)
        fail(`Board import returned ${boardImport.status}`);
      const result = boardImport.body.results?.[0];
      boardStatus = result?.status ?? null;
      if (
        boardStatus !== 'failed' ||
        !String(result?.message).includes('external-reference')
      ) {
        fail('Board import took over an inactive external mapping');
      }
      const after = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.workspaceId, workspace.id));
      if (
        after.length !== before.length ||
        !after.some((item) => item.id === externalProject.id)
      ) {
        fail('Board import changed the external project namespace');
      }
    }

    if (boards[0] && managedRepository && managedProjectId) {
      await db
        .delete(projectExternalRefs)
        .where(
          and(
            eq(projectExternalRefs.projectId, externalProject.id),
            eq(projectExternalRefs.externalType, 'project'),
            eq(projectExternalRefs.externalKey, boards[0].id),
          ),
        );
      const conflict = await request(server)
        .post('/projects/import/github-projects')
        .set('Authorization', bearer(token))
        .send({
          githubProjects: [
            {
              githubProjectId: boards[0].id,
              githubRepos: [managedRepository],
            },
          ],
        });
      if (conflict.status !== 200)
        fail(`Managed conflict import returned ${conflict.status}`);
      managedConflictStatus = conflict.body.results?.[0]?.status ?? null;
      const boardRefsAfterConflict = await db
        .select({ projectId: projectExternalRefs.projectId })
        .from(projectExternalRefs)
        .where(
          and(
            eq(projectExternalRefs.workspaceId, workspace.id),
            eq(projectExternalRefs.externalType, 'project'),
            eq(projectExternalRefs.externalKey, boards[0].id),
          ),
        );
      if (boardRefsAfterConflict.length !== 0)
        fail('Active managed conflict created a board mapping');

      await db
        .update(projects)
        .set({ isActive: false })
        .where(eq(projects.id, managedProjectId));
      const reassociated = await request(server)
        .post('/projects/import/github-projects')
        .set('Authorization', bearer(token))
        .send({
          githubProjects: [
            {
              githubProjectId: boards[0].id,
              githubRepos: [managedRepository],
            },
          ],
        });
      if (reassociated.status !== 200)
        fail(`Inactive managed reassociation returned ${reassociated.status}`);
      inactiveManagedReassociationStatus =
        reassociated.body.results?.[0]?.status ?? null;
      const reassociatedProjectId = reassociated.body.results?.[0]?.projectId;
      if (
        inactiveManagedReassociationStatus !== 'imported' ||
        typeof reassociatedProjectId !== 'string' ||
        reassociatedProjectId === managedProjectId
      ) {
        fail(
          'Inactive managed repository was not reassociated to a new board project',
        );
      }
      const [repositoryHolder] = await db
        .select({ projectId: projectExternalRefs.projectId })
        .from(projectExternalRefs)
        .where(
          and(
            eq(projectExternalRefs.workspaceId, workspace.id),
            eq(projectExternalRefs.externalType, 'repository'),
            eq(projectExternalRefs.externalKey, managedRepository),
          ),
        );
      if (repositoryHolder?.projectId !== reassociatedProjectId) {
        fail(
          'Inactive managed repository reference did not move to the imported board',
        );
      }
    }

    const [beforeProviderRemoval] = await db
      .select({
        projects: count(projects.id),
        refs: count(projectExternalRefs.id),
      })
      .from(projects)
      .leftJoin(
        projectExternalRefs,
        eq(projectExternalRefs.projectId, projects.id),
      )
      .where(eq(projects.workspaceId, workspace.id));
    await db
      .delete(workspaceGitHubOrganizations)
      .where(eq(workspaceGitHubOrganizations.workspaceId, workspace.id));
    const removedPolicyBrowse = await request(server)
      .get('/github/repos?ownerType=organization&owner=ITSUA-team&limit=1')
      .set('Authorization', bearer(token));
    if (removedPolicyBrowse.status !== 404)
      fail(
        `Removed organization policy returned ${removedPolicyBrowse.status}`,
      );
    const policyDeniedImport = await request(server)
      .post('/projects/import/github')
      .set('Authorization', bearer(token))
      .send({ githubRepos: [repository] });
    if (
      policyDeniedImport.status !== 200 ||
      policyDeniedImport.body.results?.[0]?.status !== 'failed'
    ) {
      fail('Removed organization policy did not deny repository import');
    }
    await db
      .delete(githubConnections)
      .where(eq(githubConnections.userId, user.id));
    const removedCredentialBrowse = await request(server)
      .get('/github/repos?ownerType=personal&limit=1')
      .set('Authorization', bearer(token));
    if (removedCredentialBrowse.status !== 404)
      fail(
        `Removed personal credential returned ${removedCredentialBrowse.status}`,
      );
    const credentialDeniedImport = await request(server)
      .post('/projects/import/github')
      .set('Authorization', bearer(token))
      .send({ githubRepos: [repository] });
    if (
      credentialDeniedImport.status !== 200 ||
      credentialDeniedImport.body.results?.[0]?.status !== 'failed'
    ) {
      fail('Removed personal credential did not deny repository import');
    }
    const [afterProviderRemoval] = await db
      .select({
        projects: count(projects.id),
        refs: count(projectExternalRefs.id),
      })
      .from(projects)
      .leftJoin(
        projectExternalRefs,
        eq(projectExternalRefs.projectId, projects.id),
      )
      .where(eq(projects.workspaceId, workspace.id));
    if (
      beforeProviderRemoval?.projects !== afterProviderRemoval?.projects ||
      beforeProviderRemoval?.refs !== afterProviderRemoval?.refs
    ) {
      fail('Denied provider imports changed the QA project namespace');
    }
    if (refreshAttempts !== 0)
      fail('Live import QA attempted to refresh copied GitHub credentials');

    process.stdout.write(
      `${JSON.stringify({
        repositoryBrowseStatus: 200,
        deniedOrganizationStatus: deniedOrganization.status,
        noPersonalCredentialStatus: noConnectionBrowse.status,
        removedPolicyStatus: removedPolicyBrowse.status,
        removedCredentialStatus: removedCredentialBrowse.status,
        repositoryOrganization,
        projectBrowseStatuses,
        boardOrganization: boardOrganization || null,
        repositoryImportStatus: reused.status,
        managedRepositoryImportStatus: managedRepositoryStatus,
        boardImportStatus: boardStatus,
        managedConflictStatus,
        inactiveManagedReassociationStatus,
        boardAvailable: boards.length > 0,
        refreshAttempts,
      })}\n`,
    );
  } finally {
    await app?.close();
  }
}

void run().catch(() => {
  process.stderr.write('Live import QA failed; inspect the bounded QA log.\n');
  process.exitCode = 1;
});

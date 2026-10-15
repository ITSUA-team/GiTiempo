import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { and, eq } from 'drizzle-orm';
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
  projectExternalRefs,
  projectAssignments,
  projects,
  taskExternalRefs,
  tasks,
  timeEntries,
  users,
  workspaceMembers,
  workspaces,
} from '../src/db/schema';
import { GithubService } from '../src/github/services/github.service';
import {
  GithubInstallationsService,
  type VerifiedInstallationIssue,
} from '../src/github/services/github-installations.service';
import { bearer, login } from './helpers/auth';

describe('External GitHub tracking completion QA (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let workspaceId: string;
  let memberId: string;
  let adminId: string;
  let memberToken: string;
  let adminToken: string;

  const github = {
    getRepository: vi.fn(),
    resolveImportableProject: vi.fn(),
  };
  const installations = {
    assertCurrent: vi.fn().mockResolvedValue(undefined),
    prepareIssue: vi.fn<
      (
        user: unknown,
        owner: string,
        repository: string,
        issueNumber: number,
      ) => Promise<VerifiedInstallationIssue>
    >(async () => {
      throw new Error('External reference starts must not call installations');
    }),
  };

  const issue = (repo: string, number: number) => ({
    githubRepo: repo,
    issueNumber: number,
    issueTitle: `External issue ${number}`,
    issueUrl: `https://github.com/${repo}/issues/${number}`,
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GithubService)
      .useValue(github)
      .overrideProvider(GithubInstallationsService)
      .useValue(installations)
      .compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(DRIZZLE);
  });

  beforeEach(async () => {
    github.getRepository.mockReset();
    github.resolveImportableProject.mockReset();
    installations.prepareIssue.mockClear();
    installations.assertCurrent.mockReset();
    installations.assertCurrent.mockResolvedValue(undefined);

    const [workspace] = await db
      .insert(workspaces)
      .values({ name: `External completion QA ${randomUUID()}` })
      .returning();
    workspaceId = workspace!.id;

    const createUser = async (role: 'admin' | 'member', label: string) => {
      const uid = `external-completion-${randomUUID()}`;
      const email = `${uid}@example.test`;
      const [user] = await db
        .insert(users)
        .values({ firebaseUid: uid, email, displayName: label })
        .returning();
      await db
        .insert(workspaceMembers)
        .values({ workspaceId, userId: user!.id, role });
      const token = (await login(app, `test:${uid}:${email}:${label}`))
        .accessToken;
      return { id: user!.id, token };
    };

    const member = await createUser('member', 'External member');
    const admin = await createUser('admin', 'External admin');
    memberId = member.id;
    adminId = admin.id;
    memberToken = member.token;
    adminToken = admin.token;
  });

  afterEach(async () => {
    await db
      .delete(timeEntries)
      .where(eq(timeEntries.workspaceId, workspaceId));
    await db.delete(tasks).where(eq(tasks.workspaceId, workspaceId));
    await db.delete(projects).where(eq(projects.workspaceId, workspaceId));
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    await db.delete(users).where(eq(users.id, memberId));
    await db.delete(users).where(eq(users.id, adminId));
  });

  afterAll(async () => {
    await app.close();
  });

  async function start(repo: string, number = 1) {
    return request(app.getHttpServer())
      .post('/time-entries/timer/start-from-github-reference')
      .set('Authorization', bearer(memberToken))
      .send(issue(repo, number));
  }

  async function stop(id: string) {
    return request(app.getHttpServer())
      .post('/time-entries/timer/stop')
      .set('Authorization', bearer(memberToken))
      .send({ expectedTimerId: id });
  }

  async function externalProject(repo: string) {
    const [row] = await db
      .select({ id: projects.id, trackingMode: projects.trackingMode })
      .from(projects)
      .innerJoin(
        projectExternalRefs,
        eq(projectExternalRefs.projectId, projects.id),
      )
      .where(
        and(
          eq(projects.workspaceId, workspaceId),
          eq(projectExternalRefs.externalType, 'repository'),
          eq(projectExternalRefs.externalKey, repo),
        ),
      )
      .limit(1);
    expect(row).toBeDefined();
    return row!;
  }

  it('records an external reference without any provider or installation call, then keeps its identity on repository import', async () => {
    const repo = `QaExternal/${randomUUID().slice(0, 12)}`;
    github.getRepository.mockResolvedValue({ fullName: repo });

    const started = await start(repo);
    expect(started.status).toBe(201);
    expect((await stop(started.body.id)).status).toBe(200);

    expect(github.getRepository).not.toHaveBeenCalled();
    expect(github.resolveImportableProject).not.toHaveBeenCalled();
    expect(installations.prepareIssue).not.toHaveBeenCalled();

    const project = await externalProject(repo);
    expect(project.trackingMode).toBe('external-reference');

    const imported = await request(app.getHttpServer())
      .post('/projects/import/github')
      .set('Authorization', bearer(adminToken))
      .send({ githubRepos: [repo] })
      .expect(200);
    expect(imported.body.results).toEqual([
      expect.objectContaining({
        githubRepo: repo,
        projectId: project.id,
        status: 'already-imported',
      }),
    ]);

    const [storedProject] = await db
      .select({ trackingMode: projects.trackingMode })
      .from(projects)
      .where(eq(projects.id, project.id));
    const [projectRef] = await db
      .select({
        referenceProvenance: projectExternalRefs.referenceProvenance,
        syncedAt: projectExternalRefs.syncedAt,
      })
      .from(projectExternalRefs)
      .where(eq(projectExternalRefs.projectId, project.id));
    const [taskRef] = await db
      .select({
        referenceProvenance: taskExternalRefs.referenceProvenance,
        syncedAt: taskExternalRefs.syncedAt,
      })
      .from(taskExternalRefs)
      .where(eq(taskExternalRefs.workspaceId, workspaceId));

    expect(storedProject).toEqual({ trackingMode: 'external-reference' });
    expect(projectRef).toEqual({
      referenceProvenance: 'user-supplied',
      syncedAt: null,
    });
    expect(taskRef).toEqual({
      referenceProvenance: 'user-supplied',
      syncedAt: null,
    });
    await expect(
      db
        .select()
        .from(projectAssignments)
        .where(eq(projectAssignments.projectId, project.id)),
    ).resolves.toHaveLength(0);
  });

  it('rejects a board import that attempts to take over an inactive external mapping', async () => {
    const repo = `QaBoard/${randomUUID().slice(0, 12)}`;
    const boardId = `PVT_qa_${randomUUID().slice(0, 12)}`;
    github.resolveImportableProject.mockResolvedValue({
      number: 7,
      ownerLogin: 'QaBoard',
      title: 'Controlled board',
      url: 'https://github.com/orgs/QaBoard/projects/7',
    });

    const started = await start(repo);
    expect(started.status).toBe(201);
    expect((await stop(started.body.id)).status).toBe(200);
    const project = await externalProject(repo);
    await db
      .update(projects)
      .set({ isActive: false })
      .where(eq(projects.id, project.id));
    await db.insert(projectExternalRefs).values({
      workspaceId,
      projectId: project.id,
      provider: 'github',
      externalType: 'project',
      externalKey: boardId,
      externalUrl: 'https://github.com/orgs/QaBoard/projects/7',
      referenceProvenance: 'user-supplied',
      syncedAt: null,
    });

    const before = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId));
    const imported = await request(app.getHttpServer())
      .post('/projects/import/github-projects')
      .set('Authorization', bearer(adminToken))
      .send({ githubProjects: [{ githubProjectId: boardId, githubRepos: [] }] })
      .expect(200);

    expect(imported.body.results).toEqual([
      expect.objectContaining({
        githubProjectId: boardId,
        projectId: null,
        status: 'failed',
      }),
    ]);
    expect(imported.body.results[0].message).toContain('external-reference');
    const after = await db
      .select({
        id: projects.id,
        trackingMode: projects.trackingMode,
        isActive: projects.isActive,
      })
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId));
    expect(after).toEqual([
      expect.objectContaining({
        id: project.id,
        trackingMode: 'external-reference',
        isActive: false,
      }),
    ]);
    expect(before).toHaveLength(after.length);
  });

  it('keeps one external identity when an import has verified the repository but has not yet written it', async () => {
    const repo = `QaConcurrent/${randomUUID().slice(0, 12)}`;
    let allowImportWrite!: () => void;
    let markRepositoryRead!: () => void;
    const importMayWrite = new Promise<void>((resolve) => {
      allowImportWrite = resolve;
    });
    const repositoryRead = new Promise<void>((resolve) => {
      markRepositoryRead = resolve;
    });
    github.getRepository.mockImplementation(async () => {
      markRepositoryRead();
      await importMayWrite;
      return { fullName: repo };
    });

    const pendingImport = request(app.getHttpServer())
      .post('/projects/import/github')
      .set('Authorization', bearer(adminToken))
      .send({ githubRepos: [repo] });
    const importResult = pendingImport.then((response) => response);
    await repositoryRead;

    const started = await start(repo, 8);
    expect(started.status).toBe(201);
    expect((await stop(started.body.id)).status).toBe(200);
    allowImportWrite();

    const imported = await importResult;
    expect(imported.status).toBe(200);
    expect(imported.body.results).toEqual([
      expect.objectContaining({
        githubRepo: repo,
        status: 'already-imported',
      }),
    ]);
    const project = await externalProject(repo);
    expect(project.trackingMode).toBe('external-reference');
    await expect(
      db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.workspaceId, workspaceId)),
    ).resolves.toHaveLength(1);
    expect(installations.prepareIssue).not.toHaveBeenCalled();
  });

  it.each([
    {
      expectedStatus: 403,
      name: 'assignment is removed',
      removeAccess: async (projectId: string) =>
        db
          .delete(projectAssignments)
          .where(
            and(
              eq(projectAssignments.workspaceId, workspaceId),
              eq(projectAssignments.projectId, projectId),
              eq(projectAssignments.userId, memberId),
            ),
          ),
    },
    {
      expectedStatus: 401,
      name: 'membership is removed',
      removeAccess: async () =>
        db
          .delete(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.workspaceId, workspaceId),
              eq(workspaceMembers.userId, memberId),
            ),
          ),
    },
  ])(
    'does not write a managed timer when $name after provider verification',
    async ({ removeAccess, expectedStatus }) => {
      const repo = `QaRevoked/${randomUUID().slice(0, 12)}`;
      const [project] = await db
        .insert(projects)
        .values({
          workspaceId,
          name: `Managed ${repo}`,
          visibility: 'private',
        })
        .returning({ id: projects.id });
      if (!project) throw new Error('Expected managed project');
      await db.insert(projectExternalRefs).values({
        workspaceId,
        projectId: project.id,
        provider: 'github',
        externalType: 'repository',
        externalKey: repo,
        externalUrl: `https://github.com/${repo}`,
        referenceProvenance: 'provider-verified',
        syncedAt: new Date(),
      });
      await db.insert(projectAssignments).values({
        workspaceId,
        projectId: project.id,
        userId: memberId,
        assignedBy: adminId,
      });

      let releaseProvider!: () => void;
      let markProviderReached!: () => void;
      const providerReleased = new Promise<void>((resolve) => {
        releaseProvider = resolve;
      });
      const providerReached = new Promise<void>((resolve) => {
        markProviderReached = resolve;
      });
      installations.prepareIssue.mockImplementationOnce(
        async (
          _user: unknown,
          owner: string,
          repository: string,
          number: number,
        ) => {
          markProviderReached();
          await providerReleased;
          return {
            associationId: 'controlled-installation',
            authorizationVersion: 1,
            organizationLogin: owner,
            repository: {
              fullName: `${owner}/${repository}`,
              id: `repo-${owner}-${repository}`,
              name: repository,
              owner,
            },
            issue: {
              id: `issue-${owner}-${repository}-${number}`,
              number,
              title: `Verified issue ${number}`,
            },
          } as VerifiedInstallationIssue;
        },
      );

      const requestPromise = request(app.getHttpServer())
        .post('/time-entries/timer/start-from-github-reference')
        .set('Authorization', bearer(memberToken))
        .send(issue(repo, 55))
        .then((response) => response);
      await providerReached;
      await removeAccess(project.id);
      releaseProvider();

      const response = await requestPromise;
      expect(response.status).toBe(expectedStatus);
      if (expectedStatus === 403) {
        expect(response.body.code).toBe('project_assignment_required');
      }
      await expect(
        db
          .select({ id: timeEntries.id })
          .from(timeEntries)
          .where(eq(timeEntries.workspaceId, workspaceId)),
      ).resolves.toHaveLength(0);
      await expect(
        db
          .select({ id: tasks.id })
          .from(tasks)
          .where(eq(tasks.workspaceId, workspaceId)),
      ).resolves.toHaveLength(0);
    },
  );
});

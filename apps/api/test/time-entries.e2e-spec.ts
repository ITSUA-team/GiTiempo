import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, like, or } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  projectAssignments,
  projectExternalRefs,
  projects,
  taskExternalRefs,
  tasks,
  timeEntries,
  users,
  workspaces,
} from '../src/db/schema';
import { bearer, login } from './helpers/auth';

describe('Time entries (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let adminToken: string;
  let memberToken: string;
  let otherMemberToken: string;
  let workspaceId: string;
  let platformProjectId: string;
  let platformTaskId: string;
  let memberUserId: string;
  let otherMemberUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<DrizzleDB>(DRIZZLE);
    await cleanupGitHubFixtures();

    const [workspace] = await db.select().from(workspaces).limit(1);
    if (!workspace) throw new Error('Expected seeded workspace');
    workspaceId = workspace.id;

    const [platformProject] = await db
      .select()
      .from(projects)
      .where(eq(projects.name, 'Internal Platform'))
      .limit(1);
    if (!platformProject) throw new Error('Expected seeded platform project');
    platformProjectId = platformProject.id;

    const [platformTask] = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, workspaceId),
          eq(tasks.projectId, platformProjectId),
          eq(tasks.title, 'Set up API project foundation'),
        ),
      )
      .limit(1);
    if (!platformTask) throw new Error('Expected seeded platform task');
    platformTaskId = platformTask.id;

    const [member] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.firebaseUid, 'seed-user-2'))
      .limit(1);
    const [otherMember] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.firebaseUid, 'seed-user-3'))
      .limit(1);
    if (!member || !otherMember) throw new Error('Expected seeded members');
    memberUserId = member.id;
    otherMemberUserId = otherMember.id;

    adminToken = (await login(app)).accessToken;
    memberToken = (await login(app, 'test:seed-user-2:bob@gitiempo.dev:Bob'))
      .accessToken;
    otherMemberToken = (
      await login(app, 'test:seed-user-3:carol@gitiempo.dev:Carol')
    ).accessToken;
  });

  afterEach(async () => {
    await db
      .delete(timeEntries)
      .where(eq(timeEntries.workspaceId, workspaceId));
    await cleanupGitHubFixtures();
  });

  async function cleanupGitHubFixtures(): Promise<void> {
    await db
      .delete(taskExternalRefs)
      .where(like(taskExternalRefs.externalKey, 'gitiempo-test/%'));
    await db
      .delete(projectExternalRefs)
      .where(like(projectExternalRefs.externalKey, 'gitiempo-test/%'));
    await db
      .delete(tasks)
      .where(
        or(
          eq(tasks.title, 'Chrome extension issue'),
          eq(tasks.title, 'Other project issue'),
          like(tasks.title, 'Search task search %'),
        ),
      );
    await db
      .delete(projects)
      .where(like(projects.name, 'Search task search %'));
    await db.delete(projects).where(like(projects.name, 'gitiempo-test/%'));
    await db.delete(projects).where(like(projects.name, 'Other %'));
    await db.delete(workspaces).where(like(workspaces.name, 'Foreign %'));
  }

  afterAll(async () => {
    await app.close();
  });

  it('creates manual entries and lists own entries with filters', async () => {
    const first = await createManualEntry(memberToken, {
      startedAt: '2026-05-01T10:00:00.000Z',
      endedAt: '2026-05-01T10:30:00.000Z',
      description: 'Focused work',
      isBillable: false,
    });
    await createManualEntry(memberToken, {
      startedAt: '2026-05-02T10:00:00.000Z',
      endedAt: '2026-05-02T10:30:00.000Z',
    });

    expect(first.status).toBe(201);
    expect(first.body.source).toBe('manual');
    expect(first.body.durationSeconds).toBe(1800);
    expect(first.body.isBillable).toBe(false);

    const list = await request(app.getHttpServer())
      .get('/time-entries')
      .query({
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-05-02T00:00:00.000Z',
        projectId: platformProjectId,
        taskId: platformTaskId,
        page: 1,
        limit: 10,
      })
      .set('Authorization', bearer(memberToken));

    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].id).toBe(first.body.id);
    expect(list.body.meta.total).toBe(1);
  });

  it('searches own entries by task title with filters and pagination', async () => {
    const suffix = randomUUID().slice(0, 8);
    const [otherProject] = await db
      .insert(projects)
      .values({
        workspaceId,
        name: `Search task search project ${suffix}`,
        visibility: 'public',
      })
      .returning({ id: projects.id });
    if (!otherProject) throw new Error('Expected search project');

    const deployTaskId = await createTask(
      platformProjectId,
      `Search task search Deploy Pipeline ${suffix}`,
    );
    const docsTaskId = await createTask(
      platformProjectId,
      `Search task search Docs Cleanup ${suffix}`,
    );
    const otherProjectTaskId = await createTask(
      otherProject.id,
      `Search task search Deploy Archive ${suffix}`,
    );

    const deployEntryId = await createStoredEntry(
      memberUserId,
      deployTaskId,
      '2026-05-01T10:00:00.000Z',
      '2026-05-01T10:30:00.000Z',
    );
    await createStoredEntry(
      memberUserId,
      docsTaskId,
      '2026-05-02T10:00:00.000Z',
      '2026-05-02T10:30:00.000Z',
    );
    await createStoredEntry(
      memberUserId,
      otherProjectTaskId,
      '2026-05-03T10:00:00.000Z',
      '2026-05-03T10:30:00.000Z',
    );
    await createStoredEntry(
      otherMemberUserId,
      deployTaskId,
      '2026-05-04T10:00:00.000Z',
      '2026-05-04T10:30:00.000Z',
    );

    const partial = await request(app.getHttpServer())
      .get('/time-entries')
      .query({ search: 'Deploy', page: 1, limit: 10 })
      .set('Authorization', bearer(memberToken));
    expect(partial.status).toBe(200);
    expect(partial.body.items).toHaveLength(2);
    expect(partial.body.meta.total).toBe(2);
    expect(
      partial.body.items.map(
        (item: { task: { title: string } }) => item.task.title,
      ),
    ).toEqual(
      expect.arrayContaining([
        `Search task search Deploy Pipeline ${suffix}`,
        `Search task search Deploy Archive ${suffix}`,
      ]),
    );

    const caseInsensitive = await request(app.getHttpServer())
      .get('/time-entries')
      .query({ search: 'dEpLoY', page: 1, limit: 10 })
      .set('Authorization', bearer(memberToken));
    expect(caseInsensitive.status).toBe(200);
    expect(caseInsensitive.body.meta.total).toBe(2);

    const noMatch = await request(app.getHttpServer())
      .get('/time-entries')
      .query({ search: `Missing ${suffix}`, page: 1, limit: 10 })
      .set('Authorization', bearer(memberToken));
    expect(noMatch.status).toBe(200);
    expect(noMatch.body.items).toHaveLength(0);
    expect(noMatch.body.meta.total).toBe(0);
    expect(noMatch.body.meta.totalPages).toBe(0);

    const composed = await request(app.getHttpServer())
      .get('/time-entries')
      .query({
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-05-02T00:00:00.000Z',
        projectId: platformProjectId,
        search: 'deploy',
        page: 1,
        limit: 10,
      })
      .set('Authorization', bearer(memberToken));
    expect(composed.status).toBe(200);
    expect(composed.body.items).toHaveLength(1);
    expect(composed.body.items[0].id).toBe(deployEntryId);
    expect(composed.body.meta.total).toBe(1);

    const paginated = await request(app.getHttpServer())
      .get('/time-entries')
      .query({ search: 'deploy', page: 1, limit: 1 })
      .set('Authorization', bearer(memberToken));
    expect(paginated.status).toBe(200);
    expect(paginated.body.items).toHaveLength(1);
    expect(paginated.body.meta.total).toBe(2);
    expect(paginated.body.meta.totalPages).toBe(2);
  });

  it('allows own completed entry get/update/delete and hides other users entries', async () => {
    const created = await createManualEntry(memberToken, {
      startedAt: '2026-05-01T10:00:00.000Z',
      endedAt: '2026-05-01T11:00:00.000Z',
    });
    expect(created.status).toBe(201);

    const hidden = await request(app.getHttpServer())
      .get(`/time-entries/${created.body.id}`)
      .set('Authorization', bearer(otherMemberToken));
    expect(hidden.status).toBe(404);

    const own = await request(app.getHttpServer())
      .get(`/time-entries/${created.body.id}`)
      .set('Authorization', bearer(memberToken));
    expect(own.status).toBe(200);

    const updated = await request(app.getHttpServer())
      .patch(`/time-entries/${created.body.id}`)
      .set('Authorization', bearer(memberToken))
      .send({
        description: 'Updated note',
        endedAt: '2026-05-01T11:30:00.000Z',
        isBillable: true,
      });
    expect(updated.status).toBe(200);
    expect(updated.body.description).toBe('Updated note');
    expect(updated.body.durationSeconds).toBe(5400);

    const deleted = await request(app.getHttpServer())
      .delete(`/time-entries/${created.body.id}`)
      .set('Authorization', bearer(memberToken));
    expect(deleted.status).toBe(204);

    const afterDelete = await request(app.getHttpServer())
      .get(`/time-entries/${created.body.id}`)
      .set('Authorization', bearer(memberToken));
    expect(afterDelete.status).toBe(404);
  });

  it('allows moving a completed entry to another visible active task', async () => {
    const suffix = randomUUID().slice(0, 8);
    const nextTaskId = await createTask(
      platformProjectId,
      `Search task search Move Entry ${suffix}`,
    );
    const created = await createManualEntry(memberToken, {
      startedAt: '2026-05-01T10:00:00.000Z',
      endedAt: '2026-05-01T11:00:00.000Z',
    });
    expect(created.status).toBe(201);

    const updated = await request(app.getHttpServer())
      .patch(`/time-entries/${created.body.id}`)
      .set('Authorization', bearer(memberToken))
      .send({ taskId: nextTaskId });

    expect(updated.status).toBe(200);
    expect(updated.body.taskId).toBe(nextTaskId);
    expect(updated.body.task.title).toBe(
      `Search task search Move Entry ${suffix}`,
    );
    expect(updated.body.projectId).toBe(platformProjectId);
    expect(updated.body.durationSeconds).toBe(3600);
  });

  it('rejects moving a completed entry to an invisible private task', async () => {
    const suffix = randomUUID().slice(0, 8);
    const [privateProject] = await db
      .insert(projects)
      .values({
        workspaceId,
        name: `Other Private ${suffix}`,
        visibility: 'private',
      })
      .returning({ id: projects.id });
    if (!privateProject) throw new Error('Expected private project');

    const hiddenTaskId = await createTask(
      privateProject.id,
      `Search task search Hidden Move ${suffix}`,
    );
    const created = await createManualEntry(memberToken, {
      startedAt: '2026-05-01T10:00:00.000Z',
      endedAt: '2026-05-01T11:00:00.000Z',
    });
    expect(created.status).toBe(201);

    const updated = await request(app.getHttpServer())
      .patch(`/time-entries/${created.body.id}`)
      .set('Authorization', bearer(memberToken))
      .send({ taskId: hiddenTaskId });

    expect(updated.status).toBe(404);

    const own = await request(app.getHttpServer())
      .get(`/time-entries/${created.body.id}`)
      .set('Authorization', bearer(memberToken));
    expect(own.status).toBe(200);
    expect(own.body.taskId).toBe(platformTaskId);
  });

  it('rejects moving a completed entry to inactive work', async () => {
    const suffix = randomUUID().slice(0, 8);
    const inactiveTaskId = await createTask(
      platformProjectId,
      `Search task search Inactive Move ${suffix}`,
    );
    await db
      .update(tasks)
      .set({ isActive: false })
      .where(eq(tasks.id, inactiveTaskId));

    const created = await createManualEntry(memberToken, {
      startedAt: '2026-05-01T10:00:00.000Z',
      endedAt: '2026-05-01T11:00:00.000Z',
    });
    expect(created.status).toBe(201);

    const updated = await request(app.getHttpServer())
      .patch(`/time-entries/${created.body.id}`)
      .set('Authorization', bearer(memberToken))
      .send({ taskId: inactiveTaskId });

    expect(updated.status).toBe(422);

    const own = await request(app.getHttpServer())
      .get(`/time-entries/${created.body.id}`)
      .set('Authorization', bearer(memberToken));
    expect(own.status).toBe(200);
    expect(own.body.taskId).toBe(platformTaskId);
  });

  it('supports current timer, start conflict, and stop lifecycle', async () => {
    const emptyCurrent = await request(app.getHttpServer())
      .get('/time-entries/current')
      .set('Authorization', bearer(memberToken));
    expect(emptyCurrent.status).toBe(200);
    expect(emptyCurrent.body.timeEntry).toBeNull();

    const started = await request(app.getHttpServer())
      .post('/time-entries/timer/start')
      .set('Authorization', bearer(memberToken))
      .send({ taskId: platformTaskId });
    expect(started.status).toBe(201);
    expect(started.body.source).toBe('web');
    expect(started.body.endedAt).toBeNull();

    const current = await request(app.getHttpServer())
      .get('/time-entries/current')
      .set('Authorization', bearer(memberToken));
    expect(current.status).toBe(200);
    expect(current.body.timeEntry.id).toBe(started.body.id);
    expect(current.body.timeEntry.githubIssue).toBeNull();

    const conflict = await request(app.getHttpServer())
      .post('/time-entries/timer/start')
      .set('Authorization', bearer(memberToken))
      .send({ taskId: platformTaskId });
    expect(conflict.status).toBe(409);

    const stopped = await request(app.getHttpServer())
      .post('/time-entries/timer/stop')
      .set('Authorization', bearer(memberToken));
    expect(stopped.status).toBe(200);
    expect(stopped.body.endedAt).toBeTruthy();
    expect(stopped.body.durationSeconds).toBeGreaterThan(0);

    const stopAgain = await request(app.getHttpServer())
      .post('/time-entries/timer/stop')
      .set('Authorization', bearer(memberToken));
    expect(stopAgain.status).toBe(404);
  });

  it('rejects update and delete for running entries before stop', async () => {
    const started = await request(app.getHttpServer())
      .post('/time-entries/timer/start')
      .set('Authorization', bearer(memberToken))
      .send({ taskId: platformTaskId });
    expect(started.status).toBe(201);

    const update = await request(app.getHttpServer())
      .patch(`/time-entries/${started.body.id}`)
      .set('Authorization', bearer(memberToken))
      .send({ description: 'Nope' });
    expect(update.status).toBe(409);

    const remove = await request(app.getHttpServer())
      .delete(`/time-entries/${started.body.id}`)
      .set('Authorization', bearer(memberToken));
    expect(remove.status).toBe(409);
  });

  it('lists visible project time entries as read-only team data', async () => {
    const created = await createManualEntry(memberToken, {
      startedAt: '2026-05-01T10:00:00.000Z',
      endedAt: '2026-05-01T11:00:00.000Z',
    });
    expect(created.status).toBe(201);

    const suffix = randomUUID().slice(0, 8);
    const visibleTaskId = await createTask(
      platformProjectId,
      `Search task search Team Visible ${suffix}`,
    );
    const hiddenTaskId = await createTask(
      platformProjectId,
      `Search task search Team Hidden ${suffix}`,
    );
    const visibleEntryId = await createStoredEntry(
      memberUserId,
      visibleTaskId,
      '2026-05-03T10:00:00.000Z',
      '2026-05-03T10:30:00.000Z',
    );
    await createStoredEntry(
      memberUserId,
      hiddenTaskId,
      '2026-05-04T10:00:00.000Z',
      '2026-05-04T10:30:00.000Z',
    );

    const adminList = await request(app.getHttpServer())
      .get(`/projects/${platformProjectId}/time-entries`)
      .set('Authorization', bearer(adminToken));
    expect(adminList.status).toBe(200);
    expect(
      adminList.body.items.map((item: { id: string }) => item.id),
    ).toContain(created.body.id);

    const assignedList = await request(app.getHttpServer())
      .get(`/projects/${platformProjectId}/time-entries`)
      .set('Authorization', bearer(memberToken));
    expect(assignedList.status).toBe(200);
    expect(
      assignedList.body.items.map((item: { id: string }) => item.id),
    ).toContain(created.body.id);

    const searchedList = await request(app.getHttpServer())
      .get(`/projects/${platformProjectId}/time-entries`)
      .query({ search: 'visible' })
      .set('Authorization', bearer(memberToken));
    expect(searchedList.status).toBe(200);
    expect(searchedList.body.items).toHaveLength(1);
    expect(searchedList.body.items[0].id).toBe(visibleEntryId);

    const unassignedList = await request(app.getHttpServer())
      .get(`/projects/${platformProjectId}/time-entries`)
      .query({ search: 'visible' })
      .set('Authorization', bearer(otherMemberToken));
    expect(unassignedList.status).toBe(404);
  });

  it('returns project total hours from completed entries only', async () => {
    const created = await createManualEntry(memberToken, {
      startedAt: '2026-05-01T10:00:00.000Z',
      endedAt: '2026-05-01T11:00:00.000Z',
    });
    expect(created.status).toBe(201);

    const running = await request(app.getHttpServer())
      .post('/time-entries/timer/start')
      .set('Authorization', bearer(memberToken))
      .send({ taskId: platformTaskId });
    expect(running.status).toBe(201);

    const project = await request(app.getHttpServer())
      .get(`/projects/${platformProjectId}`)
      .set('Authorization', bearer(memberToken));
    expect(project.status).toBe(200);
    expect(project.body.totalHours).toBe(1);
  });

  it('returns current user project summary with calendar tracked hours', async () => {
    const now = new Date();
    const startedAt = new Date(now.getTime() - 1000);
    const endedAt = new Date(now.getTime() + 1000);
    const created = await createManualEntry(memberToken, {
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
    });
    expect(created.status).toBe(201);

    const summary = await request(app.getHttpServer())
      .get('/projects/my-summary')
      .set('Authorization', bearer(memberToken));
    expect(summary.status).toBe(200);
    expect(summary.body.visibleProjects).toBeGreaterThanOrEqual(1);
    expect(summary.body.trackedHoursWeek).toBeGreaterThan(0);
    expect(summary.body.trackedHoursMonth).toBeGreaterThan(0);
  });

  it('starts timer from GitHub issue data and creates provider refs', async () => {
    const suffix = randomUUID().slice(0, 8);
    const githubRepo = `gitiempo-test/repo-${suffix}`;
    const issueNumber = 123;

    const started = await request(app.getHttpServer())
      .post('/time-entries/timer/start-from-github')
      .set('Authorization', bearer(otherMemberToken))
      .send({
        githubRepo,
        issueNumber,
        issueTitle: 'Chrome extension issue',
      });
    expect(started.status).toBe(201);
    expect(started.body.source).toBe('extension');
    expect(started.body.project.name).toBe(githubRepo);
    expect(started.body.task.title).toBe('Chrome extension issue');
    expect(started.body.githubIssue).toEqual({ githubRepo, issueNumber });

    const current = await request(app.getHttpServer())
      .get('/time-entries/current')
      .set('Authorization', bearer(otherMemberToken));
    expect(current.status).toBe(200);
    expect(current.body.timeEntry.githubIssue).toEqual({
      githubRepo,
      issueNumber,
    });

    const [projectRef] = await db
      .select()
      .from(projectExternalRefs)
      .where(
        and(
          eq(projectExternalRefs.workspaceId, workspaceId),
          eq(projectExternalRefs.provider, 'github'),
          eq(projectExternalRefs.externalType, 'repository'),
          eq(projectExternalRefs.externalKey, githubRepo),
        ),
      )
      .limit(1);
    expect(projectRef?.projectId).toBe(started.body.projectId);

    const project = await request(app.getHttpServer())
      .get(`/projects/${started.body.projectId}`)
      .set('Authorization', bearer(otherMemberToken));
    expect(project.status).toBe(200);
    expect(project.body.source).toBe('github');
    expect(project.body.visibility).toBe('private');
    expect(project.body.totalHours).toBe(0);

    const [taskRef] = await db
      .select()
      .from(taskExternalRefs)
      .where(
        and(
          eq(taskExternalRefs.workspaceId, workspaceId),
          eq(taskExternalRefs.provider, 'github'),
          eq(taskExternalRefs.externalType, 'issue'),
          eq(taskExternalRefs.externalKey, `${githubRepo}#${issueNumber}`),
        ),
      )
      .limit(1);
    expect(taskRef?.taskId).toBe(started.body.taskId);

    const [assignment] = await db
      .select()
      .from(projectAssignments)
      .where(
        and(
          eq(projectAssignments.projectId, started.body.projectId),
          eq(projectAssignments.userId, otherMemberUserId),
        ),
      )
      .limit(1);
    expect(assignment?.userId).toBe(otherMemberUserId);
  });

  it('does not grant project visibility through existing GitHub refs', async () => {
    const suffix = randomUUID().slice(0, 8);
    const githubRepo = `gitiempo-test/existing-${suffix}`;
    const issueNumber = 321;

    await createGitHubRefs(githubRepo, issueNumber, platformTaskId);

    const started = await request(app.getHttpServer())
      .post('/time-entries/timer/start-from-github')
      .set('Authorization', bearer(otherMemberToken))
      .send({
        githubRepo,
        issueNumber,
        issueTitle: 'Existing private issue',
      });
    expect(started.status).toBe(404);

    const [assignment] = await db
      .select()
      .from(projectAssignments)
      .where(
        and(
          eq(projectAssignments.projectId, platformProjectId),
          eq(projectAssignments.userId, otherMemberUserId),
        ),
      )
      .limit(1);
    expect(assignment).toBeUndefined();
  });

  it('allows assigned users to reuse existing GitHub refs', async () => {
    const suffix = randomUUID().slice(0, 8);
    const githubRepo = `gitiempo-test/assigned-${suffix}`;
    const issueNumber = 654;

    await createGitHubRefs(githubRepo, issueNumber, platformTaskId);

    const started = await request(app.getHttpServer())
      .post('/time-entries/timer/start-from-github')
      .set('Authorization', bearer(memberToken))
      .send({
        githubRepo,
        issueNumber,
        issueTitle: 'Assigned issue',
      });
    expect(started.status).toBe(201);
    expect(started.body.projectId).toBe(platformProjectId);
    expect(started.body.taskId).toBe(platformTaskId);

    const assignments = await db
      .select()
      .from(projectAssignments)
      .where(
        and(
          eq(projectAssignments.projectId, platformProjectId),
          eq(projectAssignments.userId, memberUserId),
        ),
      );
    expect(assignments).toHaveLength(1);
  });

  it('rejects GitHub refs that point outside the current workspace', async () => {
    const suffix = randomUUID().slice(0, 8);
    const githubRepo = `gitiempo-test/mismatched-${suffix}`;
    const issueNumber = 987;
    const [foreignWorkspace] = await db
      .insert(workspaces)
      .values({ name: `Foreign ${suffix}` })
      .returning();
    if (!foreignWorkspace) throw new Error('Expected foreign workspace');

    const [foreignProject] = await db
      .insert(projects)
      .values({ workspaceId: foreignWorkspace.id, name: githubRepo })
      .returning();
    if (!foreignProject) throw new Error('Expected foreign project');

    await db.insert(projectExternalRefs).values({
      workspaceId,
      projectId: foreignProject.id,
      provider: 'github',
      externalType: 'repository',
      externalKey: githubRepo,
      externalUrl: `https://github.com/${githubRepo}`,
      metadata: { githubRepo },
      syncedAt: new Date(),
    });

    const started = await request(app.getHttpServer())
      .post('/time-entries/timer/start-from-github')
      .set('Authorization', bearer(adminToken))
      .send({
        githubRepo,
        issueNumber,
        issueTitle: 'Mismatched issue',
      });
    expect(started.status).toBe(404);
  });

  it('rejects GitHub issue refs outside the matched project', async () => {
    const suffix = randomUUID().slice(0, 8);
    const githubRepo = `gitiempo-test/wrong-project-${suffix}`;
    const issueNumber = 753;
    const [otherProject] = await db
      .insert(projects)
      .values({ workspaceId, name: `Other ${suffix}` })
      .returning();
    if (!otherProject) throw new Error('Expected other project');

    const [otherTask] = await db
      .insert(tasks)
      .values({
        workspaceId,
        projectId: otherProject.id,
        title: 'Other project issue',
      })
      .returning();
    if (!otherTask) throw new Error('Expected other task');

    await db.insert(projectExternalRefs).values({
      workspaceId,
      projectId: platformProjectId,
      provider: 'github',
      externalType: 'repository',
      externalKey: githubRepo,
      externalUrl: `https://github.com/${githubRepo}`,
      metadata: { githubRepo },
      syncedAt: new Date(),
    });

    await db.insert(taskExternalRefs).values({
      workspaceId,
      projectId: otherProject.id,
      taskId: otherTask.id,
      provider: 'github',
      externalType: 'issue',
      externalKey: `${githubRepo}#${issueNumber}`,
      externalUrl: `https://github.com/${githubRepo}/issues/${issueNumber}`,
      metadata: { githubRepo, issueNumber },
      syncedAt: new Date(),
    });

    const started = await request(app.getHttpServer())
      .post('/time-entries/timer/start-from-github')
      .set('Authorization', bearer(adminToken))
      .send({
        githubRepo,
        issueNumber,
        issueTitle: 'Wrong project issue',
      });
    expect(started.status).toBe(404);
  });

  async function createManualEntry(
    token: string,
    overrides: {
      startedAt: string;
      endedAt: string;
      description?: string;
      isBillable?: boolean;
    },
  ) {
    return request(app.getHttpServer())
      .post('/time-entries')
      .set('Authorization', bearer(token))
      .send({
        taskId: platformTaskId,
        ...overrides,
      });
  }

  async function createTask(projectId: string, title: string): Promise<string> {
    const [task] = await db
      .insert(tasks)
      .values({ workspaceId, projectId, title })
      .returning({ id: tasks.id });
    if (!task) throw new Error('Expected created task');
    return task.id;
  }

  async function createStoredEntry(
    userId: string,
    taskId: string,
    startedAtValue: string,
    endedAtValue: string,
  ): Promise<string> {
    const startedAt = new Date(startedAtValue);
    const endedAt = new Date(endedAtValue);
    const durationSeconds = Math.floor(
      (endedAt.getTime() - startedAt.getTime()) / 1000,
    );
    const [entry] = await db
      .insert(timeEntries)
      .values({
        workspaceId,
        taskId,
        userId,
        startedAt,
        endedAt,
        durationSeconds,
        source: 'manual',
      })
      .returning({ id: timeEntries.id });
    if (!entry) throw new Error('Expected created time entry');
    return entry.id;
  }

  async function createGitHubRefs(
    githubRepo: string,
    issueNumber: number,
    taskId: string,
  ): Promise<void> {
    const issueKey = `${githubRepo}#${issueNumber}`;

    await db.insert(projectExternalRefs).values({
      workspaceId,
      projectId: platformProjectId,
      provider: 'github',
      externalType: 'repository',
      externalKey: githubRepo,
      externalUrl: `https://github.com/${githubRepo}`,
      metadata: { githubRepo },
      syncedAt: new Date(),
    });

    await db.insert(taskExternalRefs).values({
      workspaceId,
      projectId: platformProjectId,
      taskId,
      provider: 'github',
      externalType: 'issue',
      externalKey: issueKey,
      externalUrl: `https://github.com/${githubRepo}/issues/${issueNumber}`,
      metadata: { githubRepo, issueNumber },
      syncedAt: new Date(),
    });
  }
});

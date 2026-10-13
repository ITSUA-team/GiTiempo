import { randomUUID } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
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
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  projectExternalRefs,
  projects,
  taskExternalRefs,
  tasks,
  timeEntries,
  users,
  workspaces,
  workspaceMembers,
} from '../src/db/schema';
import { GithubInstallationsService } from '../src/github/services/github-installations.service';
import { bearer, login } from './helpers/auth';

describe('External GitHub extension tracking (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let workspaceId: string;
  let memberId: string;
  let memberUid: string;
  let memberEmail: string;
  let peerId: string;
  let memberToken: string;
  let peerToken: string;
  const installations = {
    prepareIssue: vi.fn(async () => {
      throw new NotFoundException('Managed GitHub access denied');
    }),
  };

  const repo = `ExternalE2E/${randomUUID().slice(0, 12)}`;
  const issue = (issueNumber: number) => ({
    githubRepo: repo,
    issueNumber,
    issueTitle: `External issue ${issueNumber}`,
    issueUrl: `https://github.com/${repo}/issues/${issueNumber}`,
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GithubInstallationsService)
      .useValue(installations)
      .compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(DRIZZLE);
  });

  beforeEach(async () => {
    installations.prepareIssue.mockClear();
    const [workspace] = await db
      .insert(workspaces)
      .values({ name: `External e2e ${randomUUID()}` })
      .returning();
    workspaceId = workspace!.id;

    const createMember = async (label: string) => {
      const uid = `external-e2e-${randomUUID()}`;
      const email = `${uid}@example.test`;
      const [user] = await db
        .insert(users)
        .values({ firebaseUid: uid, email, displayName: label })
        .returning();
      await db
        .insert(workspaceMembers)
        .values({ workspaceId, userId: user!.id, role: 'member' });
      const token = (await login(app, `test:${uid}:${email}:${label}`))
        .accessToken;
      return { id: user!.id, uid, email, token };
    };

    const member = await createMember('External member');
    const peer = await createMember('External peer');
    memberId = member.id;
    memberUid = member.uid;
    memberEmail = member.email;
    peerId = peer.id;
    memberToken = member.token;
    peerToken = peer.token;
  });

  afterEach(async () => {
    await db
      .delete(timeEntries)
      .where(eq(timeEntries.workspaceId, workspaceId));
    await db.delete(tasks).where(eq(tasks.workspaceId, workspaceId));
    await db.delete(projects).where(eq(projects.workspaceId, workspaceId));
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    await db.delete(users).where(eq(users.id, memberId));
    await db.delete(users).where(eq(users.id, peerId));
  });

  afterAll(async () => {
    await app.close();
  });

  async function start(token: string, issueNumber = 41) {
    return request(app.getHttpServer())
      .post('/time-entries/timer/start-from-github-reference')
      .set('Authorization', bearer(token))
      .send(issue(issueNumber));
  }

  async function stop(token: string, expectedTimerId: string) {
    return request(app.getHttpServer())
      .post('/time-entries/timer/stop')
      .set('Authorization', bearer(token))
      .send({ expectedTimerId });
  }

  it('reuses an external task while exposing only each member’s own time and denying shared mutations', async () => {
    const first = await start(memberToken);
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ source: 'extension', isBillable: true });
    await expect(stop(memberToken, first.body.id)).resolves.toMatchObject({
      status: 200,
    });

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId));
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.workspaceId, workspaceId));
    expect(project).toMatchObject({
      visibility: 'private',
      trackingMode: 'external-reference',
    });
    expect(task).toBeDefined();
    const [projectRef] = await db
      .select()
      .from(projectExternalRefs)
      .where(eq(projectExternalRefs.projectId, project!.id));
    const [taskRef] = await db
      .select()
      .from(taskExternalRefs)
      .where(eq(taskExternalRefs.taskId, task!.id));
    expect(projectRef).toMatchObject({
      referenceProvenance: 'user-supplied',
      syncedAt: null,
    });
    expect(taskRef).toMatchObject({
      referenceProvenance: 'user-supplied',
      syncedAt: null,
    });

    const peerStart = await start(peerToken);
    expect(peerStart.status).toBe(201);
    expect(peerStart.body.taskId).toBe(task!.id);
    await stop(peerToken, peerStart.body.id);

    const ownProject = await request(app.getHttpServer())
      .get(`/projects/${project!.id}`)
      .set('Authorization', bearer(memberToken));
    expect(ownProject.status).toBe(200);
    expect(ownProject.body).toMatchObject({
      accessScope: 'own-time',
      capabilities: { canManageTasks: false },
      members: [],
      assignedMembersSummary: null,
    });
    expect(ownProject.body.trackedSummary.totalSeconds).toBeGreaterThan(0);

    const ownEntries = await request(app.getHttpServer())
      .get(`/projects/${project!.id}/time-entries`)
      .set('Authorization', bearer(memberToken));
    expect(ownEntries.status).toBe(200);
    expect(ownEntries.body.items).toHaveLength(1);
    expect(ownEntries.body.items[0].userId).toBe(memberId);
    await request(app.getHttpServer())
      .get('/projects/my-summary')
      .set('Authorization', bearer(memberToken))
      .expect(200)
      .expect(({ body }) => expect(body.visibleProjects).toBe(1));

    const peerOnlyStart = await start(peerToken, 43);
    expect(peerOnlyStart.status).toBe(201);
    await stop(peerToken, peerOnlyStart.body.id);
    const [peerOnlyTask] = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, workspaceId),
          eq(tasks.title, 'External issue 43'),
        ),
      );
    await request(app.getHttpServer())
      .get(`/tasks/${peerOnlyTask!.id}`)
      .set('Authorization', bearer(memberToken))
      .expect(404);
    const ownTasks = await request(app.getHttpServer())
      .get(`/projects/${project!.id}/tasks`)
      .set('Authorization', bearer(memberToken));
    expect(ownTasks.status).toBe(200);
    expect(ownTasks.body).toHaveLength(1);
    expect(ownTasks.body[0].id).toBe(task!.id);

    const peerTask = await request(app.getHttpServer())
      .get(`/tasks/${task!.id}`)
      .set('Authorization', bearer(peerToken));
    expect(peerTask.status).toBe(200);
    const mutate = await request(app.getHttpServer())
      .patch(`/tasks/${task!.id}`)
      .set('Authorization', bearer(memberToken))
      .send({ title: 'must not change' });
    expect(mutate.status).toBe(404);
    expect(
      await request(app.getHttpServer())
        .post(`/tasks/${task!.id}/billable-default/backfill`)
        .set('Authorization', bearer(memberToken))
        .send({ updateTimeEntries: true }),
    ).toMatchObject({ status: 404 });
    expect(
      await request(app.getHttpServer())
        .post(`/projects/${project!.id}/tasks`)
        .set('Authorization', bearer(memberToken))
        .send({ title: 'must not create' }),
    ).toMatchObject({ status: 404 });

    const memberEntry = await db
      .select({ id: timeEntries.id })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.workspaceId, workspaceId),
          eq(timeEntries.userId, memberId),
        ),
      )
      .limit(1);
    await request(app.getHttpServer())
      .delete(`/time-entries/${memberEntry[0]!.id}`)
      .set('Authorization', bearer(memberToken))
      .expect(204);
    await request(app.getHttpServer())
      .get(`/projects/${project!.id}`)
      .set('Authorization', bearer(memberToken))
      .expect(404);
    await request(app.getHttpServer())
      .get(`/projects/${project!.id}`)
      .set('Authorization', bearer(peerToken))
      .expect(200);
  });

  it('never falls back to external materialization for existing managed mappings and rejects legacy access to external mappings', async () => {
    const external = await start(memberToken, 42);
    expect(external.status).toBe(201);
    await stop(memberToken, external.body.id);
    const legacy = await request(app.getHttpServer())
      .post('/time-entries/timer/start-from-github')
      .set('Authorization', bearer(memberToken))
      .send({ githubRepo: repo, issueNumber: 42 });
    expect(legacy.status).toBe(404);
    expect(installations.prepareIssue).not.toHaveBeenCalled();

    const [externalProject] = await db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId));
    await db
      .update(workspaceMembers)
      .set({ role: 'admin' })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, memberId),
        ),
      );
    const adminToken = (
      await login(app, `test:${memberUid}:${memberEmail}:External admin`)
    ).accessToken;
    await request(app.getHttpServer())
      .patch(`/projects/${externalProject!.id}`)
      .set('Authorization', bearer(adminToken))
      .send({ visibility: 'public' })
      .expect(422);

    const [managed] = await db
      .insert(projects)
      .values({
        workspaceId,
        name: `Managed ${randomUUID()}`,
        visibility: 'private',
      })
      .returning();
    const managedRepo = `ManagedE2E/${randomUUID().slice(0, 12)}`;
    await db.insert(projectExternalRefs).values({
      workspaceId,
      projectId: managed!.id,
      provider: 'github',
      externalType: 'repository',
      externalKey: managedRepo,
    });
    const response = await request(app.getHttpServer())
      .post('/time-entries/timer/start-from-github-reference')
      .set('Authorization', bearer(memberToken))
      .send({
        githubRepo: managedRepo,
        issueNumber: 9,
        issueTitle: 'Managed issue',
        issueUrl: `https://github.com/${managedRepo}/issues/9`,
      });
    expect(response.status).toBe(404);
    expect(installations.prepareIssue).toHaveBeenCalledTimes(1);
    expect(
      await db
        .select()
        .from(projects)
        .where(eq(projects.workspaceId, workspaceId)),
    ).toHaveLength(2);
  });
});

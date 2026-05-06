import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  projectAssignments,
  projects,
  tasks,
  users,
  workspaces,
} from '../src/db/schema';
import { bearer, login } from './helpers/auth';

describe('Projects and tasks (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let adminToken: string;
  let pmToken: string;
  let memberToken: string;
  let otherMemberToken: string;
  let workspaceId: string;
  let platformProjectId: string;
  let clientProjectId: string;
  let archivedProjectId: string;
  let aliceUserId: string;
  let bobUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<DrizzleDB>(DRIZZLE);

    const [workspace] = await db.select().from(workspaces).limit(1);
    if (!workspace) throw new Error('Expected seeded workspace');
    workspaceId = workspace.id;

    const [platformProject] = await db
      .select()
      .from(projects)
      .where(eq(projects.name, 'Internal Platform'))
      .limit(1);
    const [clientProject] = await db
      .select()
      .from(projects)
      .where(eq(projects.name, 'Demo Client'))
      .limit(1);
    const [archivedProject] = await db
      .select()
      .from(projects)
      .where(eq(projects.name, 'Archived Initiative'))
      .limit(1);
    if (!platformProject || !clientProject || !archivedProject) {
      throw new Error('Expected seeded projects');
    }
    platformProjectId = platformProject.id;
    clientProjectId = clientProject.id;
    archivedProjectId = archivedProject.id;

    const [alice] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.firebaseUid, 'seed-user-1'))
      .limit(1);
    if (!alice) throw new Error('Expected seeded Alice user');
    aliceUserId = alice.id;

    const [bob] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.firebaseUid, 'seed-user-2'))
      .limit(1);
    if (!bob) throw new Error('Expected seeded Bob user');
    bobUserId = bob.id;

    adminToken = (await login(app)).accessToken;
    pmToken = (await login(app, 'test:seed-user-1:alice@gitiempo.dev:Alice'))
      .accessToken;
    memberToken = (await login(app, 'test:seed-user-2:bob@gitiempo.dev:Bob'))
      .accessToken;
    otherMemberToken = (
      await login(app, 'test:seed-user-3:carol@gitiempo.dev:Carol')
    ).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists all projects for admin and only assigned active projects for members', async () => {
    const adminRes = await request(app.getHttpServer())
      .get('/projects')
      .set('Authorization', bearer(adminToken));
    expect(adminRes.status).toBe(200);
    expect(
      adminRes.body.some(
        (project: { id: string }) => project.id === archivedProjectId,
      ),
    ).toBe(true);
    const platform = adminRes.body.find(
      (project: { id: string }) => project.id === platformProjectId,
    );
    expect(platform).toMatchObject({
      visibility: 'private',
      source: 'manual',
    });
    expect(typeof platform.totalHours).toBe('number');

    const memberRes = await request(app.getHttpServer())
      .get('/projects')
      .set('Authorization', bearer(memberToken));
    expect(memberRes.status).toBe(200);
    expect(
      memberRes.body.map((project: { id: string }) => project.id),
    ).toContain(platformProjectId);
    expect(
      memberRes.body.map((project: { id: string }) => project.id),
    ).not.toContain(clientProjectId);
    expect(
      memberRes.body.map((project: { id: string }) => project.id),
    ).not.toContain(archivedProjectId);
  });

  it('auto-assigns a PM to projects they create', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', bearer(pmToken))
      .send({ name: `PM Created ${randomUUID()}` });
    expect(createRes.status).toBe(201);
    expect(createRes.body.visibility).toBe('private');
    expect(createRes.body.source).toBe('manual');
    expect(createRes.body.totalHours).toBe(0);
    // PM is auto-assigned, so the create response must reflect that immediately
    expect(createRes.body.memberCount).toBe(1);

    const [assignment] = await db
      .select()
      .from(projectAssignments)
      .where(eq(projectAssignments.projectId, createRes.body.id))
      .limit(1);
    expect(assignment?.userId).toBeTruthy();
    expect(assignment?.assignedBy).toBe(assignment?.userId);
  });

  it('admin createProject returns memberCount 0 (no assignments)', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', bearer(adminToken))
      .send({ name: `Admin Created ${randomUUID()}` });
    expect(createRes.status).toBe(201);
    expect(createRes.body.memberCount).toBe(0);
  });

  it('allows admin assignment management for PMs and members', async () => {
    const createAssignment = await request(app.getHttpServer())
      .post(`/projects/${clientProjectId}/assignments`)
      .set('Authorization', bearer(adminToken))
      .send({ userId: bobUserId });
    expect(createAssignment.status).toBe(201);
    expect(createAssignment.body.userId).toBe(bobUserId);

    const listAssignments = await request(app.getHttpServer())
      .get(`/projects/${clientProjectId}/assignments`)
      .set('Authorization', bearer(adminToken));
    expect(listAssignments.status).toBe(200);
    expect(
      listAssignments.body.some(
        (assignment: { userId: string }) => assignment.userId === bobUserId,
      ),
    ).toBe(true);

    const deleteAssignment = await request(app.getHttpServer())
      .delete(`/projects/${clientProjectId}/assignments/${bobUserId}`)
      .set('Authorization', bearer(adminToken));
    expect(deleteAssignment.status).toBe(204);
  });

  it('prevents PM updates outside assigned project visibility', async () => {
    const [unassignedProject] = await db
      .insert(projects)
      .values({
        workspaceId,
        name: `Unassigned ${randomUUID()}`,
        isActive: true,
      })
      .returning();
    if (!unassignedProject) throw new Error('Expected unassigned project');

    const res = await request(app.getHttpServer())
      .patch(`/projects/${unassignedProject.id}`)
      .set('Authorization', bearer(pmToken))
      .send({ name: 'Nope' });
    expect(res.status).toBe(404);
  });

  it('prevents PMs from changing project active state', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', bearer(pmToken))
      .send({ name: `PM Active State ${randomUUID()}` });
    expect(createRes.status).toBe(201);

    const updateRes = await request(app.getHttpServer())
      .patch(`/projects/${createRes.body.id}`)
      .set('Authorization', bearer(pmToken))
      .send({ isActive: false });
    expect(updateRes.status).toBe(403);

    const [project] = await db
      .select({ isActive: projects.isActive })
      .from(projects)
      .where(eq(projects.id, createRes.body.id))
      .limit(1);
    expect(project?.isActive).toBe(true);
  });

  it('allows admins to archive and unarchive projects through patch', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', bearer(adminToken))
      .send({ name: `Admin Archive ${randomUUID()}` });
    expect(createRes.status).toBe(201);

    const archiveRes = await request(app.getHttpServer())
      .patch(`/projects/${createRes.body.id}`)
      .set('Authorization', bearer(adminToken))
      .send({ isActive: false });
    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.isActive).toBe(false);

    const unarchiveRes = await request(app.getHttpServer())
      .patch(`/projects/${createRes.body.id}`)
      .set('Authorization', bearer(adminToken))
      .send({ isActive: true });
    expect(unarchiveRes.status).toBe(200);
    expect(unarchiveRes.body.isActive).toBe(true);
  });

  it('allows assigned members to create and update tasks but not mutate projects', async () => {
    const createTask = await request(app.getHttpServer())
      .post(`/projects/${platformProjectId}/tasks`)
      .set('Authorization', bearer(memberToken))
      .send({ title: `Member Task ${randomUUID()}` });
    expect(createTask.status).toBe(201);

    const updateTask = await request(app.getHttpServer())
      .patch(`/tasks/${createTask.body.id}`)
      .set('Authorization', bearer(memberToken))
      .send({ title: 'Member Task Updated', status: 'closed' });
    expect(updateTask.status).toBe(200);
    expect(updateTask.body.title).toBe('Member Task Updated');
    expect(updateTask.body.status).toBe('closed');

    const projectMutation = await request(app.getHttpServer())
      .patch(`/projects/${platformProjectId}`)
      .set('Authorization', bearer(memberToken))
      .send({ name: 'Forbidden' });
    expect(projectMutation.status).toBe(403);
  });

  it('prevents task updates in inactive projects', async () => {
    const [inactiveProject] = await db
      .insert(projects)
      .values({
        workspaceId,
        name: `Inactive Task Parent ${randomUUID()}`,
        isActive: false,
      })
      .returning();
    if (!inactiveProject) throw new Error('Expected inactive project');

    const [task] = await db
      .insert(tasks)
      .values({
        workspaceId,
        projectId: inactiveProject.id,
        title: `Inactive Project Task ${randomUUID()}`,
      })
      .returning();
    if (!task) throw new Error('Expected task');

    const updateTask = await request(app.getHttpServer())
      .patch(`/tasks/${task.id}`)
      .set('Authorization', bearer(adminToken))
      .send({ title: 'Should Not Update' });
    expect(updateTask.status).toBe(422);
  });

  it('hides project tasks from unassigned members', async () => {
    const [platformTask] = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, workspaceId),
          eq(tasks.projectId, platformProjectId),
        ),
      )
      .limit(1);
    if (!platformTask) throw new Error('Expected seeded platform task');

    const listTasks = await request(app.getHttpServer())
      .get(`/projects/${platformProjectId}/tasks`)
      .set('Authorization', bearer(otherMemberToken));
    expect(listTasks.status).toBe(404);

    const readTask = await request(app.getHttpServer())
      .get(`/tasks/${platformTask.id}`)
      .set('Authorization', bearer(otherMemberToken));
    expect(readTask.status).toBe(404);
  });

  it('allows unassigned members to work in active public projects', async () => {
    const publicProject = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', bearer(adminToken))
      .send({ name: `Public Access ${randomUUID()}`, visibility: 'public' });
    expect(publicProject.status).toBe(201);
    expect(publicProject.body.visibility).toBe('public');

    const memberList = await request(app.getHttpServer())
      .get('/projects')
      .set('Authorization', bearer(otherMemberToken));
    expect(memberList.status).toBe(200);
    expect(
      memberList.body.map((project: { id: string }) => project.id),
    ).toContain(publicProject.body.id);

    const readProject = await request(app.getHttpServer())
      .get(`/projects/${publicProject.body.id}`)
      .set('Authorization', bearer(otherMemberToken));
    expect(readProject.status).toBe(200);

    const memberProjectMutation = await request(app.getHttpServer())
      .patch(`/projects/${publicProject.body.id}`)
      .set('Authorization', bearer(otherMemberToken))
      .send({ name: 'Still Forbidden' });
    expect(memberProjectMutation.status).toBe(403);

    const createdTask = await request(app.getHttpServer())
      .post(`/projects/${publicProject.body.id}/tasks`)
      .set('Authorization', bearer(otherMemberToken))
      .send({ title: `Public Task ${randomUUID()}` });
    expect(createdTask.status).toBe(201);

    const listedTasks = await request(app.getHttpServer())
      .get(`/projects/${publicProject.body.id}/tasks`)
      .set('Authorization', bearer(otherMemberToken));
    expect(listedTasks.status).toBe(200);
    expect(listedTasks.body.map((task: { id: string }) => task.id)).toContain(
      createdTask.body.id,
    );

    const readTask = await request(app.getHttpServer())
      .get(`/tasks/${createdTask.body.id}`)
      .set('Authorization', bearer(otherMemberToken));
    expect(readTask.status).toBe(200);
    expect(readTask.body.id).toBe(createdTask.body.id);

    const updatedTask = await request(app.getHttpServer())
      .patch(`/tasks/${createdTask.body.id}`)
      .set('Authorization', bearer(otherMemberToken))
      .send({ title: 'Public Task Updated' });
    expect(updatedTask.status).toBe(200);

    const manualEntry = await request(app.getHttpServer())
      .post('/time-entries')
      .set('Authorization', bearer(otherMemberToken))
      .send({
        taskId: createdTask.body.id,
        startedAt: '2026-05-01T10:00:00.000Z',
        endedAt: '2026-05-01T10:30:00.000Z',
      });
    expect(manualEntry.status).toBe(201);

    const projectEntries = await request(app.getHttpServer())
      .get(`/projects/${publicProject.body.id}/time-entries`)
      .set('Authorization', bearer(otherMemberToken));
    expect(projectEntries.status).toBe(200);
    expect(
      projectEntries.body.items.map((item: { id: string }) => item.id),
    ).toContain(manualEntry.body.id);

    const timer = await request(app.getHttpServer())
      .post('/time-entries/timer/start')
      .set('Authorization', bearer(otherMemberToken))
      .send({ taskId: createdTask.body.id });
    expect(timer.status).toBe(201);

    const projectWithHours = await request(app.getHttpServer())
      .get(`/projects/${publicProject.body.id}`)
      .set('Authorization', bearer(otherMemberToken));
    expect(projectWithHours.status).toBe(200);
    expect(projectWithHours.body.totalHours).toBe(0.5);

    const stopped = await request(app.getHttpServer())
      .post('/time-entries/timer/stop')
      .set('Authorization', bearer(otherMemberToken));
    expect(stopped.status).toBe(200);
  });

  it('returns scoped management summaries with distinct public assignments', async () => {
    const publicAssigned = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', bearer(pmToken))
      .send({ name: `PM Public ${randomUUID()}`, visibility: 'public' });
    expect(publicAssigned.status).toBe(201);

    const adminSummary = await request(app.getHttpServer())
      .get('/projects/management-summary')
      .set('Authorization', bearer(adminToken));
    expect(adminSummary.status).toBe(200);

    const activeProjects = await db
      .select({ id: projects.id, visibility: projects.visibility })
      .from(projects)
      .where(
        and(eq(projects.workspaceId, workspaceId), eq(projects.isActive, true)),
      );
    expect(adminSummary.body).toEqual({
      activeProjects: activeProjects.length,
      privateProjects: activeProjects.filter(
        (project) => project.visibility === 'private',
      ).length,
      publicProjects: activeProjects.filter(
        (project) => project.visibility === 'public',
      ).length,
    });

    const pmSummary = await request(app.getHttpServer())
      .get('/projects/management-summary')
      .set('Authorization', bearer(pmToken));
    expect(pmSummary.status).toBe(200);

    const assignments = await db
      .select({ projectId: projectAssignments.projectId })
      .from(projectAssignments)
      .where(eq(projectAssignments.userId, aliceUserId));
    const assignedIds = new Set(assignments.map((row) => row.projectId));
    const pmVisibleProjects = activeProjects.filter(
      (project) =>
        project.visibility === 'public' || assignedIds.has(project.id),
    );

    expect(pmSummary.body).toEqual({
      activeProjects: pmVisibleProjects.length,
      privateProjects: pmVisibleProjects.filter(
        (project) => project.visibility === 'private',
      ).length,
      publicProjects: pmVisibleProjects.filter(
        (project) => project.visibility === 'public',
      ).length,
    });
    expect(
      pmVisibleProjects.filter(
        (project) => project.id === publicAssigned.body.id,
      ),
    ).toHaveLength(1);
  });

  describe('memberCount field', () => {
    let platformMemberCount: number;
    let clientMemberCount: number;
    let archivedMemberCount: number;

    beforeAll(async () => {
      // Query actual assignment counts from DB so tests are resilient to
      // other tests adding/removing assignments in the same suite run.
      const countRows = await db
        .select({
          projectId: projectAssignments.projectId,
        })
        .from(projectAssignments)
        .where(and(eq(projectAssignments.workspaceId, workspaceId)));
      platformMemberCount = countRows.filter(
        (r) => r.projectId === platformProjectId,
      ).length;
      clientMemberCount = countRows.filter(
        (r) => r.projectId === clientProjectId,
      ).length;
      archivedMemberCount = countRows.filter(
        (r) => r.projectId === archivedProjectId,
      ).length;
    });

    it('list projects returns correct memberCount for each project', async () => {
      const res = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', bearer(adminToken));
      expect(res.status).toBe(200);

      const platform = res.body.find(
        (p: { id: string }) => p.id === platformProjectId,
      );
      const client = res.body.find(
        (p: { id: string }) => p.id === clientProjectId,
      );
      const archived = res.body.find(
        (p: { id: string }) => p.id === archivedProjectId,
      );

      expect(platform).toBeDefined();
      expect(typeof platform.memberCount).toBe('number');
      expect(platform.memberCount).toBe(platformMemberCount);

      expect(client).toBeDefined();
      expect(client.memberCount).toBe(clientMemberCount);

      expect(archived).toBeDefined();
      expect(archived.memberCount).toBe(archivedMemberCount);
    });

    it('single-project GET returns correct memberCount', async () => {
      const platformRes = await request(app.getHttpServer())
        .get(`/projects/${platformProjectId}`)
        .set('Authorization', bearer(adminToken));
      expect(platformRes.status).toBe(200);
      expect(platformRes.body.memberCount).toBe(platformMemberCount);

      const clientRes = await request(app.getHttpServer())
        .get(`/projects/${clientProjectId}`)
        .set('Authorization', bearer(adminToken));
      expect(clientRes.status).toBe(200);
      expect(clientRes.body.memberCount).toBe(clientMemberCount);

      const archivedRes = await request(app.getHttpServer())
        .get(`/projects/${archivedProjectId}`)
        .set('Authorization', bearer(adminToken));
      expect(archivedRes.status).toBe(200);
      expect(archivedRes.body.memberCount).toBe(archivedMemberCount);
    });

    it('memberCount is consistent between list and single-project endpoints', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', bearer(adminToken));
      expect(listRes.status).toBe(200);

      const platformFromList = listRes.body.find(
        (p: { id: string }) => p.id === platformProjectId,
      );

      const getRes = await request(app.getHttpServer())
        .get(`/projects/${platformProjectId}`)
        .set('Authorization', bearer(adminToken));
      expect(getRes.status).toBe(200);

      expect(platformFromList.memberCount).toBe(getRes.body.memberCount);
    });
  });
});

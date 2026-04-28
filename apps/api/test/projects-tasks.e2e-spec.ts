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

    const [assignment] = await db
      .select()
      .from(projectAssignments)
      .where(eq(projectAssignments.projectId, createRes.body.id))
      .limit(1);
    expect(assignment?.userId).toBeTruthy();
    expect(assignment?.assignedBy).toBe(assignment?.userId);
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
});

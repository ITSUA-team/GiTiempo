import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  projectAssignments,
  projects,
  tasks,
  timeEntries,
  users,
  workspaceMembers,
  workspaces,
} from '../src/db/schema';
import { bearer, login } from './helpers/auth';

describe('Members enrichment: lastActiveAt & projectsAssignedCount (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let adminToken: string;
  let workspaceId: string;
  let adminUserId: string;
  let projectId: string;
  let taskId: string;

  let testMemberUid: string;
  let testMemberEmail: string;
  let testMemberUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<DrizzleDB>(DRIZZLE);

    const suffix = randomUUID();
    const adminUid = `enrich-admin-${suffix}`;
    const adminEmail = `${adminUid}@example.com`;

    const [workspace] = await db
      .insert(workspaces)
      .values({ name: `Members Enrichment ${suffix}` })
      .returning();
    if (!workspace) throw new Error('Failed to create test workspace');
    workspaceId = workspace.id;

    const [adminUser] = await db
      .insert(users)
      .values({
        firebaseUid: adminUid,
        email: adminEmail,
        displayName: 'Enrichment Admin',
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

    const [project] = await db
      .insert(projects)
      .values({
        workspaceId,
        name: 'Members Enrichment Project',
      })
      .returning();
    if (!project) throw new Error('Failed to create test project');
    projectId = project.id;

    const [task] = await db
      .insert(tasks)
      .values({
        workspaceId,
        projectId,
        title: 'Members Enrichment Task',
      })
      .returning();
    if (!task) throw new Error('Failed to create test task');
    taskId = task.id;

    adminToken = (
      await login(app, `test:${adminUid}:${adminEmail}:Enrichment Admin`)
    ).accessToken;

    testMemberUid = `enrich-test-${suffix}`;
    testMemberEmail = `${testMemberUid}@example.com`;
    const [createdUser] = await db
      .insert(users)
      .values({
        firebaseUid: testMemberUid,
        email: testMemberEmail,
        displayName: 'Enrichment Test',
        avatarUrl: null,
      })
      .returning();
    if (!createdUser) throw new Error('Failed to create test member');
    testMemberUserId = createdUser.id;

    await db.insert(workspaceMembers).values({
      workspaceId,
      userId: testMemberUserId,
      role: 'member',
    });
  });

  afterAll(async () => {
    await db
      .delete(timeEntries)
      .where(eq(timeEntries.userId, testMemberUserId));
    await db
      .delete(projectAssignments)
      .where(eq(projectAssignments.projectId, projectId));
    await db.delete(tasks).where(eq(tasks.id, taskId));
    await db.delete(projects).where(eq(projects.id, projectId));
    await db
      .delete(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));
    await db.delete(users).where(eq(users.id, testMemberUserId));
    await db.delete(users).where(eq(users.id, adminUserId));
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    await app.close();
  });

  it('listMembers returns lastActiveAt: null for a member with no time-tracking writes', async () => {
    const res = await request(app.getHttpServer())
      .get('/members')
      .set('Authorization', bearer(adminToken));
    expect(res.status).toBe(200);

    const member = res.body.find(
      (m: { email: string }) => m.email === testMemberEmail,
    );
    expect(member).toBeDefined();
    expect(member.lastActiveAt).toBeNull();
  });

  it('listMembers returns non-null lastActiveAt after a time-tracking write', async () => {
    const testMemberToken = (
      await login(
        app,
        `test:${testMemberUid}:${testMemberEmail}:Enrichment Test`,
      )
    ).accessToken;
    const before = new Date().toISOString();

    await db.insert(projectAssignments).values({
      workspaceId,
      projectId,
      userId: testMemberUserId,
      assignedBy: adminUserId,
    });

    const createRes = await request(app.getHttpServer())
      .post('/time-entries')
      .set('Authorization', bearer(testMemberToken))
      .send({
        taskId,
        startedAt: '2026-05-01T10:00:00.000Z',
        endedAt: '2026-05-01T10:30:00.000Z',
      });
    expect(createRes.status).toBe(201);

    await new Promise((resolve) => setTimeout(resolve, 150));

    const res = await request(app.getHttpServer())
      .get('/members')
      .set('Authorization', bearer(adminToken));
    expect(res.status).toBe(200);

    const member = res.body.find(
      (m: { email: string }) => m.email === testMemberEmail,
    );
    expect(member).toBeDefined();
    expect(member.lastActiveAt).not.toBeNull();
    expect(new Date(member.lastActiveAt).toISOString() >= before).toBe(true);
  });

  it('listMembers returns projectsAssignedCount: 0 for a member with no assignments', async () => {
    const uid = `no-assign-${randomUUID()}`;
    const email = `${uid}@example.com`;
    const [user] = await db
      .insert(users)
      .values({
        firebaseUid: uid,
        email,
        displayName: 'No Assign',
        avatarUrl: null,
      })
      .returning();
    if (!user) throw new Error('Failed to create no-assignment member');
    const [membership] = await db
      .insert(workspaceMembers)
      .values({ workspaceId, userId: user.id, role: 'member' })
      .returning();
    if (!membership) throw new Error('Failed to create no-assignment member');

    const res = await request(app.getHttpServer())
      .get('/members')
      .set('Authorization', bearer(adminToken));
    expect(res.status).toBe(200);

    const found = res.body.find((m: { email: string }) => m.email === email);
    expect(found).toBeDefined();
    expect(found.projectsAssignedCount).toBe(0);

    await db
      .delete(workspaceMembers)
      .where(eq(workspaceMembers.id, membership.id));
    await db.delete(users).where(eq(users.id, user.id));
  });

  it('listMembers returns correct projectsAssignedCount matching actual DB assignments', async () => {
    const res = await request(app.getHttpServer())
      .get('/members')
      .set('Authorization', bearer(adminToken));
    expect(res.status).toBe(200);

    const member = res.body.find(
      (m: { email: string }) => m.email === testMemberEmail,
    );
    expect(member).toBeDefined();
    expect(member.projectsAssignedCount).toBe(1);
  });
});

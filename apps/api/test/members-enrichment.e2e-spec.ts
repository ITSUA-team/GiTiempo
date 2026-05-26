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
  let platformTaskId: string;

  // Isolated test user for activity tracking tests
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

    const [workspace] = await db.select().from(workspaces).limit(1);
    if (!workspace) throw new Error('Expected seeded workspace');
    workspaceId = workspace.id;

    const [platformProject] = await db
      .select()
      .from(projects)
      .where(eq(projects.name, 'Internal Platform'))
      .limit(1);
    if (!platformProject) throw new Error('Expected seeded platform project');

    const [task] = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, platformProject.id),
          eq(tasks.title, 'Set up API project foundation'),
        ),
      )
      .limit(1);
    if (!task) throw new Error('Expected seeded task');
    platformTaskId = task.id;

    adminToken = (await login(app)).accessToken;

    // Create an isolated test user with a known membership
    testMemberUid = `enrich-test-${randomUUID()}`;
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
    testMemberUserId = createdUser!.id;

    await db.insert(workspaceMembers).values({
      workspaceId,
      userId: testMemberUserId,
      role: 'member',
    });
  });

  afterAll(async () => {
    // Clean up test data
    await db
      .delete(timeEntries)
      .where(eq(timeEntries.userId, testMemberUserId));
    await db
      .delete(projectAssignments)
      .where(eq(projectAssignments.userId, testMemberUserId));
    await db
      .delete(workspaceMembers)
      .where(eq(workspaceMembers.userId, testMemberUserId));
    await db.delete(users).where(eq(users.id, testMemberUserId));
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

    // Assign test user to the project's task so they can create entries
    await db.insert(projectAssignments).values({
      workspaceId,
      projectId: (
        await db
          .select({ id: tasks.projectId })
          .from(tasks)
          .where(eq(tasks.id, platformTaskId))
          .limit(1)
      )[0]!.id,
      userId: testMemberUserId,
      assignedBy: testMemberUserId,
    });

    // Create a manual time entry — this should bump lastActiveAt
    const createRes = await request(app.getHttpServer())
      .post('/time-entries')
      .set('Authorization', bearer(testMemberToken))
      .send({
        taskId: platformTaskId,
        startedAt: '2026-05-01T10:00:00.000Z',
        endedAt: '2026-05-01T10:30:00.000Z',
      });
    expect(createRes.status).toBe(201);

    // Give the fire-and-forget a moment to complete
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
    // Create another user with zero assignments
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
    const [wm] = await db
      .insert(workspaceMembers)
      .values({ workspaceId, userId: user!.id, role: 'member' })
      .returning();

    const res = await request(app.getHttpServer())
      .get('/members')
      .set('Authorization', bearer(adminToken));
    expect(res.status).toBe(200);

    const found = res.body.find((m: { email: string }) => m.email === email);
    expect(found).toBeDefined();
    expect(found.projectsAssignedCount).toBe(0);

    // Cleanup
    await db.delete(workspaceMembers).where(eq(workspaceMembers.id, wm!.id));
    await db.delete(users).where(eq(users.id, user!.id));
  });

  it('listMembers returns correct projectsAssignedCount matching actual DB assignments', async () => {
    // The test member was assigned to one project in the earlier test
    const res = await request(app.getHttpServer())
      .get('/members')
      .set('Authorization', bearer(adminToken));
    expect(res.status).toBe(200);

    const member = res.body.find(
      (m: { email: string }) => m.email === testMemberEmail,
    );
    expect(member).toBeDefined();

    // We assigned the user to exactly one project above
    expect(member.projectsAssignedCount).toBe(1);
  });
});

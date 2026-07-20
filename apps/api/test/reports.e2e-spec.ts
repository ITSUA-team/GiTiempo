import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, gte, lt } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import { projects, tasks, timeEntries, users } from '../src/db/schema';
import { bearer, login } from './helpers/auth';
import { getSeededAdminWorkspace } from './helpers/seeded-workspace';

const DATE_FROM = '2027-03-01T00:00:00.000Z';
const DATE_TO = '2027-04-01T00:00:00.000Z';
const PROBE_PROJECT_NAME = 'Reports Probe Project';

interface SeededEntry {
  taskId: string;
  userId: string;
  startedAt: string;
  durationSeconds: number;
  isBillable: boolean;
}

describe('Reports (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let adminToken: string;
  let pmToken: string;
  let memberToken: string;
  let workspaceId: string;
  let platformProjectId: string;
  let clientProjectId: string;
  let probeProjectId: string;
  let platformApiTaskId: string;
  let platformReviewTaskId: string;
  let clientTaskId: string;
  let probeTaskId: string;
  let bobUserId: string;
  let carolUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<DrizzleDB>(DRIZZLE);

    const { workspace } = await getSeededAdminWorkspace(db);
    workspaceId = workspace.id;
    await cleanupFixtures();

    platformProjectId = await findProjectId('Internal Platform');
    clientProjectId = await findProjectId('Demo Client');
    platformApiTaskId = await findTaskId(
      platformProjectId,
      'Set up API project foundation',
    );
    platformReviewTaskId = await findTaskId(
      platformProjectId,
      'Review workspace authorization flows',
    );
    clientTaskId = await findTaskId(
      clientProjectId,
      'Draft onboarding checklist',
    );
    bobUserId = await findUserId('seed-user-2');
    carolUserId = await findUserId('seed-user-3');

    // Active private project the seeded PM (alice) is NOT assigned to; its
    // entries must stay outside every PM report while admins see them.
    const [probeProject] = await db
      .insert(projects)
      .values({
        workspaceId,
        name: PROBE_PROJECT_NAME,
        visibility: 'private',
        isActive: true,
      })
      .returning({ id: projects.id });
    probeProjectId = probeProject!.id;
    const [probeTask] = await db
      .insert(tasks)
      .values({
        workspaceId,
        projectId: probeProjectId,
        title: 'Reports probe task',
      })
      .returning({ id: tasks.id });
    probeTaskId = probeTask!.id;

    const seededEntries: SeededEntry[] = [
      // Internal Platform: bob on two tasks, carol on one
      {
        taskId: platformApiTaskId,
        userId: bobUserId,
        startedAt: '2027-03-02T10:00:00.000Z',
        durationSeconds: 3600,
        isBillable: true,
      },
      {
        taskId: platformReviewTaskId,
        userId: bobUserId,
        startedAt: '2027-03-03T10:00:00.000Z',
        durationSeconds: 7200,
        isBillable: true,
      },
      {
        taskId: platformApiTaskId,
        userId: carolUserId,
        startedAt: '2027-03-04T10:00:00.000Z',
        durationSeconds: 1800,
        isBillable: false,
      },
      // Demo Client: carol only
      {
        taskId: clientTaskId,
        userId: carolUserId,
        startedAt: '2027-03-05T10:00:00.000Z',
        durationSeconds: 5400,
        isBillable: true,
      },
      // Probe project outside PM scope: bob
      {
        taskId: probeTaskId,
        userId: bobUserId,
        startedAt: '2027-03-06T10:00:00.000Z',
        durationSeconds: 900,
        isBillable: true,
      },
    ];
    await db.insert(timeEntries).values(
      seededEntries.map((entry) => ({
        workspaceId,
        taskId: entry.taskId,
        userId: entry.userId,
        source: 'manual' as const,
        startedAt: new Date(entry.startedAt),
        endedAt: new Date(
          new Date(entry.startedAt).getTime() + entry.durationSeconds * 1000,
        ),
        durationSeconds: entry.durationSeconds,
        isBillable: entry.isBillable,
      })),
    );
    // Running entry inside the window must not contribute anywhere.
    await db.insert(timeEntries).values({
      workspaceId,
      taskId: platformApiTaskId,
      userId: bobUserId,
      source: 'web' as const,
      startedAt: new Date('2027-03-07T10:00:00.000Z'),
      endedAt: null,
      durationSeconds: null,
      isBillable: true,
    });

    adminToken = (await login(app)).accessToken;
    pmToken = (await login(app, 'test:seed-user-1:alice@gitiempo.dev:Alice'))
      .accessToken;
    memberToken = (await login(app, 'test:seed-user-2:bob@gitiempo.dev:Bob'))
      .accessToken;
  });

  afterAll(async () => {
    await cleanupFixtures();
    await app.close();
  });

  // Fixtures live in a dedicated 2027-03 window so seeded demo entries stay
  // untouched; cleanup removes exactly that window plus the probe project.
  async function cleanupFixtures(): Promise<void> {
    await db
      .delete(timeEntries)
      .where(
        and(
          eq(timeEntries.workspaceId, workspaceId),
          gte(timeEntries.startedAt, new Date(DATE_FROM)),
          lt(timeEntries.startedAt, new Date(DATE_TO)),
        ),
      );
    const probe = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, workspaceId),
          eq(projects.name, PROBE_PROJECT_NAME),
        ),
      );
    for (const project of probe) {
      await db.delete(tasks).where(eq(tasks.projectId, project.id));
      await db.delete(projects).where(eq(projects.id, project.id));
    }
  }

  async function findProjectId(name: string): Promise<string> {
    const [row] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(eq(projects.workspaceId, workspaceId), eq(projects.name, name)),
      )
      .limit(1);
    if (!row) throw new Error(`Expected seeded project ${name}`);
    return row.id;
  }

  async function findTaskId(projectId: string, title: string): Promise<string> {
    const [row] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.projectId, projectId), eq(tasks.title, title)))
      .limit(1);
    if (!row) throw new Error(`Expected seeded task ${title}`);
    return row.id;
  }

  async function findUserId(firebaseUid: string): Promise<string> {
    const [row] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.firebaseUid, firebaseUid))
      .limit(1);
    if (!row) throw new Error(`Expected seeded user ${firebaseUid}`);
    return row.id;
  }

  function getReport(token: string, body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post('/reports/time')
      .set('Authorization', bearer(token))
      .send({ dateFrom: DATE_FROM, dateTo: DATE_TO, ...body });
  }

  it('keeps single-level project grouping behavior', async () => {
    const res = await getReport(adminToken, {});

    expect(res.status).toBe(200);
    expect(res.body.groupBy).toEqual(['project']);
    const platform = res.body.items.find(
      (item: { project: { id: string } | null }) =>
        item.project?.id === platformProjectId,
    );
    expect(platform).toMatchObject({
      task: null,
      user: null,
      totalSeconds: 12600,
      billableSeconds: 10800,
      nonBillableSeconds: 1800,
      entryCount: 3,
    });
    // running entry contributes nowhere
    expect(res.body.summary.totalSeconds).toBe(18900);
  });

  it('returns multi-level leaf rows carrying identity for the full path', async () => {
    const res = await getReport(adminToken, {
      groupBy: ['project', 'user', 'task'],
    });

    expect(res.status).toBe(200);
    expect(res.body.groupBy).toEqual(['project', 'user', 'task']);
    for (const item of res.body.items) {
      expect(item.project).not.toBeNull();
      expect(item.user).not.toBeNull();
      expect(item.task).not.toBeNull();
    }
    const bobApi = res.body.items.find(
      (item: {
        project: { id: string };
        user: { id: string };
        task: { id: string };
      }) =>
        item.project.id === platformProjectId &&
        item.user.id === bobUserId &&
        item.task.id === platformApiTaskId,
    );
    expect(bobApi).toMatchObject({
      totalSeconds: 3600,
      billableSeconds: 3600,
      entryCount: 1,
    });
  });

  it('paginates by top-level group and returns complete subtrees', async () => {
    const res = await getReport(adminToken, {
      groupBy: ['project', 'user'],
      page: 1,
      limit: 1,
      sortBy: 'totalSeconds',
      sortOrder: 'desc',
    });

    expect(res.status).toBe(200);
    // three projects have entries for the admin in the window
    expect(res.body.meta).toMatchObject({ page: 1, limit: 1, total: 3 });
    // heaviest project is Internal Platform (12600s): both member rows arrive
    const projectIds = new Set(
      res.body.items.map(
        (item: { project: { id: string } }) => item.project.id,
      ),
    );
    expect([...projectIds]).toEqual([platformProjectId]);
    expect(res.body.items).toHaveLength(2);
    const totals = res.body.items
      .map((item: { totalSeconds: number }) => item.totalSeconds)
      .sort((a: number, b: number) => a - b);
    expect(totals).toEqual([1800, 10800]);
    // summary still covers all filtered entries, not just the page
    expect(res.body.summary.totalSeconds).toBe(18900);
  });

  it('keeps PM-scoped multi-level reports inside assigned projects', async () => {
    const res = await getReport(pmToken, { groupBy: ['project', 'user'] });

    expect(res.status).toBe(200);
    const projectIds = new Set(
      res.body.items.map(
        (item: { project: { id: string } }) => item.project.id,
      ),
    );
    expect(projectIds.has(probeProjectId)).toBe(false);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.summary.totalSeconds).toBe(18000);
  });

  it('rejects invalid grouping paths', async () => {
    const duplicated = await getReport(adminToken, {
      groupBy: ['project', 'project'],
    });
    const unknown = await getReport(adminToken, {
      groupBy: ['project', 'week'],
    });

    expect(duplicated.status).toBe(400);
    expect(unknown.status).toBe(400);
  });

  it('exports detailed CSV rows recording the grouping path', async () => {
    const res = await request(app.getHttpServer())
      .post('/reports/time/export')
      .set('Authorization', bearer(adminToken))
      .send({
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        groupBy: ['project', 'user'],
      });

    expect(res.status).toBe(200);
    const lines = (res.text as string).trim().split('\n');
    // header + one row per project-task-user combination (5 seeded combos)
    expect(lines).toHaveLength(6);
    for (const line of lines.slice(1)) {
      // Every field is quoted to defuse formula injection across locales.
      expect(line.startsWith('"project>user",')).toBe(true);
    }
  });

  it('exports a styled PDF report for admins', async () => {
    const res = await request(app.getHttpServer())
      .post('/reports/time/export')
      .set('Authorization', bearer(adminToken))
      .send({
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        format: 'pdf',
        groupBy: ['project', 'user'],
      })
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('.pdf');
    const body = res.body as Buffer;
    expect(body.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(body.length).toBeGreaterThan(1500);
  });

  it('keeps PDF export inside the PM report scope', async () => {
    const res = await request(app.getHttpServer())
      .post('/reports/time/export')
      .set('Authorization', bearer(pmToken))
      .send({
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        format: 'pdf',
        groupBy: ['project'],
      })
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect((res.body as Buffer).subarray(0, 5).toString('latin1')).toBe(
      '%PDF-',
    );
  });

  it('rejects unknown export formats', async () => {
    const res = await request(app.getHttpServer())
      .post('/reports/time/export')
      .set('Authorization', bearer(adminToken))
      .send({ dateFrom: DATE_FROM, dateTo: DATE_TO, format: 'xlsx' });

    expect(res.status).toBe(400);
  });

  it('exposes the export filename header to cross-origin callers', async () => {
    const res = await request(app.getHttpServer())
      .post('/reports/time/export')
      .set('Authorization', bearer(adminToken))
      .send({ dateFrom: DATE_FROM, dateTo: DATE_TO });

    expect(res.status).toBe(200);
    // Without this, browsers cannot read Content-Disposition on cross-origin
    // downloads and the file loses its real .csv/.pdf name.
    expect(res.headers['access-control-expose-headers']).toContain(
      'Content-Disposition',
    );
    expect(res.headers['content-disposition']).toContain('.csv');
  });

  it('rejects member report access', async () => {
    const report = await getReport(memberToken, {});
    expect(report.status).toBe(403);
  });
});

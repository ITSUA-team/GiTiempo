import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, gte, lt } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  projects,
  tasks,
  timeEntries,
  users,
  workspaceMembers,
  workspaces,
} from '../src/db/schema';
import { bearer, login } from './helpers/auth';
import { getSeededAdminWorkspace } from './helpers/seeded-workspace';
import { ReportsService } from '../src/reports/services/reports.service';

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

  it('groups the whole report by billable status', async () => {
    const res = await getReport(adminToken, { groupBy: ['billable'] });

    expect(res.status).toBe(200);
    expect(res.body.groupBy).toEqual(['billable']);
    // Admin scope: billable 10800+5400+900 = 17100, non-billable 1800.
    expect(res.body.items).toHaveLength(2);
    const billable = res.body.items.find(
      (item: { billable: string | null }) => item.billable === 'billable',
    );
    const nonBillable = res.body.items.find(
      (item: { billable: string | null }) => item.billable === 'nonBillable',
    );
    expect(billable).toMatchObject({
      billable: 'billable',
      project: null,
      totalSeconds: 17100,
      billableSeconds: 17100,
    });
    expect(nonBillable).toMatchObject({
      billable: 'nonBillable',
      totalSeconds: 1800,
      nonBillableSeconds: 1800,
    });
  });

  it('splits each project into billable and non-billable sub-groups', async () => {
    const res = await getReport(adminToken, {
      groupBy: ['project', 'billable'],
    });

    expect(res.status).toBe(200);
    const platformRows = res.body.items.filter(
      (item: { project: { id: string } | null }) =>
        item.project?.id === platformProjectId,
    );
    const billable = platformRows.find(
      (row: { billable: string | null }) => row.billable === 'billable',
    );
    const nonBillable = platformRows.find(
      (row: { billable: string | null }) => row.billable === 'nonBillable',
    );

    expect(billable).toMatchObject({
      billable: 'billable',
      totalSeconds: 10800,
      billableSeconds: 10800,
      nonBillableSeconds: 0,
      entryCount: 2,
    });
    expect(nonBillable).toMatchObject({
      billable: 'nonBillable',
      totalSeconds: 1800,
      billableSeconds: 0,
      nonBillableSeconds: 1800,
      entryCount: 1,
    });
  });

  it('renders a PDF grouped by billable without error', async () => {
    const res = await request(app.getHttpServer())
      .post('/reports/time/export')
      .set('Authorization', bearer(adminToken))
      .send({
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        format: 'pdf',
        groupBy: ['project', 'billable'],
      })
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect((res.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
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

  function sampleReportDocument() {
    return {
      columns: ['NAME', 'HOURS', 'BILLABLE', 'BILL %'],
      filters: 'Projects: All · Members: All · Grouping: Project',
      footerNote: 'Generated with GiTiempo · Mar 1, 2027',
      masthead: { tag: 'TIME REPORT', wordmark: 'GiTiempo' },
      period: 'Mar 1, 2027 – Apr 1, 2027 · Workspace',
      rows: [
        {
          billable: '10h 00m',
          detail: null,
          hours: '12h 30m',
          isLeaf: true,
          label: 'Internal Platform',
          level: 0,
          share: '80%',
        },
      ],
      stats: [
        { label: 'TRACKED HOURS', value: '12h 30m' },
        { label: 'BILLABLE', value: '10h 00m · 80%' },
      ],
      title: 'Time report',
      total: {
        billable: '10h 00m',
        hours: '12h 30m',
        label: 'Total',
        share: '80%',
      },
    };
  }

  it('styles a client-built report document into a PDF', async () => {
    const res = await request(app.getHttpServer())
      .post('/reports/time/export/pdf')
      .set('Authorization', bearer(adminToken))
      .send({ document: sampleReportDocument() })
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect((res.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('rejects report-document rendering for members', async () => {
    const res = await request(app.getHttpServer())
      .post('/reports/time/export/pdf')
      .set('Authorization', bearer(memberToken))
      .send({ document: sampleReportDocument() });

    expect(res.status).toBe(403);
  });

  it('rejects a report document that violates the bounded schema', async () => {
    const res = await request(app.getHttpServer())
      .post('/reports/time/export/pdf')
      .set('Authorization', bearer(adminToken))
      .send({
        document: {
          ...sampleReportDocument(),
          rows: [
            {
              billable: '0h 00m',
              detail: null,
              hours: '0h 00m',
              isLeaf: true,
              // Over the 300-char label cap → schema rejects before rendering.
              label: 'x'.repeat(301),
              level: 0,
              share: '0%',
            },
          ],
        },
      });

    expect(res.status).toBe(400);
  });

  // The PDF prints the names of the project and member filters. Those lookups
  // are separate from the row query, so they need the same scope: matching on
  // id alone let any id in the database be resolved to a name.
  describe('PDF filter labels stay inside the caller scope', () => {
    async function labelsFor(
      token: string,
      query: Record<string, unknown>,
    ): Promise<{ memberLabel: string | null; projectLabel: string | null }> {
      const service = app.get(ReportsService);
      const user = { ...decode(token) };
      const context = await (
        service as unknown as {
          buildQueryContext: (u: unknown, q: unknown) => Promise<unknown>;
        }
      ).buildQueryContext(user, {
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        format: 'pdf',
        groupBy: ['project'],
        sortBy: 'totalSeconds',
        sortOrder: 'desc',
        ...query,
      });

      return (
        service as unknown as {
          getExportFilterLabels: (
            c: unknown,
            q: unknown,
          ) => Promise<{
            memberLabel: string | null;
            projectLabel: string | null;
          }>;
        }
      ).getExportFilterLabels(context, { ...query });
    }

    function decode(token: string) {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1]!, 'base64url').toString('utf8'),
      ) as Record<string, unknown>;

      return payload;
    }

    it('resolves an in-scope project name for an admin', async () => {
      const labels = await labelsFor(adminToken, {
        projectId: platformProjectId,
      });

      expect(labels.projectLabel).toBe('Internal Platform');
    });

    it('hides a project belonging to another workspace', async () => {
      const [otherWorkspace] = await db
        .insert(workspaces)
        .values({ name: 'Reports Foreign Workspace' })
        .returning({ id: workspaces.id });
      const [foreignProject] = await db
        .insert(projects)
        .values({
          name: 'Foreign Secret Project',
          visibility: 'public',
          workspaceId: otherWorkspace!.id,
        })
        .returning({ id: projects.id });

      try {
        const labels = await labelsFor(adminToken, {
          projectId: foreignProject!.id,
        });

        expect(labels.projectLabel).toBeNull();
      } finally {
        await db.delete(projects).where(eq(projects.id, foreignProject!.id));
        await db
          .delete(workspaces)
          .where(eq(workspaces.id, otherWorkspace!.id));
      }
    });

    it('hides a private project a PM is not assigned to', async () => {
      const labels = await labelsFor(pmToken, { projectId: probeProjectId });

      expect(labels.projectLabel).toBeNull();
    });

    it('hides a user who is not a member of this workspace', async () => {
      const [outsider] = await db
        .insert(users)
        .values({
          email: 'outsider@elsewhere.test',
          displayName: 'Outsider Person',
          firebaseUid: 'reports-outsider-uid',
        })
        .returning({ id: users.id });

      try {
        const labels = await labelsFor(adminToken, { userId: outsider!.id });

        expect(labels.memberLabel).toBeNull();
      } finally {
        await db.delete(users).where(eq(users.id, outsider!.id));
      }
    });

    it('resolves a member of this workspace', async () => {
      const labels = await labelsFor(adminToken, { userId: bobUserId });

      expect(labels.memberLabel).toBeTruthy();
    });

    it('hides a member whose time is only in a project the PM cannot see', async () => {
      // A real workspace member whose sole entry is in the probe project,
      // which the PM is not assigned to. The PM must not read their name off
      // the PDF even though they share a workspace.
      const [hidden] = await db
        .insert(users)
        .values({
          email: 'hidden-worker@elsewhere.test',
          displayName: 'Hidden Worker',
          firebaseUid: 'reports-hidden-worker-uid',
        })
        .returning({ id: users.id });
      await db.insert(workspaceMembers).values({
        workspaceId,
        userId: hidden!.id,
        role: 'member',
      });
      await db.insert(timeEntries).values({
        workspaceId,
        taskId: probeTaskId,
        userId: hidden!.id,
        source: 'manual' as const,
        startedAt: new Date('2027-03-07T10:00:00.000Z'),
        endedAt: new Date('2027-03-07T11:00:00.000Z'),
        durationSeconds: 3600,
        isBillable: true,
      });

      try {
        const pmLabels = await labelsFor(pmToken, { userId: hidden!.id });
        const adminLabels = await labelsFor(adminToken, { userId: hidden!.id });

        expect(pmLabels.memberLabel).toBeNull();
        expect(adminLabels.memberLabel).toBe('Hidden Worker');
      } finally {
        await db.delete(timeEntries).where(eq(timeEntries.userId, hidden!.id));
        await db
          .delete(workspaceMembers)
          .where(eq(workspaceMembers.userId, hidden!.id));
        await db.delete(users).where(eq(users.id, hidden!.id));
      }
    });
  });
});

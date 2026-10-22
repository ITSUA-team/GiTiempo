import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { and, eq, gte, inArray, lt } from 'drizzle-orm';
import type { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE, PG_POOL } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  invoices,
  projects,
  tasks,
  timeEntries,
  users,
  workspaceSettings,
} from '../src/db/schema';
import { bearer, login } from './helpers/auth';
import { getSeededAdminWorkspace } from './helpers/seeded-workspace';

const DATE_FROM = '2027-06-01';
const DATE_TO = '2027-06-30';
const ISO_FROM = '2027-06-01T00:00:00.000Z';
const ISO_TO = '2027-07-01T00:00:00.000Z';
const PROBE_PROJECT_NAME = 'Invoice Probe Project';
const PUBLIC_PROJECT_NAME = 'Invoice Public Project';
const ROUNDED_PROJECT_NAME = 'Invoice Rounding Project';
const INHERIT_PROJECT_NAME = 'Invoice Inherit Project';

// Rounding-suite fixture entries (4-series) live in far-future windows.
const ROUNDING_ENTRY_1 = '00000000-0000-4000-8000-400000000001';
const ROUNDING_ENTRY_2 = '00000000-0000-4000-8000-400000000002';
const ROUNDING_ENTRY_3 = '00000000-0000-4000-8000-400000000003';
const ROUNDING_ENTRY_4 = '00000000-0000-4000-8000-400000000004';
const ROUNDING_ENTRY_5 = '00000000-0000-4000-8000-400000000005';
const ROUNDING_ENTRY_6 = '00000000-0000-4000-8000-400000000006';
const ROUNDING_ENTRY_7 = '00000000-0000-4000-8000-400000000007';
const ROUNDING_ENTRY_8 = '00000000-0000-4000-8000-400000000008';

// Fixed UUIDs for fixture time entries so we can reference them across tests.
const ENTRY_BOB_1 = '00000000-0000-4000-8000-100000000001';
const ENTRY_BOB_2 = '00000000-0000-4000-8000-100000000002';
const ENTRY_BOB_NON_BILLABLE = '00000000-0000-4000-8000-100000000003';
const ENTRY_PROBE_1 = '00000000-0000-4000-8000-100000000004';
const ENTRY_RUNNING = '00000000-0000-4000-8000-100000000005';
const ENTRY_DISCOUNT = '00000000-0000-4000-8000-100000000006';

// A syntactically valid project UUID that has no invoices in the workspace.
const UNKNOWN_PROJECT_ID = '00000000-0000-4000-8000-999999999997';

// Shared matcher for response fields that must be UUID-shaped.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PLATFORM_PROJECT_ID = '00000000-0000-4000-8000-000000000004';
const CLIENT_PROJECT_ID = '00000000-0000-4000-8000-000000000005';
const PLATFORM_API_TASK_ID = '00000000-0000-4000-8000-000000000101';

describe('Invoices (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let adminToken: string;
  let pmToken: string;
  let memberToken: string;
  let workspaceId: string;
  let probeProjectId: string;
  let publicProjectId: string;
  let probeTaskId: string;
  let roundingProjectId: string;
  let inheritProjectId: string;
  let roundingTaskId: string;
  let inheritTaskId: string;
  let bobUserId: string;

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

    bobUserId = await findUserId('seed-user-2');

    // Create a private project the seeded PM (alice) is NOT assigned to.
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
        title: 'Invoice probe task',
      })
      .returning({ id: tasks.id });
    probeTaskId = probeTask!.id;

    // Create a public project the seeded PM (alice) is NOT assigned to, to
    // verify the public-visibility half of the PM scope.
    const [publicProject] = await db
      .insert(projects)
      .values({
        workspaceId,
        name: PUBLIC_PROJECT_NAME,
        visibility: 'public',
        isActive: true,
      })
      .returning({ id: projects.id });
    publicProjectId = publicProject!.id;

    // Rounding-step fixtures: one project with an explicit step and one
    // inheriting the workspace setting (null).
    const [roundingProject] = await db
      .insert(projects)
      .values({
        workspaceId,
        name: ROUNDED_PROJECT_NAME,
        visibility: 'public',
        isActive: true,
        timeRoundingStepMinutes: 5,
      })
      .returning({ id: projects.id });
    roundingProjectId = roundingProject!.id;

    const [inheritProject] = await db
      .insert(projects)
      .values({
        workspaceId,
        name: INHERIT_PROJECT_NAME,
        visibility: 'public',
        isActive: true,
      })
      .returning({ id: projects.id });
    inheritProjectId = inheritProject!.id;

    const [roundingTask] = await db
      .insert(tasks)
      .values({
        workspaceId,
        projectId: roundingProjectId,
        title: 'Rounding task',
      })
      .returning({ id: tasks.id });
    roundingTaskId = roundingTask!.id;

    const [inheritTask] = await db
      .insert(tasks)
      .values({
        workspaceId,
        projectId: inheritProjectId,
        title: 'Inherit task',
      })
      .returning({ id: tasks.id });
    inheritTaskId = inheritTask!.id;

    // Insert fixture time entries in the 2027-06 window.
    await db.insert(timeEntries).values([
      {
        id: ENTRY_BOB_1,
        workspaceId,
        taskId: PLATFORM_API_TASK_ID,
        userId: bobUserId,
        source: 'manual',
        startedAt: new Date('2027-06-02T10:00:00.000Z'),
        endedAt: new Date('2027-06-02T12:00:00.000Z'),
        durationSeconds: 7200,
        isBillable: true,
      },
      {
        id: ENTRY_BOB_2,
        workspaceId,
        taskId: PLATFORM_API_TASK_ID,
        userId: bobUserId,
        source: 'manual',
        startedAt: new Date('2027-06-03T10:00:00.000Z'),
        endedAt: new Date('2027-06-03T11:00:00.000Z'),
        durationSeconds: 3600,
        isBillable: true,
      },
      {
        id: ENTRY_BOB_NON_BILLABLE,
        workspaceId,
        taskId: PLATFORM_API_TASK_ID,
        userId: bobUserId,
        source: 'manual',
        startedAt: new Date('2027-06-04T10:00:00.000Z'),
        endedAt: new Date('2027-06-04T11:00:00.000Z'),
        durationSeconds: 3600,
        isBillable: false,
      },
      {
        id: ENTRY_PROBE_1,
        workspaceId,
        taskId: probeTaskId,
        userId: bobUserId,
        source: 'manual',
        startedAt: new Date('2027-06-05T10:00:00.000Z'),
        endedAt: new Date('2027-06-05T11:30:00.000Z'),
        durationSeconds: 5400,
        isBillable: true,
      },
    ]);

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

  async function cleanupFixtures(): Promise<void> {
    // Clear invoice links on fixture entries first.
    await db
      .update(timeEntries)
      .set({ invoiceId: null })
      .where(
        and(
          eq(timeEntries.workspaceId, workspaceId),
          gte(timeEntries.startedAt, new Date(ISO_FROM)),
          lt(timeEntries.startedAt, new Date(ISO_TO)),
        ),
      );
    // Delete fixture time entries.
    await db
      .delete(timeEntries)
      .where(
        and(
          eq(timeEntries.workspaceId, workspaceId),
          gte(timeEntries.startedAt, new Date(ISO_FROM)),
          lt(timeEntries.startedAt, new Date(ISO_TO)),
        ),
      );
    // Rounding-suite fixtures are keyed by id (far-future windows).
    await db
      .delete(timeEntries)
      .where(
        inArray(timeEntries.id, [
          ROUNDING_ENTRY_1,
          ROUNDING_ENTRY_2,
          ROUNDING_ENTRY_3,
          ROUNDING_ENTRY_4,
          ROUNDING_ENTRY_5,
          ROUNDING_ENTRY_6,
          ROUNDING_ENTRY_7,
          ROUNDING_ENTRY_8,
        ]),
      );
    // Delete any invoices created in this workspace during the test.
    await db.delete(invoices).where(eq(invoices.workspaceId, workspaceId));
    // Delete fixture projects (probe + public scope).
    const fixtureProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, workspaceId),
          inArray(projects.name, [
            PROBE_PROJECT_NAME,
            PUBLIC_PROJECT_NAME,
            ROUNDED_PROJECT_NAME,
            INHERIT_PROJECT_NAME,
          ]),
        ),
      );
    for (const p of fixtureProjects) {
      await db.delete(tasks).where(eq(tasks.projectId, p.id));
      await db.delete(projects).where(eq(projects.id, p.id));
    }
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

  // Admin/PM GET /invoices with query params; typed loosely like the
  // inline request calls used throughout the suite.
  function listInvoices(token: string, query: Record<string, string>) {
    return request(app.getHttpServer())
      .get('/invoices')
      .set('Authorization', bearer(token))
      .query(query);
  }

  function titlesOf(res: {
    body: { items: Array<{ title: string }> };
  }): string[] {
    return res.body.items.map((item) => item.title);
  }

  /** Reads the seeded workspace's rounding step so temp changes can be restored. */
  async function readWorkspaceRoundingStep(): Promise<number | null> {
    const [row] = await db
      .select({ step: workspaceSettings.timeRoundingStepMinutes })
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, workspaceId))
      .limit(1);
    return row?.step ?? null;
  }

  // ── Authorization ─────────────────────────────────────────────────────

  it('rejects members on list, create, get, update, and delete', async () => {
    const unavailableInvoiceId = '00000000-0000-4000-8000-999999999998';

    const listRes = await request(app.getHttpServer())
      .get('/invoices')
      .set('Authorization', bearer(memberToken));
    expect(listRes.status).toBe(403);

    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(memberToken))
      .send({ title: 'Test', dateFrom: DATE_FROM, dateTo: DATE_TO });
    expect(createRes.status).toBe(403);

    const getRes = await request(app.getHttpServer())
      .get(`/invoices/${unavailableInvoiceId}`)
      .set('Authorization', bearer(memberToken));
    expect(getRes.status).toBe(403);

    const patchRes = await request(app.getHttpServer())
      .patch(`/invoices/${unavailableInvoiceId}`)
      .set('Authorization', bearer(memberToken))
      .send({ status: 'sent' });
    expect(patchRes.status).toBe(403);

    const deleteRes = await request(app.getHttpServer())
      .delete(`/invoices/${unavailableInvoiceId}`)
      .set('Authorization', bearer(memberToken));
    expect(deleteRes.status).toBe(403);
  });

  it('rejects PM deletion (admin-only)', async () => {
    // First create an invoice as admin so we have an id to try deleting.
    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'PM Delete Probe',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        projectId: PLATFORM_PROJECT_ID,
        hourlyRate: 50,
      });
    expect(createRes.status).toBe(201);
    const invoiceId = createRes.body.id;

    const deleteRes = await request(app.getHttpServer())
      .delete(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(pmToken));
    expect(deleteRes.status).toBe(403);

    // Cleanup: admin deletes it.
    await request(app.getHttpServer())
      .delete(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(adminToken));
  });

  // ── Create and eligibility ────────────────────────────────────────────

  it('admin creates an invoice that selects only eligible billable completed entries', async () => {
    const res = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Platform Invoice',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        projectId: PLATFORM_PROJECT_ID,
        hourlyRate: 75,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('draft');
    expect(res.body.project.id).toBe(PLATFORM_PROJECT_ID);
    // 7200 + 3600 = 10800 seconds = 3 hours; non-billable excluded.
    expect(res.body.totalHours).toBe(3);
    expect(res.body.totalAmount).toBe(225); // 3 * 75
    expect(res.body.timeEntryCount).toBe(2);
    // The non-billable entry must not be in the linked entries.
    const linkedIds = res.body.timeEntries.map((e: { id: string }) => e.id);
    expect(linkedIds).toContain(ENTRY_BOB_1);
    expect(linkedIds).toContain(ENTRY_BOB_2);
    expect(linkedIds).not.toContain(ENTRY_BOB_NON_BILLABLE);
  });

  it('excludes already-invoiced entries from a second invoice', async () => {
    // The previous test invoiced ENTRY_BOB_1 and ENTRY_BOB_2.
    // Create another invoice for the same project — only entries not yet
    // invoiced should appear (none eligible → zero totals).
    const res = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Platform Invoice 2',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        projectId: PLATFORM_PROJECT_ID,
        hourlyRate: 75,
      });

    expect(res.status).toBe(201);
    expect(res.body.timeEntryCount).toBe(0);
    expect(res.body.totalHours).toBe(0);
    expect(res.body.totalAmount).toBe(0);
  });

  it('excludes running entries (null endedAt) from eligibility', async () => {
    // All completed platform entries are invoiced by now, so a running one
    // must not make this invoice pick anything up.
    await db.insert(timeEntries).values({
      id: ENTRY_RUNNING,
      workspaceId,
      taskId: PLATFORM_API_TASK_ID,
      userId: bobUserId,
      source: 'manual',
      startedAt: new Date('2027-06-06T16:00:00.000Z'),
      endedAt: null,
      durationSeconds: null,
      isBillable: true,
    });

    const res = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Running Entry Probe',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        projectId: PLATFORM_PROJECT_ID,
        hourlyRate: 75,
      });

    expect(res.status).toBe(201);
    expect(res.body.timeEntryCount).toBe(0);

    const [entry] = await db
      .select({ invoiceId: timeEntries.invoiceId })
      .from(timeEntries)
      .where(eq(timeEntries.id, ENTRY_RUNNING))
      .limit(1);
    expect(entry?.invoiceId).toBeNull();

    // Keep the running entry from leaking into later assertions.
    await db.delete(timeEntries).where(eq(timeEntries.id, ENTRY_RUNNING));
  });

  it('rejects PM invoice creation for an unassigned private project', async () => {
    const res = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(pmToken))
      .send({
        title: 'Probe Invoice',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        projectId: probeProjectId,
        hourlyRate: 50,
      });

    expect(res.status).toBe(403);
  });

  it('allows PM invoice creation for an assigned project', async () => {
    const res = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(pmToken))
      .send({
        title: 'Client Invoice by PM',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        projectId: CLIENT_PROJECT_ID,
        hourlyRate: 60,
      });

    expect(res.status).toBe(201);
    expect(res.body.project.id).toBe(CLIENT_PROJECT_ID);
  });

  it('allows PM invoice creation for an unassigned public project', async () => {
    const res = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(pmToken))
      .send({
        title: 'Public Invoice by PM',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        projectId: publicProjectId,
        hourlyRate: 65,
      });

    expect(res.status).toBe(201);
    expect(res.body.project.id).toBe(publicProjectId);
    // Workspace defaults are snapshotted when omitted.
    expect(res.body.currency).toBe('USD');
    // Discount defaults to zero when omitted.
    expect(res.body.discountPercent).toBe(0);

    // Cleanup: PMs cannot delete, so remove the probe invoice as admin.
    const deleteRes = await request(app.getHttpServer())
      .delete(`/invoices/${res.body.id}`)
      .set('Authorization', bearer(adminToken));
    expect(deleteRes.status).toBe(204);
  });

  it('rejects PM invoice creation without a project scope', async () => {
    const res = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(pmToken))
      .send({
        title: 'Workspace-wide Invoice via PM',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        hourlyRate: 50,
      });

    expect(res.status).toBe(403);
  });

  it('falls back to workspace default hourly rate when omitted', async () => {
    const res = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Default Rate Invoice',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        projectId: probeProjectId,
      });

    expect(res.status).toBe(201);
    // Workspace default rate is 100; probe has 5400s = 1.5h → 150.
    // With both rate and currency omitted both must come from settings.
    expect(res.body.hourlyRate).toBe(100);
    expect(res.body.currency).toBe('USD');
    expect(res.body.totalHours).toBe(1.5);
    expect(res.body.totalAmount).toBe(150);
  });

  it('rejects invalid create payloads', async () => {
    const unknownProp = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Bad',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        unknown: true,
      });
    expect(unknownProp.status).toBe(400);

    const badDiscount = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Bad Discount',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        projectId: PLATFORM_PROJECT_ID,
        discountPercent: 150,
      });
    expect(badDiscount.status).toBe(400);

    const reversedDates = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Reversed',
        dateFrom: DATE_TO,
        dateTo: DATE_FROM,
      });
    expect(reversedDates.status).toBe(400);
  });

  it('applies discountPercent to the snapshot totals', async () => {
    // Fresh billable entry outside the June window so no other invoice
    // competes for it during this test.
    await db.insert(timeEntries).values({
      id: ENTRY_DISCOUNT,
      workspaceId,
      taskId: PLATFORM_API_TASK_ID,
      userId: bobUserId,
      source: 'manual',
      startedAt: new Date('2027-07-20T10:00:00.000Z'),
      endedAt: new Date('2027-07-20T12:00:00.000Z'),
      durationSeconds: 7200,
      isBillable: true,
    });

    const res = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Discount Probe',
        dateFrom: '2027-07-01',
        dateTo: '2027-07-31',
        projectId: PLATFORM_PROJECT_ID,
        hourlyRate: 40,
        discountPercent: 25,
      });

    expect(res.status).toBe(201);
    expect(res.body.discountPercent).toBe(25);
    expect(res.body.timeEntryCount).toBe(1);
    expect(res.body.totalHours).toBe(2);
    // 2h * 40 * 0.75 = 60
    expect(res.body.totalAmount).toBe(60);

    // Cleanup: the API delete unlinks the entry, then drop the fixture entry.
    await request(app.getHttpServer())
      .delete(`/invoices/${res.body.id}`)
      .set('Authorization', bearer(adminToken));
    await db.delete(timeEntries).where(eq(timeEntries.id, ENTRY_DISCOUNT));
  });

  it('normalizes a lowercase currency to uppercase in the snapshot', async () => {
    const res = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Currency Probe',
        dateFrom: '2099-06-01',
        dateTo: '2099-06-30',
        hourlyRate: 25,
        currency: 'eur',
      });

    expect(res.status).toBe(201);
    expect(res.body.currency).toBe('EUR');
    // An explicit rate wins over the workspace default (100).
    expect(res.body.hourlyRate).toBe(25);

    await request(app.getHttpServer())
      .delete(`/invoices/${res.body.id}`)
      .set('Authorization', bearer(adminToken));
  });

  it('persists notes and defaults omitted or null notes to null', async () => {
    const base = { dateFrom: '2099-07-01', dateTo: '2099-07-31' };

    const withNotes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({ title: 'Notes Probe', ...base, notes: 'Preliminary notes' });
    expect(withNotes.status).toBe(201);
    expect(withNotes.body.notes).toBe('Preliminary notes');

    const omittedNotes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({ title: 'Notes Omitted Probe', ...base });
    expect(omittedNotes.status).toBe(201);
    expect(omittedNotes.body.notes).toBeNull();

    const explicitNull = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({ title: 'Notes Null Probe', ...base, notes: null });
    expect(explicitNull.status).toBe(201);
    expect(explicitNull.body.notes).toBeNull();

    for (const id of [
      withNotes.body.id,
      omittedNotes.body.id,
      explicitNull.body.id,
    ]) {
      await request(app.getHttpServer())
        .delete(`/invoices/${id}`)
        .set('Authorization', bearer(adminToken));
    }
  });

  // ── List and detail ───────────────────────────────────────────────────

  it('admin lists all workspace invoices', async () => {
    const res = await request(app.getHttpServer())
      .get('/invoices')
      .set('Authorization', bearer(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(3);
  });

  it('PM lists only invoices for assigned projects', async () => {
    const res = await request(app.getHttpServer())
      .get('/invoices')
      .set('Authorization', bearer(pmToken));

    expect(res.status).toBe(200);
    // PM (alice) is assigned to Internal Platform and Demo Client, NOT probe.
    for (const item of res.body.items) {
      expect(item.project).not.toBeNull();
      expect(item.project.id).not.toBe(probeProjectId);
    }
  });

  it('PM sees invoices for public projects without explicit assignment', async () => {
    // Public, active, but NOT assigned to alice — an unassigned public
    // project must still be visible to PMs, matching the reports scope.
    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Public Scope Invoice',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        projectId: publicProjectId,
        hourlyRate: 55,
      });
    expect(createRes.status).toBe(201);

    const res = await request(app.getHttpServer())
      .get('/invoices')
      .set('Authorization', bearer(pmToken));

    expect(res.status).toBe(200);
    const titles = res.body.items.map((i: { title: string }) => i.title);
    expect(titles).toContain('Public Scope Invoice');
    // The private unassigned probe remains invisible to the PM.
    for (const item of res.body.items) {
      expect(item.project?.id).not.toBe(probeProjectId);
    }
  });

  // ── List shape, filtering, and pagination ────────────────────────────

  it('list items expose timeEntryCount but omit timeEntries', async () => {
    const res = await listInvoices(adminToken, {});

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(6);
    // Single page: every invoice fits under the default limit.
    expect(res.body.meta.total).toBe(res.body.items.length);

    for (const item of res.body.items) {
      // List items must not leak the full entry array; only the count.
      expect(item.timeEntries).toBeUndefined();
      expect('timeEntries' in item).toBe(false);
      expect(typeof item.timeEntryCount).toBe('number');
    }
  });

  it('list filters by projectId', async () => {
    const publicRes = await listInvoices(adminToken, {
      projectId: publicProjectId,
    });

    expect(publicRes.status).toBe(200);
    expect(publicRes.body.items).toHaveLength(1);
    expect(publicRes.body.items[0].title).toBe('Public Scope Invoice');
    expect(publicRes.body.items[0].project.id).toBe(publicProjectId);

    const probeRes = await listInvoices(adminToken, {
      projectId: probeProjectId,
    });

    expect(probeRes.status).toBe(200);
    expect(probeRes.body.items).toHaveLength(1);
    expect(probeRes.body.items[0].title).toBe('Default Rate Invoice');
    expect(probeRes.body.items[0].project.id).toBe(probeProjectId);

    // A syntactically valid but unknown project id matches nothing.
    const unknownRes = await listInvoices(adminToken, {
      projectId: UNKNOWN_PROJECT_ID,
    });

    expect(unknownRes.status).toBe(200);
    expect(unknownRes.body.items).toHaveLength(0);
  });

  it('list filters by status', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Status Filter Probe',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        projectId: PLATFORM_PROJECT_ID,
        hourlyRate: 90,
      });
    expect(createRes.status).toBe(201);

    const patchRes = await request(app.getHttpServer())
      .patch(`/invoices/${createRes.body.id}`)
      .set('Authorization', bearer(adminToken))
      .send({ status: 'sent' });
    expect(patchRes.status).toBe(200);

    const sentRes = await listInvoices(adminToken, { status: 'sent' });
    expect(sentRes.status).toBe(200);
    expect(sentRes.body.items).toHaveLength(1);
    expect(sentRes.body.items[0].status).toBe('sent');
    expect(sentRes.body.items[0].title).toBe('Status Filter Probe');

    const draftRes = await listInvoices(adminToken, { status: 'draft' });
    expect(draftRes.status).toBe(200);
    expect(draftRes.body.items.length).toBeGreaterThan(0);
    expect(
      draftRes.body.items.map((i: { title: string }) => i.title),
    ).not.toContain('Status Filter Probe');
    for (const item of draftRes.body.items) {
      expect(item.status).toBe('draft');
    }

    // Invoice is 'sent' and cannot be deleted (only draft is deletable);
    // cleanupFixtures in afterAll handles removal via direct DB access.
  });

  it('list searches invoice titles case-insensitively', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'MixedCase Probe Alpha',
        dateFrom: '2099-08-01',
        dateTo: '2099-08-31',
      });
    expect(createRes.status).toBe(201);

    const lowerRes = await listInvoices(adminToken, {
      search: 'mixedcase probe alpha',
    });
    expect(lowerRes.status).toBe(200);
    expect(lowerRes.body.items).toHaveLength(1);
    expect(lowerRes.body.items[0].title).toBe('MixedCase Probe Alpha');

    const upperRes = await listInvoices(adminToken, {
      search: 'MIXEDCASE PROBE ALPHA',
    });
    expect(upperRes.status).toBe(200);
    expect(upperRes.body.items).toHaveLength(1);
    expect(upperRes.body.items[0].title).toBe('MixedCase Probe Alpha');

    const missRes = await listInvoices(adminToken, {
      search: 'zzzno-matchzzz',
    });
    expect(missRes.status).toBe(200);
    expect(missRes.body.items).toHaveLength(0);

    await request(app.getHttpServer())
      .delete(`/invoices/${createRes.body.id}`)
      .set('Authorization', bearer(adminToken));
  });

  // KNOWN PRODUCTION BUG: `invoices.service.ts` builds its search predicate
  // as sql`${title} ILIKE ${pattern} ESCAPE '\'` inside a template literal,
  // where \' collapses to a bare quote — Postgres receives `ESCAPE ''`,
  // which disables the escape character entirely. The backslashes from
  // escapeLikePattern then require literal backslashes in titles, so ANY
  // search term containing `_`, `%` or `\` silently matches nothing.
  it('escapes LIKE special characters in the search term', async () => {
    const titles = [
      'Like_1 Probe',
      'Like%2 Probe',
      'Like\\3 Probe',
      'LikeA1 Decoy Probe',
      'Like2 Decoy Probe',
      'Like3 Decoy Probe',
    ];

    const created = await Promise.all(
      titles.map((title) =>
        request(app.getHttpServer())
          .post('/invoices')
          .set('Authorization', bearer(adminToken))
          .send({
            title,
            dateFrom: '2099-09-01',
            dateTo: '2099-09-30',
          }),
      ),
    );
    for (const createRes of created) {
      expect(createRes.status).toBe(201);
    }

    // Sanity: prefix search sees every fixture invoice.
    const prefixRes = await listInvoices(adminToken, { search: 'Like' });
    expect(prefixRes.body.items.length).toBeGreaterThanOrEqual(6);

    // Unescaped LIKE would also match "LikeA1 Decoy Probe" via the wildcard.
    const underscoreRes = await listInvoices(adminToken, { search: 'Like_1' });
    expect(underscoreRes.status).toBe(200);
    expect(titlesOf(underscoreRes)).toEqual(['Like_1 Probe']);

    // Unescaped LIKE would also match "Like2 Decoy Probe".
    const percentRes = await listInvoices(adminToken, { search: 'Like%2' });
    expect(percentRes.status).toBe(200);
    expect(titlesOf(percentRes)).toEqual(['Like%2 Probe']);

    // Unescaped LIKE would match "Like3 Decoy Probe" instead of the
    // backslash title.
    const backslashRes = await listInvoices(adminToken, { search: 'Like\\3' });
    expect(backslashRes.status).toBe(200);
    expect(titlesOf(backslashRes)).toEqual(['Like\\3 Probe']);

    for (const createRes of created) {
      await request(app.getHttpServer())
        .delete(`/invoices/${createRes.body.id}`)
        .set('Authorization', bearer(adminToken));
    }
  });

  it('list filters by dateFrom and dateTo bounds', async () => {
    const rangeA = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Date Bound A',
        dateFrom: '2099-01-05',
        dateTo: '2099-01-10',
      });
    expect(rangeA.status).toBe(201);

    const rangeB = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Date Bound B',
        dateFrom: '2099-02-15',
        dateTo: '2099-02-20',
      });
    expect(rangeB.status).toBe(201);

    // Sanity: both fixture invoices match on title alone.
    const both = await listInvoices(adminToken, { search: 'Date Bound' });
    expect(both.status).toBe(200);
    expect(titlesOf(both)).toHaveLength(2);

    // dateFrom excludes invoices whose invoice dateFrom starts earlier.
    const fromRes = await listInvoices(adminToken, {
      search: 'Date Bound',
      dateFrom: '2099-02-01',
    });
    expect(fromRes.status).toBe(200);
    expect(titlesOf(fromRes)).toEqual(['Date Bound B']);

    // dateTo excludes invoices whose invoice dateTo ends later.
    const toRes = await listInvoices(adminToken, {
      search: 'Date Bound',
      dateTo: '2099-01-31',
    });
    expect(toRes.status).toBe(200);
    expect(titlesOf(toRes)).toEqual(['Date Bound A']);

    for (const id of [rangeA.body.id, rangeB.body.id]) {
      await request(app.getHttpServer())
        .delete(`/invoices/${id}`)
        .set('Authorization', bearer(adminToken));
    }
  });

  it('list combines projectId, status and date range filters', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Combined Probe',
        dateFrom: '2099-03-10',
        dateTo: '2099-03-20',
        projectId: PLATFORM_PROJECT_ID,
        hourlyRate: 99,
      });
    expect(createRes.status).toBe(201);

    const patchRes = await request(app.getHttpServer())
      .patch(`/invoices/${createRes.body.id}`)
      .set('Authorization', bearer(adminToken))
      .send({ status: 'sent' });
    expect(patchRes.status).toBe(200);

    const combined = await listInvoices(adminToken, {
      projectId: PLATFORM_PROJECT_ID,
      status: 'sent',
      dateFrom: '2099-03-01',
      dateTo: '2099-03-31',
      search: 'Combined',
    });
    expect(combined.status).toBe(200);
    expect(titlesOf(combined)).toEqual(['Combined Probe']);

    // Any single mismatching filter must exclude it.
    const mismatched = await listInvoices(adminToken, {
      projectId: PLATFORM_PROJECT_ID,
      status: 'draft',
      dateFrom: '2099-03-01',
      dateTo: '2099-03-31',
      search: 'Combined',
    });
    expect(mismatched.status).toBe(200);
    expect(mismatched.body.items).toHaveLength(0);

    await request(app.getHttpServer())
      .delete(`/invoices/${createRes.body.id}`)
      .set('Authorization', bearer(adminToken));
  });

  it('list paginates with page and limit', async () => {
    // Created sequentially so createdAt ordering (newest first) is stable.
    const titles = ['Page Probe One', 'Page Probe Two', 'Page Probe Three'];
    const createdIds: string[] = [];
    for (const title of titles) {
      const res = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', bearer(adminToken))
        .send({
          title,
          dateFrom: '2099-04-01',
          dateTo: '2099-04-30',
        });
      expect(res.status).toBe(201);
      createdIds.push(res.body.id);
    }

    const page1 = await listInvoices(adminToken, {
      search: 'Page Probe',
      page: '1',
      limit: '2',
    });
    expect(page1.status).toBe(200);
    expect(page1.body.items).toHaveLength(2);
    expect(page1.body.meta).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
    // Sorted newest first: the last-created invoice is on page 1.
    expect(titlesOf(page1)).toEqual(['Page Probe Three', 'Page Probe Two']);

    const page2 = await listInvoices(adminToken, {
      search: 'Page Probe',
      page: '2',
      limit: '2',
    });
    expect(page2.status).toBe(200);
    expect(page2.body.items).toHaveLength(1);
    expect(titlesOf(page2)).toEqual(['Page Probe One']);

    // Beyond the last page: empty items but totals stay accurate.
    const page3 = await listInvoices(adminToken, {
      search: 'Page Probe',
      page: '3',
      limit: '2',
    });
    expect(page3.status).toBe(200);
    expect(page3.body.items).toHaveLength(0);
    expect(page3.body.meta).toEqual({
      page: 3,
      limit: 2,
      total: 3,
      totalPages: 2,
    });

    // Pages must not overlap with or lose the fixture invoices.
    const ids = [...page1.body.items, ...page2.body.items].map(
      (item: { id: string }) => item.id,
    );
    expect(ids).toHaveLength(3);
    expect([...ids].sort()).toEqual([...createdIds].sort());

    for (const id of ids) {
      await request(app.getHttpServer())
        .delete(`/invoices/${id}`)
        .set('Authorization', bearer(adminToken));
    }
  });

  it('returns 404 for a cross-workspace invoice id', async () => {
    const res = await request(app.getHttpServer())
      .get('/invoices/00000000-0000-4000-8000-999999999999')
      .set('Authorization', bearer(adminToken));

    expect(res.status).toBe(404);
  });

  it('admin reads invoice detail with linked entries', async () => {
    // Find the first invoice (Platform Invoice).
    const listRes = await request(app.getHttpServer())
      .get('/invoices')
      .set('Authorization', bearer(adminToken))
      .query({ projectId: PLATFORM_PROJECT_ID });

    const platformInvoice = listRes.body.items.find(
      (i: { title: string }) => i.title === 'Platform Invoice',
    );
    expect(platformInvoice).toBeDefined();

    const res = await request(app.getHttpServer())
      .get(`/invoices/${platformInvoice.id}`)
      .set('Authorization', bearer(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Platform Invoice');
    expect(res.body.timeEntries.length).toBe(2);
  });

  it('detail response returns time entry summaries in contract shape', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/invoices')
      .set('Authorization', bearer(adminToken))
      .query({ projectId: PLATFORM_PROJECT_ID });

    const platformInvoice = listRes.body.items.find(
      (i: { title: string }) => i.title === 'Platform Invoice',
    );
    expect(platformInvoice).toBeDefined();

    const res = await request(app.getHttpServer())
      .get(`/invoices/${platformInvoice.id}`)
      .set('Authorization', bearer(adminToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.timeEntries)).toBe(true);
    expect(res.body.timeEntryCount).toBe(2);
    expect(res.body.timeEntries).toHaveLength(2);

    for (const entry of res.body.timeEntries) {
      // Exact contract shape: ten summary fields, nothing more.
      expect(Object.keys(entry).sort()).toEqual([
        'description',
        'durationSeconds',
        'endedAt',
        'id',
        'isBillable',
        'startedAt',
        'taskId',
        'taskName',
        'userId',
        'userName',
      ]);
      expect(entry.id).toMatch(UUID_RE);
      expect(entry.durationSeconds).toBeGreaterThan(0);
      expect(entry.isBillable).toBe(true);
      expect(entry.description).toBeNull();
      expect(entry.taskId).toBe(PLATFORM_API_TASK_ID);
      expect(entry.userId).toBe(bobUserId);
      expect(entry.userName).toBe('Bob (seed)');
      expect(entry.taskName).toBe('Set up API project foundation');
    }

    // Entries are ordered by startedAt.
    const [first, second] = res.body.timeEntries;
    expect(first.startedAt).toBe('2027-06-02T10:00:00.000Z');
    expect(first.endedAt).toBe('2027-06-02T12:00:00.000Z');
    expect(first.durationSeconds).toBe(7200);
    expect(second.startedAt).toBe('2027-06-03T10:00:00.000Z');
    expect(second.endedAt).toBe('2027-06-03T11:00:00.000Z');
    expect(second.durationSeconds).toBe(3600);
  });

  // ── Update ────────────────────────────────────────────────────────────

  it('updates invoice status without recomputing totals', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/invoices')
      .set('Authorization', bearer(adminToken))
      .query({ projectId: PLATFORM_PROJECT_ID });

    const invoice = listRes.body.items.find(
      (i: { title: string }) => i.title === 'Platform Invoice',
    );

    const res = await request(app.getHttpServer())
      .patch(`/invoices/${invoice.id}`)
      .set('Authorization', bearer(adminToken))
      .send({ status: 'sent', notes: 'Sent to client' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('sent');
    expect(res.body.notes).toBe('Sent to client');
    // Totals remain as originally captured.
    expect(res.body.totalHours).toBe(3);
    expect(res.body.totalAmount).toBe(225);
  });

  it('rejects update attempts that mutate snapshot totals', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/invoices')
      .set('Authorization', bearer(adminToken))
      .query({ projectId: PLATFORM_PROJECT_ID });

    const invoice = listRes.body.items[0];

    const res = await request(app.getHttpServer())
      .patch(`/invoices/${invoice.id}`)
      .set('Authorization', bearer(adminToken))
      .send({ totalAmount: 999 });

    expect(res.status).toBe(400);
  });

  it('title-only update leaves snapshot fields untouched', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/invoices')
      .set('Authorization', bearer(adminToken))
      .query({ projectId: PLATFORM_PROJECT_ID });

    const invoice = listRes.body.items.find(
      (i: { title: string }) => i.title === 'Platform Invoice',
    );
    expect(invoice).toBeDefined();

    const before = await request(app.getHttpServer())
      .get(`/invoices/${invoice.id}`)
      .set('Authorization', bearer(adminToken));
    expect(before.status).toBe(200);

    const res = await request(app.getHttpServer())
      .patch(`/invoices/${invoice.id}`)
      .set('Authorization', bearer(adminToken))
      .send({ title: 'Platform Invoice (Renamed)' });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(invoice.id);
    expect(res.body.title).toBe('Platform Invoice (Renamed)');

    // Everything except title (and updatedAt) must stay exactly as before.
    expect(res.body.status).toBe(before.body.status);
    expect(res.body.notes).toBe(before.body.notes);
    expect(res.body.hourlyRate).toBe(before.body.hourlyRate);
    expect(res.body.currency).toBe(before.body.currency);
    expect(res.body.discountPercent).toBe(before.body.discountPercent);
    expect(res.body.totalHours).toBe(before.body.totalHours);
    expect(res.body.totalAmount).toBe(before.body.totalAmount);
    expect(res.body.dateFrom).toBe(before.body.dateFrom);
    expect(res.body.dateTo).toBe(before.body.dateTo);
    expect(res.body.projectId).toBe(before.body.projectId);
    expect(res.body.timeEntryCount).toBe(before.body.timeEntryCount);
  });

  it('updates title, status and notes together without recomputing totals', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/invoices')
      .set('Authorization', bearer(adminToken))
      .query({ projectId: PLATFORM_PROJECT_ID });

    const invoice = listRes.body.items.find(
      (i: { title: string }) => i.title === 'Platform Invoice (Renamed)',
    );
    expect(invoice).toBeDefined();

    const res = await request(app.getHttpServer())
      .patch(`/invoices/${invoice.id}`)
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Platform Invoice Final',
        status: 'paid',
        notes: null,
      });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Platform Invoice Final');
    expect(res.body.status).toBe('paid');
    // Sending notes: null must clear the stored notes.
    expect(res.body.notes).toBeNull();
    // Snapshot totals must survive every update unchanged.
    expect(res.body.totalHours).toBe(3);
    expect(res.body.totalAmount).toBe(225);
    expect(res.body.timeEntryCount).toBe(2);
  });

  it('rejects an empty update body', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/invoices')
      .set('Authorization', bearer(adminToken))
      .query({ projectId: PLATFORM_PROJECT_ID });

    const invoice = listRes.body.items.find(
      (i: { title: string }) => i.title === 'Platform Invoice Final',
    );
    expect(invoice).toBeDefined();

    const res = await request(app.getHttpServer())
      .patch(`/invoices/${invoice.id}`)
      .set('Authorization', bearer(adminToken))
      .send({});

    expect(res.status).toBe(400);
  });

  it('rejects PM updates to invoices on unassigned private projects', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'PM Patch Probe',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        projectId: probeProjectId,
        hourlyRate: 40,
      });
    expect(createRes.status).toBe(201);
    const invoiceId = createRes.body.id;

    const patchRes = await request(app.getHttpServer())
      .patch(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(pmToken))
      .send({ status: 'sent' });
    expect(patchRes.status).toBe(403);

    // Cleanup: admin removes the probe invoice.
    await request(app.getHttpServer())
      .delete(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(adminToken));
  });

  it('rejects PM read and update of workspace-wide invoices', async () => {
    // Admin-only: an invoice without a project scope is invisible to PMs.
    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Workspace-wide Probe',
        dateFrom: '2099-05-01',
        dateTo: '2099-05-31',
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.projectId).toBeNull();
    expect(createRes.body.project).toBeNull();

    const getRes = await request(app.getHttpServer())
      .get(`/invoices/${createRes.body.id}`)
      .set('Authorization', bearer(pmToken));
    expect(getRes.status).toBe(403);

    const patchRes = await request(app.getHttpServer())
      .patch(`/invoices/${createRes.body.id}`)
      .set('Authorization', bearer(pmToken))
      .send({ status: 'paid' });
    expect(patchRes.status).toBe(403);

    await request(app.getHttpServer())
      .delete(`/invoices/${createRes.body.id}`)
      .set('Authorization', bearer(adminToken));
  });

  // ── Status transition enforcement ─────────────────────────────────────

  it('rejects backward status transition from sent to draft', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Transition Probe sent-to-draft',
        dateFrom: '2099-06-01',
        dateTo: '2099-06-30',
        projectId: PLATFORM_PROJECT_ID,
        hourlyRate: 10,
      });
    expect(createRes.status).toBe(201);
    const invoiceId = createRes.body.id;

    const sentRes = await request(app.getHttpServer())
      .patch(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(adminToken))
      .send({ status: 'sent' });
    expect(sentRes.status).toBe(200);
    expect(sentRes.body.status).toBe('sent');

    const revertRes = await request(app.getHttpServer())
      .patch(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(adminToken))
      .send({ status: 'draft' });
    expect(revertRes.status).toBe(409);

    const getRes = await request(app.getHttpServer())
      .get(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(adminToken));
    expect(getRes.body.status).toBe('sent');
  });

  it('rejects backward status transition from paid to draft', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Transition Probe paid-to-draft',
        dateFrom: '2099-07-01',
        dateTo: '2099-07-31',
        projectId: PLATFORM_PROJECT_ID,
        hourlyRate: 10,
      });
    expect(createRes.status).toBe(201);
    const invoiceId = createRes.body.id;

    await request(app.getHttpServer())
      .patch(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(adminToken))
      .send({ status: 'sent' });
    const paidRes = await request(app.getHttpServer())
      .patch(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(adminToken))
      .send({ status: 'paid' });
    expect(paidRes.status).toBe(200);
    expect(paidRes.body.status).toBe('paid');

    const revertRes = await request(app.getHttpServer())
      .patch(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(adminToken))
      .send({ status: 'draft' });
    expect(revertRes.status).toBe(409);
  });

  it('rejects backward status transition from paid to sent', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Transition Probe paid-to-sent',
        dateFrom: '2099-08-01',
        dateTo: '2099-08-31',
        projectId: PLATFORM_PROJECT_ID,
        hourlyRate: 10,
      });
    expect(createRes.status).toBe(201);
    const invoiceId = createRes.body.id;

    await request(app.getHttpServer())
      .patch(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(adminToken))
      .send({ status: 'sent' });
    await request(app.getHttpServer())
      .patch(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(adminToken))
      .send({ status: 'paid' });

    const revertRes = await request(app.getHttpServer())
      .patch(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(adminToken))
      .send({ status: 'sent' });
    expect(revertRes.status).toBe(409);
  });

  it('allows direct draft to paid transition', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Transition Probe draft-to-paid',
        dateFrom: '2099-09-01',
        dateTo: '2099-09-30',
        projectId: PLATFORM_PROJECT_ID,
        hourlyRate: 10,
      });
    expect(createRes.status).toBe(201);
    const invoiceId = createRes.body.id;

    const paidRes = await request(app.getHttpServer())
      .patch(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(adminToken))
      .send({ status: 'paid' });
    expect(paidRes.status).toBe(200);
    expect(paidRes.body.status).toBe('paid');
  });

  // ── Delete ────────────────────────────────────────────────────────────────

  it.each(['draft', 'sent'])(
    'rejects a stale concurrent update to %s and keeps paid entries billed',
    async (staleStatus) => {
      const entryId = '00000000-0000-4000-8000-300000000001';
      await db.insert(timeEntries).values({
        id: entryId,
        workspaceId,
        taskId: probeTaskId,
        userId: bobUserId,
        source: 'manual',
        startedAt: new Date('2027-06-28T10:00:00.000Z'),
        endedAt: new Date('2027-06-28T11:00:00.000Z'),
        durationSeconds: 3600,
        isBillable: true,
      });
      const created = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', bearer(adminToken))
        .send({
          title: 'Concurrent status probe',
          projectId: probeProjectId,
          dateFrom: '2027-06-28',
          dateTo: '2027-06-28',
          hourlyRate: 100,
        });
      expect(created.status).toBe(201);
      expect(created.body.timeEntryCount).toBe(1);

      const pool = app.get<Pool>(PG_POOL);
      const lock = await pool.connect();
      let paidRequest: Promise<{ status: number }> | undefined;
      let draftRequest: Promise<{ status: number }> | undefined;
      try {
        await lock.query('BEGIN');
        await lock.query('SELECT id FROM invoices WHERE id = $1 FOR UPDATE', [
          created.body.id,
        ]);
        const waitForBlockedUpdates = async (count: number) => {
          await vi.waitFor(
            async () => {
              const { rows } = await pool.query<{ count: number }>(`
              SELECT count(*)::int AS count FROM pg_stat_activity
              WHERE datname = current_database()
                AND wait_event_type = 'Lock'
                AND query LIKE 'update "invoices"%'
            `);
              expect(rows[0]?.count).toBe(count);
            },
            { timeout: 5000, interval: 10 },
          );
        };

        // Hold the row until both requests have read the same draft status.
        paidRequest = request(app.getHttpServer())
          .patch(`/invoices/${created.body.id}`)
          .set('Authorization', bearer(adminToken))
          .send({ status: 'paid' })
          .then((response) => response);
        await waitForBlockedUpdates(1);
        draftRequest = request(app.getHttpServer())
          .patch(`/invoices/${created.body.id}`)
          .set('Authorization', bearer(adminToken))
          .send({
            status: staleStatus,
            notes: 'Must not overwrite paid invoice',
          })
          .then((response) => response);
        await waitForBlockedUpdates(2);
        await lock.query('COMMIT');

        const [paid, draft] = await Promise.all([paidRequest, draftRequest]);
        expect(paid.status).toBe(200);
        expect(draft.status).toBe(409);

        const detail = await request(app.getHttpServer())
          .get(`/invoices/${created.body.id}`)
          .set('Authorization', bearer(adminToken));
        expect(detail.status).toBe(200);
        expect(detail.body.status).toBe('paid');
        expect(detail.body.notes).toBeNull();

        const deletion = await request(app.getHttpServer())
          .delete(`/invoices/${created.body.id}`)
          .set('Authorization', bearer(adminToken));
        expect(deletion.status).toBe(409);
        const [entry] = await db
          .select({ invoiceId: timeEntries.invoiceId })
          .from(timeEntries)
          .where(eq(timeEntries.id, entryId));
        expect(entry?.invoiceId).toBe(created.body.id);
      } finally {
        await lock.query('ROLLBACK');
        lock.release();
        await Promise.allSettled(
          [paidRequest, draftRequest].filter(
            (pending) => pending !== undefined,
          ),
        );
        await db.delete(invoices).where(eq(invoices.id, created.body.id));
        await db.delete(timeEntries).where(eq(timeEntries.id, entryId));
      }
    },
  );

  it('returns 404 when deleting an unknown invoice', async () => {
    const res = await request(app.getHttpServer())
      .delete('/invoices/00000000-0000-4000-8000-999999999996')
      .set('Authorization', bearer(adminToken));

    expect(res.status).toBe(404);
  });

  it('rejects deletion of a sent invoice (only draft is deletable)', async () => {
    // Create a draft invoice, then advance it to 'sent'.
    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Sent Invoice No Delete',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        projectId: probeProjectId,
        hourlyRate: 50,
      });
    expect(createRes.status).toBe(201);
    const invoiceId = createRes.body.id;

    const patchRes = await request(app.getHttpServer())
      .patch(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(adminToken))
      .send({ status: 'sent' });
    expect(patchRes.status).toBe(200);

    const deleteRes = await request(app.getHttpServer())
      .delete(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(adminToken));

    expect(deleteRes.status).toBe(409);

    // Invoice still exists.
    const getRes = await request(app.getHttpServer())
      .get(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(adminToken));
    expect(getRes.status).toBe(200);
    expect(getRes.body.status).toBe('sent');
  });

  it('rejects deletion of a paid invoice (only draft is deletable)', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Paid Invoice No Delete',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        projectId: probeProjectId,
        hourlyRate: 50,
      });
    expect(createRes.status).toBe(201);
    const invoiceId = createRes.body.id;

    const patchRes = await request(app.getHttpServer())
      .patch(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(adminToken))
      .send({ status: 'paid' });
    expect(patchRes.status).toBe(200);

    const deleteRes = await request(app.getHttpServer())
      .delete(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(adminToken));

    expect(deleteRes.status).toBe(409);
  });

  it('concurrent PATCH to sent blocks deletion', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Concurrent Delete Probe',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        projectId: probeProjectId,
        hourlyRate: 50,
      });
    expect(createRes.status).toBe(201);
    const invoiceId = createRes.body.id;

    // PATCH advances the draft to 'sent' while DELETE removes it. The
    // draft-only lock is enforced inside the DELETE predicate, so exactly
    // one of the two wins regardless of interleaving.
    const [patchRes, deleteRes] = await Promise.all([
      request(app.getHttpServer())
        .patch(`/invoices/${invoiceId}`)
        .set('Authorization', bearer(adminToken))
        .send({ status: 'sent' }),
      request(app.getHttpServer())
        .delete(`/invoices/${invoiceId}`)
        .set('Authorization', bearer(adminToken)),
    ]);

    // DELETE won → 204. PATCH may return 404 (its initial read found the
    // invoice already gone) or 409 (it read the draft, but the optimistic
    // UPDATE matched 0 rows because DELETE removed the row in between).
    // PATCH won → 200, and DELETE was rejected with 409 because the row
    // was no longer 'draft'.
    if (deleteRes.status === 204) {
      expect([404, 409]).toContain(patchRes.status);
    } else {
      expect(patchRes.status).toBe(200);
      expect(deleteRes.status).toBe(409);
    }

    // Key invariant: the invoice either exists as 'sent' (PATCH won) or
    // does not exist (DELETE won) — it is never deleted while non-draft.
    const getRes = await request(app.getHttpServer())
      .get(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(adminToken));
    if (deleteRes.status === 204) {
      expect(getRes.status).toBe(404);
    } else {
      expect(getRes.status).toBe(200);
      expect(getRes.body.status).toBe('sent');
    }
  });

  it('admin deletes an invoice and unlinks its time entries', async () => {
    // Reset ENTRY_PROBE_1 eligibility: unlink it from any prior invoice.
    await db
      .update(timeEntries)
      .set({ invoiceId: null })
      .where(eq(timeEntries.id, ENTRY_PROBE_1));

    // Create a fresh invoice for the probe project.
    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Delete Probe Invoice',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        projectId: probeProjectId,
        hourlyRate: 50,
      });
    expect(createRes.status).toBe(201);
    const invoiceId = createRes.body.id;
    expect(createRes.body.timeEntryCount).toBe(1);

    // Verify the probe entry is linked.
    const [linkedBefore] = await db
      .select({ invoiceId: timeEntries.invoiceId })
      .from(timeEntries)
      .where(eq(timeEntries.id, ENTRY_PROBE_1))
      .limit(1);
    expect(linkedBefore?.invoiceId).toBe(invoiceId);

    // Delete as admin.
    const deleteRes = await request(app.getHttpServer())
      .delete(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(adminToken));
    expect(deleteRes.status).toBe(204);

    // Verify the entry is unlinked.
    const [linkedAfter] = await db
      .select({ invoiceId: timeEntries.invoiceId })
      .from(timeEntries)
      .where(eq(timeEntries.id, ENTRY_PROBE_1))
      .limit(1);
    expect(linkedAfter?.invoiceId).toBeNull();

    // Verify the entry still exists (not deleted).
    const [entry] = await db
      .select({ id: timeEntries.id })
      .from(timeEntries)
      .where(eq(timeEntries.id, ENTRY_PROBE_1))
      .limit(1);
    expect(entry?.id).toBe(ENTRY_PROBE_1);

    // Verify the invoice is gone.
    const getRes = await request(app.getHttpServer())
      .get(`/invoices/${invoiceId}`)
      .set('Authorization', bearer(adminToken));
    expect(getRes.status).toBe(404);
  });

  it('deleted invoice entries become re-billable', async () => {
    // After deletion, ENTRY_PROBE_1 should be eligible again.
    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Re-bill Probe',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        projectId: probeProjectId,
        hourlyRate: 50,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.timeEntryCount).toBe(1);
    expect(createRes.body.timeEntries[0].id).toBe(ENTRY_PROBE_1);
  });

  // ── Time entry response exposes invoice link ──────────────────────────

  it('time entry response includes invoiceId for billed entries', async () => {
    // Get Bob's time entries — the billed ones should have an invoiceId.
    const res = await request(app.getHttpServer())
      .get('/time-entries')
      .set('Authorization', bearer(memberToken))
      .query({ dateFrom: ISO_FROM, dateTo: ISO_TO });

    expect(res.status).toBe(200);
    const billed = res.body.items.filter(
      (e: { invoiceId: string | null }) => e.invoiceId !== null,
    );
    expect(billed.length).toBeGreaterThan(0);

    // Verify ENTRY_BOB_1 has a properly shaped (UUID) invoiceId.
    const bob1 = res.body.items.find(
      (e: { id: string }) => e.id === ENTRY_BOB_1,
    );
    expect(bob1.invoiceId).not.toBeNull();
    expect(bob1.invoiceId).toMatch(UUID_RE);

    // ENTRY_BOB_2 is billed too.
    const bob2 = res.body.items.find(
      (e: { id: string }) => e.id === ENTRY_BOB_2,
    );
    expect(bob2.invoiceId).toMatch(UUID_RE);

    // Unbilled entries must surface invoiceId: null.
    const nonBillable = res.body.items.find(
      (e: { id: string }) => e.id === ENTRY_BOB_NON_BILLABLE,
    );
    expect(nonBillable.invoiceId).toBeNull();
  });

  // ── Concurrent creation prevents double billing ───────────────────────

  it('concurrent creation does not double-bill the same entry', async () => {
    // Clean up invoice links on probe entries to reset eligibility.
    await db
      .update(timeEntries)
      .set({ invoiceId: null })
      .where(eq(timeEntries.id, ENTRY_PROBE_1));

    // Fire two concurrent create requests targeting the same entry.
    const body = {
      title: 'Concurrent Probe',
      dateFrom: DATE_FROM,
      dateTo: DATE_TO,
      projectId: probeProjectId,
      hourlyRate: 50,
    };

    const [res1, res2] = await Promise.all([
      request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', bearer(adminToken))
        .send(body),
      request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', bearer(adminToken))
        .send({ ...body, title: 'Concurrent Probe 2' }),
    ]);

    // Both should return 201 (both create invoices), but the entry should
    // be linked to exactly one of them.
    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);

    // Exactly one invoice has the entry linked.
    const linked = await db
      .select({ id: timeEntries.id, invoiceId: timeEntries.invoiceId })
      .from(timeEntries)
      .where(eq(timeEntries.id, ENTRY_PROBE_1))
      .limit(1);

    expect(linked[0]?.invoiceId).not.toBeNull();
    // The entry is linked to exactly one invoice (not both).
    expect([res1.body.id, res2.body.id]).toContain(linked[0]?.invoiceId);
    expect(
      [res1.body.id, res2.body.id].filter((id) => id === linked[0]?.invoiceId),
    ).toHaveLength(1);

    // One invoice has the entry, the other has zero entries.
    const count1 = res1.body.timeEntryCount;
    const count2 = res2.body.timeEntryCount;
    expect(count1 + count2).toBe(1);

    // The zero-entry invoice must bill nothing; the winner bills 1.5h * 50.
    const winner = count1 === 1 ? res1.body : res2.body;
    const loser = count1 === 1 ? res2.body : res1.body;
    expect(winner.totalHours).toBe(1.5);
    expect(winner.totalAmount).toBe(75);
    expect(loser.totalHours).toBe(0);
    expect(loser.totalAmount).toBe(0);
  });

  // ── Eligible entries preview ──────────────────────────────────────────

  it('rejects member on eligible-entries preview', async () => {
    const res = await request(app.getHttpServer())
      .get('/invoices/eligible-entries')
      .set('Authorization', bearer(memberToken))
      .query({ dateFrom: DATE_FROM, dateTo: DATE_TO });
    expect(res.status).toBe(403);
  });

  it('rejects PM eligible-entries preview without a projectId', async () => {
    const res = await request(app.getHttpServer())
      .get('/invoices/eligible-entries')
      .set('Authorization', bearer(pmToken))
      .query({ dateFrom: DATE_FROM, dateTo: DATE_TO });
    expect(res.status).toBe(403);
  });

  it('rejects PM eligible-entries preview for an unassigned private project', async () => {
    const res = await request(app.getHttpServer())
      .get('/invoices/eligible-entries')
      .set('Authorization', bearer(pmToken))
      .query({
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        projectId: probeProjectId,
      });
    expect(res.status).toBe(403);
  });

  it('rejects reversed date bounds on eligible-entries', async () => {
    const res = await request(app.getHttpServer())
      .get('/invoices/eligible-entries')
      .set('Authorization', bearer(adminToken))
      .query({ dateFrom: DATE_TO, dateTo: DATE_FROM });
    expect(res.status).toBe(400);
  });

  it('admin previews eligible entries across a date range', async () => {
    const entry1 = '00000000-0000-4000-8000-200000000001';
    const entry2 = '00000000-0000-4000-8000-200000000002';
    await db.insert(timeEntries).values([
      {
        id: entry1,
        workspaceId,
        taskId: PLATFORM_API_TASK_ID,
        userId: bobUserId,
        source: 'manual',
        startedAt: new Date('2027-06-10T09:00:00.000Z'),
        endedAt: new Date('2027-06-10T11:00:00.000Z'),
        durationSeconds: 7200,
        isBillable: true,
      },
      {
        id: entry2,
        workspaceId,
        taskId: PLATFORM_API_TASK_ID,
        userId: bobUserId,
        source: 'manual',
        startedAt: new Date('2027-06-11T14:00:00.000Z'),
        endedAt: new Date('2027-06-11T15:30:00.000Z'),
        durationSeconds: 5400,
        isBillable: true,
      },
    ]);

    const res = await request(app.getHttpServer())
      .get('/invoices/eligible-entries')
      .set('Authorization', bearer(adminToken))
      .query({ dateFrom: DATE_FROM, dateTo: DATE_TO });

    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(2);
    expect(res.body.totalHours).toBeGreaterThan(0);

    const ids = res.body.entries.map((e: { id: string }) => e.id);
    expect(ids).toContain(entry1);
    expect(ids).toContain(entry2);

    for (const entry of res.body.entries) {
      expect(entry.userName).not.toBeNull();
      expect(entry.taskName).not.toBeNull();
    }

    expect(res.body.defaultHourlyRate).not.toBeNull();
    expect(res.body.defaultCurrency).not.toBeNull();

    await db.delete(timeEntries).where(eq(timeEntries.id, entry1));
    await db.delete(timeEntries).where(eq(timeEntries.id, entry2));
  });

  it('admin previews eligible entries scoped to a project', async () => {
    const entry = '00000000-0000-4000-8000-200000000003';
    await db.insert(timeEntries).values({
      id: entry,
      workspaceId,
      taskId: probeTaskId,
      userId: bobUserId,
      source: 'manual',
      startedAt: new Date('2027-06-15T10:00:00.000Z'),
      endedAt: new Date('2027-06-15T11:00:00.000Z'),
      durationSeconds: 3600,
      isBillable: true,
    });

    const res = await request(app.getHttpServer())
      .get('/invoices/eligible-entries')
      .set('Authorization', bearer(adminToken))
      .query({
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        projectId: probeProjectId,
      });

    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    const ids = res.body.entries.map((e: { id: string }) => e.id);
    expect(ids).toContain(entry);

    await db.delete(timeEntries).where(eq(timeEntries.id, entry));
  });

  it('no eligible entries returns an empty result', async () => {
    const res = await request(app.getHttpServer())
      .get('/invoices/eligible-entries')
      .set('Authorization', bearer(adminToken))
      .query({ dateFrom: '2099-12-01', dateTo: '2099-12-02' });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
    expect(res.body.totalHours).toBe(0);
    expect(res.body.entries).toEqual([]);
  });

  it('preview does not modify data', async () => {
    const entry = '00000000-0000-4000-8000-200000000004';
    await db.insert(timeEntries).values({
      id: entry,
      workspaceId,
      taskId: PLATFORM_API_TASK_ID,
      userId: bobUserId,
      source: 'manual',
      startedAt: new Date('2027-06-20T10:00:00.000Z'),
      endedAt: new Date('2027-06-20T11:00:00.000Z'),
      durationSeconds: 3600,
      isBillable: true,
    });

    const listBefore = await request(app.getHttpServer())
      .get('/invoices')
      .set('Authorization', bearer(adminToken));
    const beforeTotal = listBefore.body.meta.total;

    const res = await request(app.getHttpServer())
      .get('/invoices/eligible-entries')
      .set('Authorization', bearer(adminToken))
      .query({
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        projectId: PLATFORM_PROJECT_ID,
      });

    expect(res.status).toBe(200);

    const listAfter = await request(app.getHttpServer())
      .get('/invoices')
      .set('Authorization', bearer(adminToken));
    expect(listAfter.body.meta.total).toBe(beforeTotal);

    const [row] = await db
      .select({ invoiceId: timeEntries.invoiceId })
      .from(timeEntries)
      .where(eq(timeEntries.id, entry))
      .limit(1);
    expect(row?.invoiceId).toBeNull();

    await db.delete(timeEntries).where(eq(timeEntries.id, entry));
  });

  // ── Stats ─────────────────────────────────────────────────────────────

  it('rejects member on invoice stats', async () => {
    const res = await request(app.getHttpServer())
      .get('/invoices/stats')
      .set('Authorization', bearer(memberToken));
    expect(res.status).toBe(403);
  });

  it('admin retrieves workspace-wide stats', async () => {
    const res = await request(app.getHttpServer())
      .get('/invoices/stats')
      .set('Authorization', bearer(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.byStatus).toBeDefined();
    expect(typeof res.body.byStatus.draft).toBe('number');
    expect(typeof res.body.byStatus.sent).toBe('number');
    expect(typeof res.body.byStatus.paid).toBe('number');
    expect(res.body.thisMonth).toBeDefined();
    expect(typeof res.body.thisMonth.invoiceCount).toBe('number');
    expect(typeof res.body.thisMonth.projectCount).toBe('number');
    expect(typeof res.body.thisMonth.totalAmount).toBe('number');
    expect(typeof res.body.thisMonth.currency).toBe('string');

    const total =
      res.body.byStatus.draft + res.body.byStatus.sent + res.body.byStatus.paid;
    expect(total).toBeGreaterThan(0);
  });

  it('PM stats exclude workspace-wide invoices', async () => {
    const pmBefore = await request(app.getHttpServer())
      .get('/invoices/stats')
      .set('Authorization', bearer(pmToken));
    expect(pmBefore.status).toBe(200);
    const pmBeforeTotal =
      pmBefore.body.byStatus.draft +
      pmBefore.body.byStatus.sent +
      pmBefore.body.byStatus.paid;

    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Stats Workspace-wide Probe',
        dateFrom: '2099-11-01',
        dateTo: '2099-11-30',
        hourlyRate: 10,
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.projectId).toBeNull();

    const adminAfter = await request(app.getHttpServer())
      .get('/invoices/stats')
      .set('Authorization', bearer(adminToken));
    expect(adminAfter.status).toBe(200);
    const adminAfterTotal =
      adminAfter.body.byStatus.draft +
      adminAfter.body.byStatus.sent +
      adminAfter.body.byStatus.paid;
    expect(adminAfterTotal).toBeGreaterThanOrEqual(1);

    const pmAfter = await request(app.getHttpServer())
      .get('/invoices/stats')
      .set('Authorization', bearer(pmToken));
    expect(pmAfter.status).toBe(200);
    const pmAfterTotal =
      pmAfter.body.byStatus.draft +
      pmAfter.body.byStatus.sent +
      pmAfter.body.byStatus.paid;
    expect(pmAfterTotal).toBe(pmBeforeTotal);

    await request(app.getHttpServer())
      .delete(`/invoices/${createRes.body.id}`)
      .set('Authorization', bearer(adminToken));
  });

  it('PM stats include invoices for assigned projects', async () => {
    const pmBefore = await request(app.getHttpServer())
      .get('/invoices/stats')
      .set('Authorization', bearer(pmToken));
    expect(pmBefore.status).toBe(200);
    const pmBeforeDraft = pmBefore.body.byStatus.draft;

    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Stats PM Assigned Probe',
        dateFrom: '2099-10-01',
        dateTo: '2099-10-31',
        projectId: PLATFORM_PROJECT_ID,
        hourlyRate: 15,
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.projectId).toBe(PLATFORM_PROJECT_ID);

    const pmAfter = await request(app.getHttpServer())
      .get('/invoices/stats')
      .set('Authorization', bearer(pmToken));
    expect(pmAfter.status).toBe(200);
    expect(pmAfter.body.byStatus.draft).toBe(pmBeforeDraft + 1);

    const adminAfter = await request(app.getHttpServer())
      .get('/invoices/stats')
      .set('Authorization', bearer(adminToken));
    expect(adminAfter.status).toBe(200);
    const adminTotal =
      adminAfter.body.byStatus.draft +
      adminAfter.body.byStatus.sent +
      adminAfter.body.byStatus.paid;
    const pmTotal =
      pmAfter.body.byStatus.draft +
      pmAfter.body.byStatus.sent +
      pmAfter.body.byStatus.paid;
    expect(pmTotal).toBeLessThanOrEqual(adminTotal);

    await request(app.getHttpServer())
      .delete(`/invoices/${createRes.body.id}`)
      .set('Authorization', bearer(adminToken));
  });

  it.each(['America/New_York', 'Asia/Tokyo'])(
    'uses the workspace month boundary for stats in %s',
    async (timeZone) => {
      const [settings] = await db
        .select({ timeZone: workspaceSettings.timeZone })
        .from(workspaceSettings)
        .where(eq(workspaceSettings.workspaceId, workspaceId));
      const { admin } = await getSeededAdminWorkspace(db);
      const pool = app.get<Pool>(PG_POOL);
      const { rows } = await pool.query<{ month_start: Date }>(
        "SELECT date_trunc('month', now() AT TIME ZONE $1) AT TIME ZONE $1 AS month_start",
        [timeZone],
      );
      const monthStart = rows[0]!.month_start;
      const ids: string[] = [];
      try {
        await db
          .update(workspaceSettings)
          .set({ timeZone })
          .where(eq(workspaceSettings.workspaceId, workspaceId));
        const before = await Promise.all(
          [adminToken, pmToken].map((token) =>
            request(app.getHttpServer())
              .get('/invoices/stats')
              .set('Authorization', bearer(token)),
          ),
        );
        const fixtures = await db
          .insert(invoices)
          .values(
            [
              {
                createdAt: new Date(monthStart.getTime() - 1),
                totalAmount: 11,
              },
              { createdAt: monthStart, totalAmount: 23 },
            ].map((fixture) => ({
              ...fixture,
              workspaceId,
              projectId: PLATFORM_PROJECT_ID,
              createdBy: admin.id,
              title: 'Stats month boundary probe',
              dateFrom: DATE_FROM,
              dateTo: DATE_TO,
              hourlyRate: 100,
              currency: 'USD',
            })),
          )
          .returning({ id: invoices.id });
        ids.push(...fixtures.map((fixture) => fixture.id));

        for (const [index, token] of [adminToken, pmToken].entries()) {
          const after = await request(app.getHttpServer())
            .get('/invoices/stats')
            .set('Authorization', bearer(token));
          expect(before[index]!.status).toBe(200);
          expect(after.status).toBe(200);
          expect(after.body.thisMonth.invoiceCount).toBe(
            before[index]!.body.thisMonth.invoiceCount + 1,
          );
          expect(after.body.thisMonth.totalAmount).toBeCloseTo(
            before[index]!.body.thisMonth.totalAmount + 23,
            2,
          );
        }
      } finally {
        if (ids.length > 0) {
          await db.delete(invoices).where(inArray(invoices.id, ids));
        }
        await db
          .update(workspaceSettings)
          .set({ timeZone: settings!.timeZone })
          .where(eq(workspaceSettings.workspaceId, workspaceId));
      }
    },
  );

  it('empty workspace stats return zero counts', async () => {
    await db.delete(invoices).where(eq(invoices.workspaceId, workspaceId));

    const adminRes = await request(app.getHttpServer())
      .get('/invoices/stats')
      .set('Authorization', bearer(adminToken));
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.byStatus).toEqual({ draft: 0, sent: 0, paid: 0 });
    expect(adminRes.body.thisMonth.invoiceCount).toBe(0);
    expect(adminRes.body.thisMonth.projectCount).toBe(0);
    expect(adminRes.body.thisMonth.totalAmount).toBe(0);
    expect(typeof adminRes.body.thisMonth.currency).toBe('string');

    const pmRes = await request(app.getHttpServer())
      .get('/invoices/stats')
      .set('Authorization', bearer(pmToken));
    expect(pmRes.status).toBe(200);
    expect(pmRes.body.byStatus).toEqual({ draft: 0, sent: 0, paid: 0 });
    expect(pmRes.body.thisMonth.invoiceCount).toBe(0);
    expect(pmRes.body.thisMonth.projectCount).toBe(0);
    expect(pmRes.body.thisMonth.totalAmount).toBe(0);
  });

  // ── Time rounding ─────────────────────────────────────────────────

  it('applies per-entry rounding with an explicit create step', async () => {
    await db.insert(timeEntries).values([
      {
        id: ROUNDING_ENTRY_1,
        workspaceId,
        taskId: PLATFORM_API_TASK_ID,
        userId: bobUserId,
        source: 'manual',
        startedAt: new Date('2099-09-02T10:00:00.000Z'),
        endedAt: new Date('2099-09-02T10:01:00.000Z'),
        durationSeconds: 60,
        isBillable: true,
      },
      {
        id: ROUNDING_ENTRY_2,
        workspaceId,
        taskId: PLATFORM_API_TASK_ID,
        userId: bobUserId,
        source: 'manual',
        startedAt: new Date('2099-09-02T12:00:00.000Z'),
        endedAt: new Date('2099-09-02T12:01:00.000Z'),
        durationSeconds: 60,
        isBillable: true,
      },
    ]);

    const res = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Rounded Invoice',
        dateFrom: '2099-09-01',
        dateTo: '2099-09-30',
        projectId: PLATFORM_PROJECT_ID,
        hourlyRate: 60,
        roundingStepMinutes: 5,
      });

    expect(res.status).toBe(201);
    // Two 60s entries round up to 300s each; 600s total → 0.17h.
    expect(res.body.totalHours).toBe(0.17);
    expect(res.body.totalAmount).toBe(10.2); // 0.17h * 60
    expect(res.body.roundingStepMinutes).toBe(5);
    expect(res.body.timeEntryCount).toBe(2);

    // Detail and list responses expose the stored snapshot.
    const detail = await request(app.getHttpServer())
      .get(`/invoices/${res.body.id}`)
      .set('Authorization', bearer(adminToken));
    expect(detail.status).toBe(200);
    expect(detail.body.roundingStepMinutes).toBe(5);

    const list = await request(app.getHttpServer())
      .get('/invoices')
      .set('Authorization', bearer(adminToken))
      .query({ projectId: PLATFORM_PROJECT_ID });
    expect(list.status).toBe(200);
    const roundedItem = list.body.items.find(
      (item: { id: string }) => item.id === res.body.id,
    );
    expect(roundedItem.roundingStepMinutes).toBe(5);

    // Original entry durations are not rewritten.
    const linked = await db
      .select({
        id: timeEntries.id,
        durationSeconds: timeEntries.durationSeconds,
      })
      .from(timeEntries)
      .where(inArray(timeEntries.id, [ROUNDING_ENTRY_1, ROUNDING_ENTRY_2]))
      .orderBy(timeEntries.startedAt);
    expect(linked).toEqual([
      { id: ROUNDING_ENTRY_1, durationSeconds: 60 },
      { id: ROUNDING_ENTRY_2, durationSeconds: 60 },
    ]);

    await request(app.getHttpServer())
      .delete(`/invoices/${res.body.id}`)
      .set('Authorization', bearer(adminToken));
    await db
      .delete(timeEntries)
      .where(inArray(timeEntries.id, [ROUNDING_ENTRY_1, ROUNDING_ENTRY_2]));
  });

  it('creates with an explicit step over the project default', async () => {
    await db.insert(timeEntries).values({
      id: ROUNDING_ENTRY_3,
      workspaceId,
      taskId: roundingTaskId,
      userId: bobUserId,
      source: 'manual',
      startedAt: new Date('2099-11-05T10:00:00.000Z'),
      endedAt: new Date('2099-11-05T10:01:00.000Z'),
      durationSeconds: 90,
      isBillable: true,
    });

    const res = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Override Step Invoice',
        dateFrom: '2099-11-04',
        dateTo: '2099-11-28',
        projectId: roundingProjectId,
        hourlyRate: 60,
        roundingStepMinutes: 15,
      });

    expect(res.status).toBe(201);
    // 90s rounds up to the overridden 15-minute step → 900s → 0.25h.
    expect(res.body.roundingStepMinutes).toBe(15);
    expect(res.body.totalHours).toBe(0.25);
    expect(res.body.totalAmount).toBe(15); // 0.25h * 60

    // The project's own step stays unchanged.
    const [projectRow] = await db
      .select({ step: projects.timeRoundingStepMinutes })
      .from(projects)
      .where(eq(projects.id, roundingProjectId));
    expect(projectRow?.step).toBe(5);

    await request(app.getHttpServer())
      .delete(`/invoices/${res.body.id}`)
      .set('Authorization', bearer(adminToken));
    await db.delete(timeEntries).where(eq(timeEntries.id, ROUNDING_ENTRY_3));
  });

  it('snapshots the project rounding step', async () => {
    await db.insert(timeEntries).values({
      id: ROUNDING_ENTRY_4,
      workspaceId,
      taskId: roundingTaskId,
      userId: bobUserId,
      source: 'manual',
      startedAt: new Date('2099-10-05T10:00:00.000Z'),
      endedAt: new Date('2099-10-05T10:05:00.000Z'),
      durationSeconds: 240,
      isBillable: true,
    });

    const res = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(adminToken))
      .send({
        title: 'Project Step Invoice',
        dateFrom: '2099-10-02',
        dateTo: '2099-10-29',
        projectId: roundingProjectId,
        hourlyRate: 50,
      });

    expect(res.status).toBe(201);
    // 240s rounds up to the project's 5-minute step → 300s → 0.08h.
    expect(res.body.roundingStepMinutes).toBe(5);
    expect(res.body.totalHours).toBe(0.08);
    expect(res.body.totalAmount).toBe(4); // 0.08h * 50

    const [row] = await db
      .select({ roundingStepMinutes: invoices.roundingStepMinutes })
      .from(invoices)
      .where(eq(invoices.id, res.body.id));
    expect(row?.roundingStepMinutes).toBe(5);

    await request(app.getHttpServer())
      .delete(`/invoices/${res.body.id}`)
      .set('Authorization', bearer(adminToken));
    await db.delete(timeEntries).where(eq(timeEntries.id, ROUNDING_ENTRY_4));
  });

  it('inherits the workspace rounding step via a null project', async () => {
    const invoiceIds: string[] = [];
    const originalStep = await readWorkspaceRoundingStep();
    await db
      .update(workspaceSettings)
      .set({ timeRoundingStepMinutes: 15 })
      .where(eq(workspaceSettings.workspaceId, workspaceId));
    try {
      await db.insert(timeEntries).values({
        id: ROUNDING_ENTRY_5,
        workspaceId,
        taskId: inheritTaskId,
        userId: bobUserId,
        source: 'manual',
        startedAt: new Date('2099-11-05T16:00:00.000Z'),
        endedAt: new Date('2099-11-05T16:10:00.000Z'),
        durationSeconds: 700,
        isBillable: true,
      });

      const res = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', bearer(adminToken))
        .send({
          title: 'Inherit Step Invoice',
          dateFrom: '2099-11-04',
          dateTo: '2099-11-28',
          projectId: inheritProjectId,
          hourlyRate: 40,
        });
      expect(res.status).toBe(201);
      invoiceIds.push(res.body.id);

      // 700s rounds up to the inherited 15-minute step → 900s → 0.25h.
      expect(res.body.roundingStepMinutes).toBe(15);
      expect(res.body.totalHours).toBe(0.25);
      expect(res.body.totalAmount).toBe(10); // 0.25h * 40

      const [row] = await db
        .select({ roundingStepMinutes: invoices.roundingStepMinutes })
        .from(invoices)
        .where(eq(invoices.id, res.body.id));
      expect(row?.roundingStepMinutes).toBe(15);
    } finally {
      if (invoiceIds.length > 0) {
        await db.delete(invoices).where(inArray(invoices.id, invoiceIds));
      }
      await db.delete(timeEntries).where(eq(timeEntries.id, ROUNDING_ENTRY_5));
      await db
        .update(workspaceSettings)
        .set({ timeRoundingStepMinutes: originalStep ?? 1 })
        .where(eq(workspaceSettings.workspaceId, workspaceId));
    }
  });

  it('snapshots the workspace step for workspace-wide invoices', async () => {
    const invoiceIds: string[] = [];
    const originalStep = await readWorkspaceRoundingStep();
    await db
      .update(workspaceSettings)
      .set({ timeRoundingStepMinutes: 10 })
      .where(eq(workspaceSettings.workspaceId, workspaceId));
    try {
      await db.insert(timeEntries).values([
        {
          id: ROUNDING_ENTRY_6,
          workspaceId,
          taskId: roundingTaskId,
          userId: bobUserId,
          source: 'manual',
          startedAt: new Date('2099-08-05T10:00:00.000Z'),
          endedAt: new Date('2099-08-05T12:00:00.000Z'),
          durationSeconds: 7200,
          isBillable: true,
        },
        {
          id: ROUNDING_ENTRY_7,
          workspaceId,
          taskId: roundingTaskId,
          userId: bobUserId,
          source: 'manual',
          startedAt: new Date('2099-08-06T10:00:00.000Z'),
          endedAt: new Date('2099-08-06T10:01:00.000Z'),
          durationSeconds: 60,
          isBillable: true,
        },
      ]);

      const res = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', bearer(adminToken))
        .send({
          title: 'Workspace Step Invoice',
          dateFrom: '2099-08-01',
          dateTo: '2099-08-31',
          hourlyRate: 25,
        });
      expect(res.status).toBe(201);
      expect(res.body.projectId).toBeNull();
      invoiceIds.push(res.body.id);

      // 7200s stays a 10-minute multiple; 60s rounds up to 600s.
      // 7800s total → 2.17h → 2.17 * 25 = 54.25.
      expect(res.body.roundingStepMinutes).toBe(10);
      expect(res.body.totalHours).toBe(2.17);
      expect(res.body.totalAmount).toBe(54.25);
      expect(res.body.timeEntryCount).toBe(2);
    } finally {
      if (invoiceIds.length > 0) {
        await db.delete(invoices).where(inArray(invoices.id, invoiceIds));
      }
      await db
        .delete(timeEntries)
        .where(inArray(timeEntries.id, [ROUNDING_ENTRY_6, ROUNDING_ENTRY_7]));
      await db
        .update(workspaceSettings)
        .set({ timeRoundingStepMinutes: originalStep ?? 1 })
        .where(eq(workspaceSettings.workspaceId, workspaceId));
    }
  });

  it('rejects out-of-range roundingStepMinutes in create', async () => {
    for (const step of [0, 61]) {
      const res = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', bearer(adminToken))
        .send({
          title: 'Invalid Step',
          dateFrom: DATE_FROM,
          dateTo: DATE_TO,
          roundingStepMinutes: step,
        });
      expect(res.status).toBe(400);
    }
  });

  it('preview applies per-entry rounding with the project step', async () => {
    await db.insert(timeEntries).values({
      id: ROUNDING_ENTRY_8,
      workspaceId,
      taskId: roundingTaskId,
      userId: bobUserId,
      source: 'manual',
      startedAt: new Date('2099-12-05T10:00:00.000Z'),
      endedAt: new Date('2099-12-05T10:01:00.000Z'),
      durationSeconds: 90,
      isBillable: true,
    });

    const res = await request(app.getHttpServer())
      .get('/invoices/eligible-entries')
      .set('Authorization', bearer(adminToken))
      .query({
        dateFrom: '2099-12-01',
        dateTo: '2099-12-31',
        projectId: roundingProjectId,
      });

    expect(res.status).toBe(200);
    // 90s rounds up to the project's 5-minute step → 300s → 0.08h.
    expect(res.body.defaultRoundingStepMinutes).toBe(5);
    expect(res.body.totalHours).toBe(0.08);
    const ids = res.body.entries.map((entry: { id: string }) => entry.id);
    expect(ids).toContain(ROUNDING_ENTRY_8);

    await db.delete(timeEntries).where(eq(timeEntries.id, ROUNDING_ENTRY_8));
  });
});

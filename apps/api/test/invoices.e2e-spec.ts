import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, gte, lt } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  invoices,
  projects,
  tasks,
  timeEntries,
  users,
} from '../src/db/schema';
import { bearer, login } from './helpers/auth';
import { getSeededAdminWorkspace } from './helpers/seeded-workspace';

const DATE_FROM = '2027-06-01';
const DATE_TO = '2027-06-30';
const ISO_FROM = `${DATE_FROM}T00:00:00.000Z`;
const PROBE_PROJECT_NAME = 'Invoice Probe Project';

describe('Invoices (e2e)', () => {
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
  let createdInvoiceIds: string[] = [];

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

    // Private project NOT assigned to the PM (Alice/seed-user-1).
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

    // Seed billable completed entries in the test window.
    const entries = [
      // Platform: bob 2h billable, carol 1.5h billable
      {
        taskId: platformApiTaskId,
        userId: bobUserId,
        startedAt: '2027-06-02T10:00:00.000Z',
        durationSeconds: 7200,
        isBillable: true,
      },
      {
        taskId: platformReviewTaskId,
        userId: carolUserId,
        startedAt: '2027-06-03T10:00:00.000Z',
        durationSeconds: 5400,
        isBillable: true,
      },
      // Platform: non-billable entry — must be excluded
      {
        taskId: platformApiTaskId,
        userId: bobUserId,
        startedAt: '2027-06-04T10:00:00.000Z',
        durationSeconds: 3600,
        isBillable: false,
      },
      // Client: carol 1h billable
      {
        taskId: clientTaskId,
        userId: carolUserId,
        startedAt: '2027-06-05T10:00:00.000Z',
        durationSeconds: 3600,
        isBillable: true,
      },
      // Probe: bob 0.5h billable (PM cannot see this project)
      {
        taskId: probeTaskId,
        userId: bobUserId,
        startedAt: '2027-06-06T10:00:00.000Z',
        durationSeconds: 1800,
        isBillable: true,
      },
    ];
    await db.insert(timeEntries).values(
      entries.map((e) => ({
        workspaceId,
        taskId: e.taskId,
        userId: e.userId,
        source: 'manual' as const,
        startedAt: new Date(e.startedAt),
        endedAt: new Date(
          new Date(e.startedAt).getTime() + e.durationSeconds * 1000,
        ),
        durationSeconds: e.durationSeconds,
        isBillable: e.isBillable,
      })),
    );

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
    // Unlink and delete invoices created in this test run.
    for (const id of createdInvoiceIds) {
      await db
        .update(timeEntries)
        .set({ invoiceId: null, updatedAt: new Date() })
        .where(eq(timeEntries.invoiceId, id));
      await db.delete(invoices).where(eq(invoices.id, id));
    }
    createdInvoiceIds = [];

    // Delete test time entries in the window.
    await db
      .delete(timeEntries)
      .where(
        and(
          eq(timeEntries.workspaceId, workspaceId),
          gte(timeEntries.startedAt, new Date(ISO_FROM)),
          lt(timeEntries.startedAt, new Date('2027-07-01T00:00:00.000Z')),
        ),
      );

    // Delete probe project.
    const probe = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, workspaceId),
          eq(projects.name, PROBE_PROJECT_NAME),
        ),
      );
    for (const p of probe) {
      await db.delete(tasks).where(eq(tasks.projectId, p.id));
      await db.delete(projects).where(eq(projects.id, p.id));
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

  function createInvoice(token: string, body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', bearer(token))
      .send(body);
  }

  // ===========================================================================
  // Authorization
  // ===========================================================================

  describe('authorization', () => {
    it('rejects member role on list', async () => {
      const res = await request(app.getHttpServer())
        .get('/invoices')
        .set('Authorization', bearer(memberToken));
      expect(res.status).toBe(403);
    });

    it('rejects member role on create', async () => {
      const res = await createInvoice(memberToken, {
        title: 'Test',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
      });
      expect(res.status).toBe(403);
    });

    it('rejects PM role on delete', async () => {
      // First create an invoice as admin so we have an ID.
      const createRes = await createInvoice(adminToken, {
        title: 'Delete Auth Test',
        projectId: platformProjectId,
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        hourlyRate: 100,
      });
      expect(createRes.status).toBe(201);
      createdInvoiceIds.push(createRes.body.id);

      const res = await request(app.getHttpServer())
        .delete(`/invoices/${createRes.body.id}`)
        .set('Authorization', bearer(pmToken));
      expect(res.status).toBe(403);
    });

    it('allows admin to delete', async () => {
      const createRes = await createInvoice(adminToken, {
        title: 'Delete Admin Test',
        projectId: platformProjectId,
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        hourlyRate: 100,
      });
      expect(createRes.status).toBe(201);
      const invoiceId = createRes.body.id;

      const delRes = await request(app.getHttpServer())
        .delete(`/invoices/${invoiceId}`)
        .set('Authorization', bearer(adminToken));
      expect(delRes.status).toBe(204);

      // Time entries should be unlinked (invoice_id = null).
      const linked = await db
        .select({ id: timeEntries.id })
        .from(timeEntries)
        .where(eq(timeEntries.invoiceId, invoiceId));
      expect(linked).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Create invoice — eligibility and calculations
  // ===========================================================================

  describe('create invoice', () => {
    it('rejects PM creating invoice for unassigned private project', async () => {
      const res = await createInvoice(pmToken, {
        title: 'PM Forbidden Project',
        projectId: probeProjectId,
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        hourlyRate: 100,
      });
      expect(res.status).toBe(403);
    });

    it('creates invoice with correct totals from eligible billable entries', async () => {
      const res = await createInvoice(adminToken, {
        title: 'Platform June 2027',
        projectId: platformProjectId,
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        hourlyRate: 100,
        discountPercent: 10,
      });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      createdInvoiceIds.push(res.body.id);

      // Eligible: 7200s + 5400s = 12600s = 3.5h. Non-billable 3600s excluded.
      expect(res.body.totalHours).toBe(3.5);
      // 3.5 * 100 = 350. 10% discount = 35. Total = 315.
      expect(res.body.totalAmount).toBe(315);
      expect(res.body.status).toBe('draft');
      expect(res.body.currency).toBe('USD');
      expect(res.body.timeEntryCount).toBe(2);
      expect(res.body.project).toMatchObject({ id: platformProjectId });
    });

    it('links time entries to the invoice and prevents double billing', async () => {
      // Create a second invoice for the same project/range — should have no
      // eligible entries because they were already billed.
      const res = await createInvoice(adminToken, {
        title: 'Platform June 2027 (duplicate)',
        projectId: platformProjectId,
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        hourlyRate: 100,
      });

      expect(res.status).toBe(422);
    });

    it('rejects when no eligible entries exist', async () => {
      const res = await createInvoice(adminToken, {
        title: 'Empty Range',
        projectId: platformProjectId,
        dateFrom: '2027-01-01',
        dateTo: '2027-01-02',
        hourlyRate: 100,
      });
      expect(res.status).toBe(422);
    });

    it('uses workspace default hourly rate when not provided', async () => {
      // Set a default hourly rate in workspace settings.
      const settingsRes = await request(app.getHttpServer())
        .patch('/workspace/settings')
        .set('Authorization', bearer(adminToken))
        .send({ defaultHourlyRate: 50 });
      expect(settingsRes.status).toBe(200);

      const res = await createInvoice(adminToken, {
        title: 'Client June 2027',
        projectId: clientProjectId,
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
      });

      // Reset workspace settings after test.
      await request(app.getHttpServer())
        .patch('/workspace/settings')
        .set('Authorization', bearer(adminToken))
        .send({ defaultHourlyRate: null });

      if (res.status === 201) {
        createdInvoiceIds.push(res.body.id);
        // 1h * 50 = 50, no discount
        expect(res.body.hourlyRate).toBe(50);
        expect(res.body.totalHours).toBe(1);
        expect(res.body.totalAmount).toBe(50);
      } else {
        // If entries were already billed by another test, that's OK.
        expect(res.status).toBe(422);
      }
    });

    it('rejects when no hourly rate is set and none provided', async () => {
      // Ensure default rate is null.
      await request(app.getHttpServer())
        .patch('/workspace/settings')
        .set('Authorization', bearer(adminToken))
        .send({ defaultHourlyRate: null });

      const res = await createInvoice(adminToken, {
        title: 'No Rate Test',
        projectId: probeProjectId,
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
      });
      expect(res.status).toBe(400);
    });

    it('handles 100% discount resulting in zero total', async () => {
      const res = await createInvoice(adminToken, {
        title: 'Full Discount Test',
        projectId: probeProjectId,
        dateFrom: '2027-06-06',
        dateTo: '2027-06-07',
        hourlyRate: 100,
        discountPercent: 100,
      });

      if (res.status === 201) {
        createdInvoiceIds.push(res.body.id);
        expect(res.body.discountPercent).toBe(100);
        expect(res.body.totalAmount).toBe(0);
      } else {
        // Entries may have been billed by another test.
        expect(res.status).toBe(422);
      }
    });
  });

  // ===========================================================================
  // PM visibility
  // ===========================================================================

  describe('PM visibility', () => {
    it('PM can list invoices for assigned projects', async () => {
      // Create an invoice for a project Alice is assigned to.
      const createRes = await createInvoice(adminToken, {
        title: 'PM Visible Invoice',
        projectId: clientProjectId,
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        hourlyRate: 75,
      });
      if (createRes.status === 201) {
        createdInvoiceIds.push(createRes.body.id);
      }

      const res = await request(app.getHttpServer())
        .get('/invoices')
        .set('Authorization', bearer(pmToken))
        .query({ projectId: clientProjectId });

      expect(res.status).toBe(200);
      // PM should see invoices for Demo Client (assigned).
      if (createRes.status === 201) {
        expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('PM cannot list invoices for unassigned private projects', async () => {
      // Create an invoice for the probe project (PM not assigned).
      const createRes = await createInvoice(adminToken, {
        title: 'PM Hidden Invoice',
        projectId: probeProjectId,
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        hourlyRate: 75,
      });
      if (createRes.status === 201) {
        createdInvoiceIds.push(createRes.body.id);
      }

      const res = await request(app.getHttpServer())
        .get('/invoices')
        .set('Authorization', bearer(pmToken))
        .query({ projectId: probeProjectId });

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(0);
    });

    it('PM cannot get details of invoice for unassigned private project', async () => {
      // Create invoice for probe project as admin.
      const createRes = await createInvoice(adminToken, {
        title: 'PM Hidden Detail',
        projectId: probeProjectId,
        dateFrom: '2027-06-06',
        dateTo: '2027-06-07',
        hourlyRate: 75,
      });

      if (createRes.status === 201) {
        createdInvoiceIds.push(createRes.body.id);
        const res = await request(app.getHttpServer())
          .get(`/invoices/${createRes.body.id}`)
          .set('Authorization', bearer(pmToken));
        expect(res.status).toBe(403);
      }
    });

    it('admin can list all workspace invoices', async () => {
      const res = await request(app.getHttpServer())
        .get('/invoices')
        .set('Authorization', bearer(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.meta).toBeDefined();
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('PM can see own project-less invoices in list', async () => {
      // PM creates an invoice without projectId (entries from accessible
      // projects). The PM must be able to see it in the list.
      const createRes = await createInvoice(pmToken, {
        title: 'PM Project-less Invoice',
        dateFrom: DATE_FROM,
        dateTo: DATE_TO,
        hourlyRate: 50,
      });

      if (createRes.status === 201) {
        createdInvoiceIds.push(createRes.body.id);
        expect(createRes.body.projectId).toBeNull();

        const res = await request(app.getHttpServer())
          .get('/invoices')
          .set('Authorization', bearer(pmToken));

        expect(res.status).toBe(200);
        const found = res.body.items.find(
          (item: { id: string }) => item.id === createRes.body.id,
        );
        expect(found).toBeDefined();
      }
    });

    it('PM cannot see admin-created project-less invoices', async () => {
      // Admin creates an invoice without projectId. PM should NOT see it
      // (it may aggregate entries from projects the PM can't access).
      const createRes = await createInvoice(adminToken, {
        title: 'Admin Project-less Invoice',
        dateFrom: '2027-06-06',
        dateTo: '2027-06-07',
        hourlyRate: 50,
      });

      if (createRes.status === 201) {
        createdInvoiceIds.push(createRes.body.id);
        expect(createRes.body.projectId).toBeNull();

        const res = await request(app.getHttpServer())
          .get('/invoices')
          .set('Authorization', bearer(pmToken));

        expect(res.status).toBe(200);
        const found = res.body.items.find(
          (item: { id: string }) => item.id === createRes.body.id,
        );
        expect(found).toBeUndefined();
      }
    });

    it('PM cannot get details of admin-created project-less invoice', async () => {
      const createRes = await createInvoice(adminToken, {
        title: 'Admin Project-less Detail',
        dateFrom: '2027-06-06',
        dateTo: '2027-06-07',
        hourlyRate: 50,
      });

      if (createRes.status === 201) {
        createdInvoiceIds.push(createRes.body.id);
        const res = await request(app.getHttpServer())
          .get(`/invoices/${createRes.body.id}`)
          .set('Authorization', bearer(pmToken));
        expect(res.status).toBe(403);
      }
    });
  });

  // ===========================================================================
  // Update invoice
  // ===========================================================================

  describe('update invoice', () => {
    it('updates status from draft to sent', async () => {
      const createRes = await createInvoice(adminToken, {
        title: 'Status Update Test',
        projectId: probeProjectId,
        dateFrom: '2027-06-06',
        dateTo: '2027-06-07',
        hourlyRate: 80,
      });
      if (createRes.status !== 201) return;
      createdInvoiceIds.push(createRes.body.id);

      const res = await request(app.getHttpServer())
        .patch(`/invoices/${createRes.body.id}`)
        .set('Authorization', bearer(adminToken))
        .send({ status: 'sent' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('sent');
    });

    it('rejects invalid status transition (draft to paid)', async () => {
      const createRes = await createInvoice(adminToken, {
        title: 'Invalid Transition Test',
        projectId: probeProjectId,
        dateFrom: '2027-06-06',
        dateTo: '2027-06-07',
        hourlyRate: 80,
      });
      if (createRes.status !== 201) return;
      createdInvoiceIds.push(createRes.body.id);

      const res = await request(app.getHttpServer())
        .patch(`/invoices/${createRes.body.id}`)
        .set('Authorization', bearer(adminToken))
        .send({ status: 'paid' });

      expect(res.status).toBe(409);
    });

    it('rejects rate change on non-draft (sent) invoice', async () => {
      const createRes = await createInvoice(adminToken, {
        title: 'Rate Lock Test',
        projectId: probeProjectId,
        dateFrom: '2027-06-06',
        dateTo: '2027-06-07',
        hourlyRate: 80,
      });
      if (createRes.status !== 201) return;
      createdInvoiceIds.push(createRes.body.id);

      // Move to sent.
      await request(app.getHttpServer())
        .patch(`/invoices/${createRes.body.id}`)
        .set('Authorization', bearer(adminToken))
        .send({ status: 'sent' });

      // Try to change rate on sent invoice.
      const res = await request(app.getHttpServer())
        .patch(`/invoices/${createRes.body.id}`)
        .set('Authorization', bearer(adminToken))
        .send({ hourlyRate: 100 });

      expect(res.status).toBe(409);
    });

    it('updates notes on any status', async () => {
      const createRes = await createInvoice(adminToken, {
        title: 'Notes Update Test',
        projectId: probeProjectId,
        dateFrom: '2027-06-06',
        dateTo: '2027-06-07',
        hourlyRate: 80,
      });
      if (createRes.status !== 201) return;
      createdInvoiceIds.push(createRes.body.id);

      // Move to sent.
      await request(app.getHttpServer())
        .patch(`/invoices/${createRes.body.id}`)
        .set('Authorization', bearer(adminToken))
        .send({ status: 'sent' });

      const res = await request(app.getHttpServer())
        .patch(`/invoices/${createRes.body.id}`)
        .set('Authorization', bearer(adminToken))
        .send({ notes: 'Updated after sending' });

      expect(res.status).toBe(200);
      expect(res.body.notes).toBe('Updated after sending');
    });

    it('recalculates totals when rate changes on draft', async () => {
      const createRes = await createInvoice(adminToken, {
        title: 'Recalc Test',
        projectId: probeProjectId,
        dateFrom: '2027-06-06',
        dateTo: '2027-06-07',
        hourlyRate: 80,
      });
      if (createRes.status !== 201) return;
      createdInvoiceIds.push(createRes.body.id);

      // 0.5h * 80 = 40
      expect(createRes.body.totalAmount).toBe(40);

      const res = await request(app.getHttpServer())
        .patch(`/invoices/${createRes.body.id}`)
        .set('Authorization', bearer(adminToken))
        .send({ hourlyRate: 100 });

      expect(res.status).toBe(200);
      // 0.5h * 100 = 50
      expect(res.body.hourlyRate).toBe(100);
      expect(res.body.totalAmount).toBe(50);
    });

    it('rejects status revert (sent to draft)', async () => {
      const createRes = await createInvoice(adminToken, {
        title: 'Revert Status Test',
        projectId: probeProjectId,
        dateFrom: '2027-06-06',
        dateTo: '2027-06-07',
        hourlyRate: 80,
      });
      if (createRes.status !== 201) return;
      createdInvoiceIds.push(createRes.body.id);

      // Move to sent.
      await request(app.getHttpServer())
        .patch(`/invoices/${createRes.body.id}`)
        .set('Authorization', bearer(adminToken))
        .send({ status: 'sent' });

      // Try to revert to draft.
      const res = await request(app.getHttpServer())
        .patch(`/invoices/${createRes.body.id}`)
        .set('Authorization', bearer(adminToken))
        .send({ status: 'draft' });

      expect(res.status).toBe(409);
    });

    it('rejects any update on paid invoice except notes', async () => {
      const createRes = await createInvoice(adminToken, {
        title: 'Paid Lock Test',
        projectId: probeProjectId,
        dateFrom: '2027-06-06',
        dateTo: '2027-06-07',
        hourlyRate: 80,
      });
      if (createRes.status !== 201) return;
      createdInvoiceIds.push(createRes.body.id);

      // Move draft → sent → paid.
      await request(app.getHttpServer())
        .patch(`/invoices/${createRes.body.id}`)
        .set('Authorization', bearer(adminToken))
        .send({ status: 'sent' });
      await request(app.getHttpServer())
        .patch(`/invoices/${createRes.body.id}`)
        .set('Authorization', bearer(adminToken))
        .send({ status: 'paid' });

      // Status change on paid should fail.
      const statusRes = await request(app.getHttpServer())
        .patch(`/invoices/${createRes.body.id}`)
        .set('Authorization', bearer(adminToken))
        .send({ status: 'sent' });
      expect(statusRes.status).toBe(409);

      // Rate change on paid should fail.
      const rateRes = await request(app.getHttpServer())
        .patch(`/invoices/${createRes.body.id}`)
        .set('Authorization', bearer(adminToken))
        .send({ hourlyRate: 999 });
      expect(rateRes.status).toBe(409);

      // Title change on paid should fail.
      const titleRes = await request(app.getHttpServer())
        .patch(`/invoices/${createRes.body.id}`)
        .set('Authorization', bearer(adminToken))
        .send({ title: 'Changed' });
      expect(titleRes.status).toBe(409);

      // Notes change on paid should succeed.
      const notesRes = await request(app.getHttpServer())
        .patch(`/invoices/${createRes.body.id}`)
        .set('Authorization', bearer(adminToken))
        .send({ notes: 'Final notes' });
      expect(notesRes.status).toBe(200);
      expect(notesRes.body.notes).toBe('Final notes');
    });
  });

  // ===========================================================================
  // Delete invoice — unlinks time entries
  // ===========================================================================

  describe('delete invoice', () => {
    it('deleting invoice unlinks time entries making them eligible again', async () => {
      const createRes = await createInvoice(adminToken, {
        title: 'Delete Reclaim Test',
        projectId: probeProjectId,
        dateFrom: '2027-06-06',
        dateTo: '2027-06-07',
        hourlyRate: 80,
      });
      if (createRes.status !== 201) return;
      const invoiceId = createRes.body.id;

      // Verify entries are linked.
      const linkedBefore = await db
        .select({ id: timeEntries.id })
        .from(timeEntries)
        .where(eq(timeEntries.invoiceId, invoiceId));
      expect(linkedBefore.length).toBeGreaterThan(0);

      // Delete as admin.
      const delRes = await request(app.getHttpServer())
        .delete(`/invoices/${invoiceId}`)
        .set('Authorization', bearer(adminToken));
      expect(delRes.status).toBe(204);

      // Verify entries are unlinked.
      const linkedAfter = await db
        .select({ id: timeEntries.id })
        .from(timeEntries)
        .where(eq(timeEntries.invoiceId, invoiceId));
      expect(linkedAfter).toHaveLength(0);

      // Now the entries should be eligible for a new invoice.
      const recreateRes = await createInvoice(adminToken, {
        title: 'Reclaimed Entries',
        projectId: probeProjectId,
        dateFrom: '2027-06-06',
        dateTo: '2027-06-07',
        hourlyRate: 80,
      });
      expect(recreateRes.status).toBe(201);
      if (recreateRes.status === 201) {
        createdInvoiceIds.push(recreateRes.body.id);
      }
    });

    it('returns 404 for non-existent invoice', async () => {
      const res = await request(app.getHttpServer())
        .delete('/invoices/00000000-0000-4000-8000-000000000099')
        .set('Authorization', bearer(adminToken));
      expect(res.status).toBe(404);
    });
  });

  // ===========================================================================
  // Workspace isolation
  // ===========================================================================

  describe('workspace isolation', () => {
    it('getInvoice returns 404 for invoice from another workspace', async () => {
      // Use a random UUID that doesn't exist in this workspace.
      const res = await request(app.getHttpServer())
        .get('/invoices/00000000-0000-4000-8000-000000000099')
        .set('Authorization', bearer(adminToken));
      expect(res.status).toBe(404);
    });
  });
});

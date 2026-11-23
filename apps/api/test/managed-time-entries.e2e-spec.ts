import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { and, eq, inArray } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  invoices,
  projectAssignments,
  projects,
  tasks,
  timeEntries,
  users,
  workspaceMembers,
  workspaces,
} from '../src/db/schema';
import { bearer, login } from './helpers/auth';
import { getSeededAdminWorkspace } from './helpers/seeded-workspace';

const start = '2031-06-03T10:00:00.000Z';
const end = '2031-06-03T11:00:00.000Z';
const upper = '2031-06-04T10:00:00.000Z';

describe('Managed time entries (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let workspaceId: string;
  let adminId: string;
  let adminToken: string;
  let pmId: string;
  let pmToken: string;
  let memberId: string;
  let memberToken: string;
  let foreignToken: string;
  let originalInvoicePermission: boolean;
  const formerOwnerId = randomUUID();
  const foreignAdminId = randomUUID();
  const foreignWorkspaceId = randomUUID();
  const publicProject = randomUUID();
  const privateProject = randomUUID();
  const archivedProject = randomUUID();
  const externalProject = randomUUID();
  const foreignProject = randomUUID();
  const unassignedProject = randomUUID();
  const projectIds = [
    privateProject,
    publicProject,
    archivedProject,
    externalProject,
    foreignProject,
    unassignedProject,
  ];
  const publicTask = randomUUID();
  const alternateTask = randomUUID();
  const privateTask = randomUUID();
  const archivedTask = randomUUID();
  const externalTask = randomUUID();
  const siblingTask = randomUUID();
  const hiddenTask = randomUUID();
  const selectedProjects = '/management/projects';
  const projectPath = (id: string) => `${selectedProjects}/${id}`;
  const entriesPath = (id: string) => `${projectPath(id)}/time-entries`;
  const records = entriesPath(publicProject);
  const get = (url: string, token = adminToken) =>
    request(app.getHttpServer()).get(url).set('Authorization', bearer(token));
  const create = (
    projectId: string,
    token: string,
    userId: string,
    taskId: string,
  ) =>
    request(app.getHttpServer())
      .post(entriesPath(projectId))
      .set('Authorization', bearer(token))
      .send({ userId, taskId, startedAt: start, endedAt: end });
  const patch = (
    projectId: string,
    id: string,
    body: object,
    token = adminToken,
  ) =>
    request(app.getHttpServer())
      .patch(`${entriesPath(projectId)}/${id}`)
      .set('Authorization', bearer(token))
      .send(body);
  const remove = (projectId: string, id: string, token = adminToken) =>
    request(app.getHttpServer())
      .delete(`${entriesPath(projectId)}/${id}`)
      .set('Authorization', bearer(token));
  const read = async (id: string) =>
    (await db.select().from(timeEntries).where(eq(timeEntries.id, id)))[0];
  const pmMembership = () =>
    and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, pmId),
    );

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get<DrizzleDB>(DRIZZLE);

    const { admin, workspace } = await getSeededAdminWorkspace(db);
    workspaceId = workspace.id;
    adminId = admin.id;
    const findUser = async (uid: string) => {
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.firebaseUid, uid));
      if (!user) throw new Error(`Missing seeded user ${uid}`);
      return user.id;
    };
    pmId = await findUser('seed-user-1');
    memberId = await findUser('seed-user-2');
    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(pmMembership());
    originalInvoicePermission = membership.canViewInvoices;
    await db
      .update(workspaceMembers)
      .set({ canViewInvoices: false })
      .where(pmMembership());

    await db.insert(workspaces).values({
      id: foreignWorkspaceId,
      name: 'Time management foreign fixture',
    });
    const suffix = publicProject.slice(0, 8);
    await db.insert(users).values([
      {
        id: formerOwnerId,
        firebaseUid: `former-${suffix}`,
        email: `former-${suffix}@example.com`,
        displayName: 'Former contributor',
      },
      {
        id: foreignAdminId,
        firebaseUid: `foreign-${suffix}`,
        email: `foreign-${suffix}@example.com`,
        displayName: 'Foreign admin',
      },
    ]);
    await db.insert(workspaceMembers).values({
      workspaceId: foreignWorkspaceId,
      userId: foreignAdminId,
      role: 'admin',
    });
    await db.insert(projects).values([
      {
        id: publicProject,
        workspaceId,
        name: `Management public ${suffix}`,
        visibility: 'public',
      },
      { id: privateProject, workspaceId, name: `Management private ${suffix}` },
      {
        id: archivedProject,
        workspaceId,
        name: `Management archived ${suffix}`,
        isActive: false,
      },
      {
        id: externalProject,
        workspaceId,
        name: `Management external ${suffix}`,
        trackingMode: 'external-reference',
      },
      {
        id: unassignedProject,
        workspaceId,
        name: `Management hidden ${suffix}`,
        visibility: 'public',
      },
      {
        id: foreignProject,
        workspaceId: foreignWorkspaceId,
        name: `Management foreign ${suffix}`,
      },
    ]);
    await db.insert(projectAssignments).values(
      [publicProject, privateProject, archivedProject, externalProject].map(
        (projectId) => ({
          projectId,
          workspaceId,
          userId: pmId,
          assignedBy: adminId,
        }),
      ),
    );
    await db.insert(tasks).values([
      {
        id: publicTask,
        workspaceId,
        projectId: publicProject,
        title: 'API 100% readiness',
        defaultBillableForTimeEntries: false,
      },
      {
        id: alternateTask,
        workspaceId,
        projectId: publicProject,
        title: 'API 100X readiness',
      },
      {
        id: privateTask,
        workspaceId,
        projectId: privateProject,
        title: 'API 100% readiness',
      },
      {
        id: archivedTask,
        workspaceId,
        projectId: archivedProject,
        title: 'Archived task',
        status: 'closed',
      },
      {
        id: externalTask,
        workspaceId,
        projectId: externalProject,
        title: 'Participated task',
      },
      {
        id: siblingTask,
        workspaceId,
        projectId: externalProject,
        title: 'Sibling task',
      },
      {
        id: hiddenTask,
        workspaceId,
        projectId: unassignedProject,
        title: 'API 100% readiness',
      },
    ]);
    adminToken = (await login(app)).accessToken;
    pmToken = (await login(app, 'test:seed-user-1:alice@gitiempo.dev:Alice'))
      .accessToken;
    memberToken = (await login(app, 'test:seed-user-2:bob@gitiempo.dev:Bob'))
      .accessToken;
    foreignToken = (
      await login(
        app,
        `test:foreign-${suffix}:foreign-${suffix}@example.com:Foreign admin`,
      )
    ).accessToken;
  });

  afterAll(async () => {
    try {
      if (db) {
        const fixtureTasks = db
          .select({ id: tasks.id })
          .from(tasks)
          .where(inArray(tasks.projectId, projectIds));
        await db
          .delete(timeEntries)
          .where(inArray(timeEntries.taskId, fixtureTasks));
        await db
          .delete(invoices)
          .where(inArray(invoices.projectId, projectIds));
        await db.delete(tasks).where(inArray(tasks.projectId, projectIds));
        await db.delete(projects).where(inArray(projects.id, projectIds));
        await db
          .delete(users)
          .where(inArray(users.id, [formerOwnerId, foreignAdminId]));
        await db
          .delete(workspaces)
          .where(eq(workspaces.id, foreignWorkspaceId));
        if (originalInvoicePermission !== undefined) {
          await db
            .update(workspaceMembers)
            .set({ canViewInvoices: originalInvoicePermission })
            .where(pmMembership());
        }
      }
    } finally {
      await app?.close();
    }
  });

  async function insertEntry(
    overrides: Partial<typeof timeEntries.$inferInsert> = {},
  ) {
    const id = randomUUID();
    await db.insert(timeEntries).values({
      id,
      workspaceId,
      userId: memberId,
      taskId: publicTask,
      startedAt: new Date(start),
      endedAt: new Date(end),
      durationSeconds: 3600,
      ...overrides,
    });
    return id;
  }

  it('authorizes lookups and direct requests by current workspace role and assignment', async () => {
    const pmProjects = await get(
      `${selectedProjects}?limit=100`,
      pmToken,
    ).expect(200);
    const pmIds = pmProjects.body.items.map((item: { id: string }) => item.id);
    expect(pmIds).toEqual(
      expect.arrayContaining([publicProject, archivedProject, externalProject]),
    );
    expect(pmIds).not.toContain(unassignedProject);
    const adminProjects = await get(`${selectedProjects}?limit=100`).expect(
      200,
    );
    expect(adminProjects.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: privateProject }),
        expect.objectContaining({ id: archivedProject, isActive: false }),
      ]),
    );
    expect(adminProjects.body.items).not.toContainEqual(
      expect.objectContaining({ id: foreignProject }),
    );
    await get(`${selectedProjects}?limit=1`, pmToken)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(1);
        expect(body.meta.total).toBe(pmProjects.body.meta.total);
      });
    await request(app.getHttpServer()).get(records).expect(401);
    await get(selectedProjects, memberToken).expect(403);
    await get(records, memberToken).expect(403);
    await get(
      `${projectPath(publicProject)}/time-entry-tasks?userId=${memberId}`,
      memberToken,
    ).expect(403);
    await create(publicProject, memberToken, memberId, publicTask).expect(403);
    await get(entriesPath(foreignProject), foreignToken).expect(200);
    await get(records, foreignToken).expect(404);
    await get(entriesPath(foreignProject)).expect(404);
    await get(entriesPath(unassignedProject), pmToken).expect(404);
    await get(
      `${projectPath(unassignedProject)}/time-entry-members?purpose=create`,
      pmToken,
    ).expect(404);
    await create(unassignedProject, pmToken, memberId, hiddenTask).expect(404);
    const hiddenEntry = await insertEntry({ taskId: hiddenTask });
    await patch(
      unassignedProject,
      hiddenEntry,
      { description: 'Unauthorized' },
      memberToken,
    ).expect(403);
    await remove(unassignedProject, hiddenEntry, memberToken).expect(403);
    await patch(
      unassignedProject,
      hiddenEntry,
      { description: 'Unauthorized' },
      pmToken,
    ).expect(404);
    await remove(unassignedProject, hiddenEntry, pmToken).expect(404);
    await patch(publicProject, hiddenEntry, {
      description: 'Wrong project',
    }).expect(404);
    expect((await read(hiddenEntry)).description).toBeNull();
  });

  it('distinguishes historical filter owners from eligible create owners and task options', async () => {
    await insertEntry({ userId: formerOwnerId, taskId: archivedTask });
    const filterMembers = await get(
      `${projectPath(archivedProject)}/time-entry-members?purpose=filter`,
      pmToken,
    ).expect(200);
    expect(filterMembers.body.items).toEqual([
      expect.objectContaining({ id: formerOwnerId }),
    ]);
    const archivedMembers = await get(
      `${projectPath(archivedProject)}/time-entry-members?purpose=create`,
      pmToken,
    ).expect(200);
    expect(archivedMembers.body.items).toEqual([]);
    const eligibleMembers = await get(
      `${projectPath(publicProject)}/time-entry-members?purpose=create&limit=100`,
      pmToken,
    ).expect(200);
    expect(eligibleMembers.body.items).toContainEqual(
      expect.objectContaining({ id: memberId }),
    );
    expect(eligibleMembers.body.items).not.toContainEqual(
      expect.objectContaining({ id: formerOwnerId }),
    );
    const pagedMembers = await get(
      `${projectPath(publicProject)}/time-entry-members?purpose=create&page=2&limit=1`,
      pmToken,
    ).expect(200);
    expect(pagedMembers.body.items).toEqual(
      eligibleMembers.body.items.slice(1, 2),
    );
    expect(pagedMembers.body.meta.total).toBe(eligibleMembers.body.meta.total);
    const privateMembers = await get(
      `${projectPath(privateProject)}/time-entry-members?purpose=create&limit=100`,
    ).expect(200);
    expect(privateMembers.body.items).not.toContainEqual(
      expect.objectContaining({ id: memberId }),
    );
    const externalEntry = await insertEntry({ taskId: externalTask });
    const eligibleTasks = await get(
      `${projectPath(externalProject)}/time-entry-tasks?userId=${memberId}`,
      pmToken,
    ).expect(200);
    expect(eligibleTasks.body.items).toEqual([
      expect.objectContaining({ id: externalTask }),
    ]);
    await create(externalProject, pmToken, memberId, externalTask).expect(201);
    const sibling = await create(
      externalProject,
      pmToken,
      memberId,
      siblingTask,
    );
    expect(sibling.status).toBe(422);
    await patch(
      externalProject,
      externalEntry,
      { taskId: siblingTask },
      pmToken,
    ).expect(422);
    expect((await read(externalEntry)).taskId).toBe(externalTask);
    const taskPage = await get(
      `${projectPath(publicProject)}/time-entry-tasks?userId=${memberId}&page=2&limit=1`,
      pmToken,
    ).expect(200);
    expect(taskPage.body.items).toHaveLength(1);
    expect(taskPage.body.meta).toEqual({
      page: 2,
      limit: 1,
      total: 2,
      totalPages: 2,
    });
  });

  it('combines literal search, owner and date bounds before stable pagination', async () => {
    const createdAt = new Date(start);
    const first = await insertEntry({ createdAt });
    const second = await insertEntry({ createdAt });
    await insertEntry({ userId: adminId });
    await insertEntry({ taskId: alternateTask });
    await insertEntry({ taskId: hiddenTask });
    await insertEntry({ taskId: privateTask });
    await insertEntry({ startedAt: new Date('2031-06-03T09:59:59.999Z') });
    await insertEntry({
      startedAt: new Date(upper),
      endedAt: new Date('2031-06-04T11:00:00.000Z'),
    });
    const query = {
      userId: memberId,
      search: 'aPi 100%',
      dateFrom: start,
      dateTo: upper,
      limit: 1,
    };
    const ids = [first, second].sort().reverse();
    for (const page of [1, 2, 3]) {
      const result = await get(records, pmToken)
        .query({ ...query, page })
        .expect(200);
      expect(
        result.body.items.map((entry: { id: string }) => entry.id),
      ).toEqual(ids.slice(page - 1, page));
      expect(result.body.meta).toEqual({
        page,
        limit: 1,
        total: 2,
        totalPages: 2,
      });
    }
    const personal = await get('/time-entries', memberToken)
      .query({
        projectId: publicProject,
        search: query.search,
        dateFrom: start,
        dateTo: upper,
      })
      .expect(200);
    expect(
      personal.body.items.map((entry: { id: string }) => entry.id).sort(),
    ).toEqual([first, second].sort());
  });

  it('creates for another owner and preserves ownership through edits and deletion', async () => {
    const created = await create(
      publicProject,
      pmToken,
      memberId,
      publicTask,
    ).expect(201);
    const id: string = created.body.id;
    expect(created.body).toMatchObject({
      userId: memberId,
      projectId: publicProject,
      taskId: publicTask,
      source: 'manual',
      durationSeconds: 3600,
      isBillable: false,
    });
    const edited = await patch(
      publicProject,
      id,
      {
        taskId: alternateTask,
        endedAt: '2031-06-03T11:30:00.000Z',
        description: 'Corrected',
        isBillable: true,
      },
      pmToken,
    ).expect(200);
    expect(edited.body).toMatchObject({
      userId: memberId,
      projectId: publicProject,
      taskId: alternateTask,
      durationSeconds: 5400,
      description: 'Corrected',
      isBillable: true,
    });
    await patch(publicProject, id, { taskId: privateTask }, pmToken).expect(
      404,
    );
    await patch(publicProject, id, { userId: adminId }, pmToken).expect(400);
    await patch(
      publicProject,
      id,
      { projectId: privateProject },
      pmToken,
    ).expect(400);
    await patch(publicProject, id, { startedAt: upper }, pmToken).expect(400);
    expect(await read(id)).toMatchObject({
      userId: memberId,
      taskId: alternateTask,
      durationSeconds: 5400,
    });
    await remove(publicProject, id, pmToken).expect(204);
    expect(await read(id)).toBeUndefined();

    await create(privateProject, adminToken, memberId, privateTask).expect(422);
    await create(publicProject, adminToken, formerOwnerId, publicTask).expect(
      422,
    );
    await create(publicProject, adminToken, memberId, privateTask).expect(404);
    const override = await request(app.getHttpServer())
      .post(records)
      .set('Authorization', bearer(adminToken))
      .send({
        userId: memberId,
        taskId: publicTask,
        startedAt: start,
        endedAt: end,
        isBillable: true,
      })
      .expect(201);
    expect(override.body.isBillable).toBe(true);
  });

  it('corrects and deletes historical entries on archived work without reviving owner access', async () => {
    const id = await insertEntry({
      taskId: archivedTask,
      userId: formerOwnerId,
    });
    await create(archivedProject, pmToken, memberId, archivedTask).expect(422);
    await patch(
      archivedProject,
      id,
      {
        taskId: archivedTask,
        description: 'Historical correction',
        isBillable: false,
      },
      pmToken,
    ).expect(200);
    expect(await read(id)).toMatchObject({
      taskId: archivedTask,
      userId: formerOwnerId,
      description: 'Historical correction',
      isBillable: false,
    });
    await remove(archivedProject, id, pmToken).expect(204);
  });

  it('keeps running and each invoiced status visible while rejecting edits and deletes atomically', async () => {
    const running = await insertEntry({
      userId: formerOwnerId,
      endedAt: null,
      durationSeconds: null,
    });
    const locks = [{ id: running, code: 'time_entry_running' }];
    for (const status of ['draft', 'sent', 'paid'] as const) {
      const invoiceId = randomUUID();
      await db.insert(invoices).values({
        id: invoiceId,
        workspaceId,
        projectId: publicProject,
        title: status,
        status,
        dateFrom: '2031-06-01',
        dateTo: '2031-06-30',
        hourlyRate: 100,
        currency: 'USD',
        createdBy: adminId,
      });
      locks.push({
        id: await insertEntry({ invoiceId }),
        code: 'time_entry_invoiced',
      });
    }
    const listed = await get(records, pmToken)
      .query({ limit: 100 })
      .expect(200);
    for (const { id, code } of locks) {
      expect(listed.body.items).toContainEqual(expect.objectContaining({ id }));
      const before = await read(id);
      const expectedMessage =
        code === 'time_entry_running' ? /stop.*timer/i : /included.*invoice/i;
      for (const response of [
        await patch(publicProject, id, { description: 'Reject me' }, pmToken),
        await remove(publicProject, id, pmToken),
      ]) {
        expect(response.status).toBe(409);
        expect(response.body).toMatchObject({
          code,
          message: expect.stringMatching(expectedMessage),
        });
        expect(await read(id)).toEqual(before);
      }
    }
    await db.delete(timeEntries).where(eq(timeEntries.id, running));
  });

  it('checks destination eligibility again after owner access changes', async () => {
    await db.insert(projectAssignments).values({
      workspaceId,
      projectId: privateProject,
      userId: memberId,
      assignedBy: adminId,
    });
    const query = `${projectPath(privateProject)}/time-entry-tasks?userId=${memberId}`;
    const initial = await get(query).expect(200);
    expect(initial.body.items).toContainEqual(
      expect.objectContaining({ id: privateTask }),
    );
    await db
      .delete(projectAssignments)
      .where(
        and(
          eq(projectAssignments.projectId, privateProject),
          eq(projectAssignments.userId, memberId),
        ),
      );
    await create(privateProject, adminToken, memberId, privateTask).expect(422);
  });

  it('expires a revoked PM assignment without changing personal and team time operations', async () => {
    const id = await insertEntry();
    await db
      .delete(projectAssignments)
      .where(
        and(
          eq(projectAssignments.projectId, publicProject),
          eq(projectAssignments.userId, pmId),
        ),
      );
    try {
      await get(records, pmToken).expect(404);
      await patch(publicProject, id, { description: 'Denied' }, pmToken).expect(
        404,
      );
      await remove(publicProject, id, pmToken).expect(404);
      const team = await get(
        `/projects/${publicProject}/time-entries`,
        pmToken,
      ).expect(200);
      expect(team.body.items).toContainEqual(expect.objectContaining({ id }));
      await request(app.getHttpServer())
        .patch(`/time-entries/${id}`)
        .set('Authorization', bearer(pmToken))
        .send({ description: 'Denied' })
        .expect(404);
      await request(app.getHttpServer())
        .patch(`/time-entries/${id}`)
        .set('Authorization', bearer(memberToken))
        .send({ description: 'Personal edit' })
        .expect(200);
      await request(app.getHttpServer())
        .delete(`/time-entries/${id}`)
        .set('Authorization', bearer(memberToken))
        .expect(204);

      const active = await request(app.getHttpServer())
        .post('/time-entries/timer/start')
        .set('Authorization', bearer(memberToken))
        .send({ taskId: publicTask })
        .expect(201);
      try {
        await request(app.getHttpServer())
          .patch(`/time-entries/${String(active.body.id)}`)
          .set('Authorization', bearer(memberToken))
          .send({ description: 'Personal running edit' })
          .expect(200);
      } finally {
        await db
          .delete(timeEntries)
          .where(eq(timeEntries.id, String(active.body.id)));
      }
    } finally {
      await db.insert(projectAssignments).values({
        workspaceId,
        projectId: publicProject,
        userId: pmId,
        assignedBy: adminId,
      });
    }
  });

  it.each(['edit', 'delete'] as const)(
    'serializes invoice attachment with administrative %s',
    async (operation) => {
      const id = await insertEntry({ isBillable: true });
      const title = `Time management ${operation} race`;
      const invoiceRequest = request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', bearer(adminToken))
        .send({
          title,
          projectId: publicProject,
          timeEntryIds: [id],
          dateFrom: '2031-06-01',
          dateTo: '2031-06-30',
          hourlyRate: 100,
          sender: {
            name: 'Issuer',
            address: 'Kyiv',
            email: 'issuer@example.com',
            taxId: '',
          },
          recipient: {
            name: 'Client',
            address: 'Berlin',
            email: 'client@example.com',
            taxId: '',
          },
          services: 'Development',
          payment: {
            method: 'Bank transfer',
            beneficiary: 'Issuer',
            provider: 'Bank',
            account: 'ACCOUNT',
            terms: '',
            instructions: '',
          },
        });
      const mutation =
        operation === 'edit'
          ? patch(
              publicProject,
              id,
              { endedAt: '2031-06-03T12:00:00.000Z' },
              pmToken,
            )
          : remove(publicProject, id, pmToken);
      const [invoice, result] = await Promise.all([invoiceRequest, mutation]);
      const final = await read(id);
      const savedInvoices = await db
        .select({ id: invoices.id, totalHours: invoices.totalHours })
        .from(invoices)
        .where(
          and(eq(invoices.projectId, publicProject), eq(invoices.title, title)),
        );
      if (result.status === 409) {
        expect(result.body.code).toBe('time_entry_invoiced');
        expect(invoice.status).toBe(201);
        expect(invoice.body.totalHours).toBe(1);
        expect(savedInvoices).toEqual([{ id: invoice.body.id, totalHours: 1 }]);
        expect(final).toMatchObject({
          invoiceId: invoice.body.id,
          durationSeconds: 3600,
        });
      } else if (operation === 'edit') {
        expect(result.status).toBe(200);
        expect(invoice.status).toBe(201);
        expect(invoice.body.totalHours).toBe(2);
        expect(savedInvoices).toEqual([{ id: invoice.body.id, totalHours: 2 }]);
        expect(final).toMatchObject({
          invoiceId: invoice.body.id,
          durationSeconds: 7200,
        });
      } else {
        expect(result.status).toBe(204);
        expect(invoice.status).toBe(409);
        expect(invoice.body.code).toBe('invoice_entry_conflict');
        expect(savedInvoices).toEqual([]);
        expect(final).toBeUndefined();
      }
    },
  );
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, like } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import { savedReports, workspaces } from '../src/db/schema';
import { bearer, login } from './helpers/auth';
import { getSeededAdminWorkspace } from './helpers/seeded-workspace';

const NAME_PREFIX = 'E2E Preset';

type PresetConfig = Record<string, unknown>;

const validConfig: PresetConfig = {
  dateRange: {
    dateFrom: '2026-07-01T00:00:00.000Z',
    dateTo: '2026-07-15T00:00:00.000Z',
    kind: 'absolute',
  },
  filters: {
    activity: 'today',
    billable: 'withBillable',
    billableShare: 'gte90',
    global: 'orion',
    hours: 'gte8',
  },
  grouping: ['project', 'user'],
  memberId: null,
  projectId: null,
};

describe('Saved reports (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let adminToken: string;
  let pmToken: string;
  let memberToken: string;
  let otherWorkspaceId: string;

  const url = (path = '') => `/reports/saved${path}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<DrizzleDB>(DRIZZLE);

    await getSeededAdminWorkspace(db);

    adminToken = (await login(app)).accessToken;
    pmToken = (await login(app, 'test:seed-user-1:alice@gitiempo.dev:Alice'))
      .accessToken;
    memberToken = (await login(app, 'test:seed-user-2:bob@gitiempo.dev:Bob'))
      .accessToken;

    const [otherWorkspace] = await db
      .insert(workspaces)
      .values({ name: `${NAME_PREFIX} Other Workspace` })
      .returning({ id: workspaces.id });
    otherWorkspaceId = otherWorkspace!.id;
  });

  afterAll(async () => {
    await cleanupPresets();
    await db.delete(workspaces).where(eq(workspaces.id, otherWorkspaceId));
    await app.close();
  });

  beforeEach(async () => {
    await cleanupPresets();
  });

  async function cleanupPresets() {
    await db
      .delete(savedReports)
      .where(like(savedReports.name, `${NAME_PREFIX}%`));
  }

  async function createPreset(
    token: string,
    name: string,
    config: PresetConfig = validConfig,
  ) {
    return request(app.getHttpServer())
      .post(url())
      .set('Authorization', bearer(token))
      .send({ config, name });
  }

  it('creates a preset and returns it in the workspace list', async () => {
    const created = await createPreset(adminToken, `${NAME_PREFIX} Monthly`);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      config: validConfig,
      name: `${NAME_PREFIX} Monthly`,
    });
    expect(created.body.id).toBeTruthy();

    const list = await request(app.getHttpServer())
      .get(url())
      .set('Authorization', bearer(adminToken));

    expect(list.status).toBe(200);
    expect(
      (list.body as { name: string }[]).map((preset) => preset.name),
    ).toContain(`${NAME_PREFIX} Monthly`);
  });

  it('round-trips an absolute window unchanged', async () => {
    const absolute = {
      ...validConfig,
      dateRange: {
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-06-01T00:00:00.000Z',
        kind: 'absolute',
      },
    };

    const created = await createPreset(
      adminToken,
      `${NAME_PREFIX} Absolute`,
      absolute,
    );

    expect(created.status).toBe(201);
    expect(created.body.config.dateRange).toEqual(absolute.dateRange);
  });

  it('rejects a config missing its required date range', async () => {
    const created = await createPreset(
      adminToken,
      `${NAME_PREFIX} Minimal`,
      {},
    );

    expect(created.status).toBe(400);
  });

  it('rejects a duplicate name, ignoring case and surrounding space', async () => {
    await createPreset(adminToken, `${NAME_PREFIX} Billing`);

    const duplicate = await createPreset(
      adminToken,
      `  ${NAME_PREFIX.toUpperCase()} BILLING  `,
    );

    expect(duplicate.status).toBe(409);
  });

  it('rejects an invalid config', async () => {
    const bad = await createPreset(adminToken, `${NAME_PREFIX} Bad`, {
      ...validConfig,
      grouping: ['project', 'client'],
    });

    expect(bad.status).toBe(400);
  });

  it('rejects retired relative periods', async () => {
    const bad = await createPreset(adminToken, `${NAME_PREFIX} BadPeriod`, {
      ...validConfig,
      dateRange: { kind: 'relative', period: 'this_month' },
    });

    expect(bad.status).toBe(400);
  });

  it('lets a PM update a preset created by an admin', async () => {
    const created = await createPreset(adminToken, `${NAME_PREFIX} Shared`);

    const updated = await request(app.getHttpServer())
      .patch(url(`/${created.body.id}`))
      .set('Authorization', bearer(pmToken))
      .send({ name: `${NAME_PREFIX} Shared Renamed` });

    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe(`${NAME_PREFIX} Shared Renamed`);
  });

  it('replaces the config on update', async () => {
    const created = await createPreset(adminToken, `${NAME_PREFIX} Config`);

    const updated = await request(app.getHttpServer())
      .patch(url(`/${created.body.id}`))
      .set('Authorization', bearer(adminToken))
      .send({ config: { ...validConfig, grouping: ['user'] } });

    expect(updated.status).toBe(200);
    expect(updated.body.config.grouping).toEqual(['user']);
    expect(updated.body.name).toBe(`${NAME_PREFIX} Config`);
  });

  it('rejects a rename onto an existing name', async () => {
    await createPreset(adminToken, `${NAME_PREFIX} First`);
    const second = await createPreset(adminToken, `${NAME_PREFIX} Second`);

    const renamed = await request(app.getHttpServer())
      .patch(url(`/${second.body.id}`))
      .set('Authorization', bearer(adminToken))
      .send({ name: `${NAME_PREFIX} First` });

    expect(renamed.status).toBe(409);
  });

  it('rejects an empty update', async () => {
    const created = await createPreset(adminToken, `${NAME_PREFIX} Empty`);

    const updated = await request(app.getHttpServer())
      .patch(url(`/${created.body.id}`))
      .set('Authorization', bearer(adminToken))
      .send({});

    expect(updated.status).toBe(400);
  });

  it('deletes a preset', async () => {
    const created = await createPreset(adminToken, `${NAME_PREFIX} Doomed`);

    const deleted = await request(app.getHttpServer())
      .delete(url(`/${created.body.id}`))
      .set('Authorization', bearer(adminToken));

    expect(deleted.status).toBe(204);

    const list = await request(app.getHttpServer())
      .get(url())
      .set('Authorization', bearer(adminToken));

    expect(
      (list.body as { name: string }[]).map((preset) => preset.name),
    ).not.toContain(`${NAME_PREFIX} Doomed`);
  });

  it('does not expose or mutate presets from another workspace', async () => {
    const [foreign] = await db
      .insert(savedReports)
      .values({
        config: validConfig as never,
        name: `${NAME_PREFIX} Foreign`,
        workspaceId: otherWorkspaceId,
      })
      .returning({ id: savedReports.id });

    const list = await request(app.getHttpServer())
      .get(url())
      .set('Authorization', bearer(adminToken));
    expect(
      (list.body as { name: string }[]).map((preset) => preset.name),
    ).not.toContain(`${NAME_PREFIX} Foreign`);

    const updated = await request(app.getHttpServer())
      .patch(url(`/${foreign!.id}`))
      .set('Authorization', bearer(adminToken))
      .send({ name: `${NAME_PREFIX} Hijacked` });
    expect(updated.status).toBe(404);

    const deleted = await request(app.getHttpServer())
      .delete(url(`/${foreign!.id}`))
      .set('Authorization', bearer(adminToken));
    expect(deleted.status).toBe(404);
  });

  it('returns 404 for an unknown preset id', async () => {
    const missing = await request(app.getHttpServer())
      .delete(url('/00000000-0000-4000-8000-00000000dead'))
      .set('Authorization', bearer(adminToken));

    expect(missing.status).toBe(404);
  });

  it('forbids a member from reading presets', async () => {
    const list = await request(app.getHttpServer())
      .get(url())
      .set('Authorization', bearer(memberToken));

    expect(list.status).toBe(403);
  });

  it('forbids a member from writing presets', async () => {
    const created = await createPreset(memberToken, `${NAME_PREFIX} Member`);

    expect(created.status).toBe(403);
  });

  it('requires authentication', async () => {
    const list = await request(app.getHttpServer()).get(url());

    expect(list.status).toBe(401);
  });
});

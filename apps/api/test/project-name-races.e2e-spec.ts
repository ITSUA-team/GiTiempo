import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, like, sql } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import { projects } from '../src/db/schema';
import { bearer, login } from './helpers/auth';
import { getSeededAdminWorkspace } from './helpers/seeded-workspace';

const NAME_PREFIX = `Race Guard ${randomUUID().slice(0, 8)}`;

describe('Project name races (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let adminToken: string;
  let workspaceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<DrizzleDB>(DRIZZLE);

    const { workspace } = await getSeededAdminWorkspace(db);
    workspaceId = workspace.id;
    adminToken = (await login(app)).accessToken;

    await Promise.all(
      Array.from({ length: 8 }, () => db.execute(sql`select pg_sleep(0.05)`)),
    );
  });

  afterAll(async () => {
    await db.delete(projects).where(like(projects.name, `${NAME_PREFIX}%`));
    await app.close();
  });

  async function activeNamesLike(base: string): Promise<string[]> {
    const rows = await db
      .select({ name: projects.name })
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, workspaceId),
          eq(projects.isActive, true),
          like(projects.name, `${base}%`),
        ),
      );

    return rows.map((row) => row.name).sort();
  }

  it('gives concurrent unarchives of identically named projects distinct names', async () => {
    const name = `${NAME_PREFIX} Unarchive`;
    const archived = await db
      .insert(projects)
      .values([
        { workspaceId, name, isActive: false },
        { workspaceId, name, isActive: false },
      ])
      .returning({ id: projects.id });

    const responses = await Promise.all(
      archived.map((row) =>
        request(app.getHttpServer())
          .patch(`/projects/${row.id}`)
          .set('Authorization', bearer(adminToken))
          .send({ isActive: true }),
      ),
    );

    expect(responses.map((res) => res.status)).toEqual([200, 200]);

    const active = await activeNamesLike(name);
    expect(active).toHaveLength(2);
    expect(new Set(active.map((value) => value.toLowerCase())).size).toBe(2);
  });

  it('lets only one of two concurrent creates take the same name', async () => {
    const name = `${NAME_PREFIX} Create`;

    const responses = await Promise.all([
      request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', bearer(adminToken))
        .send({ name }),
      request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', bearer(adminToken))
        .send({ name }),
    ]);

    expect(responses.map((res) => res.status).sort()).toEqual([201, 409]);
    expect(await activeNamesLike(name)).toEqual([name]);
  });

  it('lets only one of two concurrent renames onto the same name win', async () => {
    const target = `${NAME_PREFIX} Rename Target`;
    const contenders = await db
      .insert(projects)
      .values([
        { workspaceId, name: `${NAME_PREFIX} Rename A`, isActive: true },
        { workspaceId, name: `${NAME_PREFIX} Rename B`, isActive: true },
      ])
      .returning({ id: projects.id });

    const responses = await Promise.all(
      contenders.map((row) =>
        request(app.getHttpServer())
          .patch(`/projects/${row.id}`)
          .set('Authorization', bearer(adminToken))
          .send({ name: target }),
      ),
    );

    expect(responses.map((res) => res.status).sort()).toEqual([200, 409]);
    expect(await activeNamesLike(target)).toEqual([target]);
  });
});

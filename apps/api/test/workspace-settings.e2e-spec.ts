import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import { workspaceSettings, workspaces } from '../src/db/schema';
import { bearer, login } from './helpers/auth';

describe('Workspace settings (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<DrizzleDB>(DRIZZLE);

    const tokens = await login(app);
    adminToken = tokens.accessToken;

    const [workspace] = await db.select().from(workspaces).limit(1);
    if (!workspace) throw new Error('Expected seeded workspace');
    await db
      .update(workspaceSettings)
      .set({ currency: 'USD', defaultHourlyRate: 100 })
      .where(eq(workspaceSettings.workspaceId, workspace.id));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /workspace', () => {
    it('returns current workspace with correct shape', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace')
        .set('Authorization', bearer(adminToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('updatedAt');
      expect(typeof res.body.id).toBe('string');
      expect(typeof res.body.name).toBe('string');
    });
  });

  describe('GET /workspace/settings', () => {
    it('returns settings with seed defaults', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspace/settings')
        .set('Authorization', bearer(adminToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('workspaceId');
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('updatedAt');
      expect(res.body.currency).toBe('USD');
      expect(res.body.defaultHourlyRate).toBe(100);
    });
  });

  describe('PATCH /workspace/settings', () => {
    it('updates currency', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workspace/settings')
        .set('Authorization', bearer(adminToken))
        .send({ currency: 'EUR' });

      expect(res.status).toBe(200);
      expect(res.body.currency).toBe('EUR');

      const verify = await request(app.getHttpServer())
        .get('/workspace/settings')
        .set('Authorization', bearer(adminToken));
      expect(verify.body.currency).toBe('EUR');

      const [ws] = await db.select().from(workspaces).limit(1);
      const [row] = await db
        .select()
        .from(workspaceSettings)
        .where(eq(workspaceSettings.workspaceId, ws.id));
      expect(row?.currency).toBe('EUR');
    });

    it('updates defaultHourlyRate', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workspace/settings')
        .set('Authorization', bearer(adminToken))
        .send({ defaultHourlyRate: 150 });

      expect(res.status).toBe(200);
      expect(res.body.defaultHourlyRate).toBe(150);

      const verify = await request(app.getHttpServer())
        .get('/workspace/settings')
        .set('Authorization', bearer(adminToken));
      expect(verify.body.defaultHourlyRate).toBe(150);
    });

    it('sets defaultHourlyRate to null', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workspace/settings')
        .set('Authorization', bearer(adminToken))
        .send({ defaultHourlyRate: null });

      expect(res.status).toBe(200);
      expect(res.body.defaultHourlyRate).toBeNull();

      const verify = await request(app.getHttpServer())
        .get('/workspace/settings')
        .set('Authorization', bearer(adminToken));
      expect(verify.body.defaultHourlyRate).toBeNull();
    });

    it('returns 400 for empty body', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workspace/settings')
        .set('Authorization', bearer(adminToken))
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid currency format', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workspace/settings')
        .set('Authorization', bearer(adminToken))
        .send({ currency: 'usd' });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /workspace', () => {
    it('updates workspace name', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workspace')
        .set('Authorization', bearer(adminToken))
        .send({ name: 'Updated Workspace' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Workspace');

      const verify = await request(app.getHttpServer())
        .get('/workspace')
        .set('Authorization', bearer(adminToken));
      expect(verify.body.name).toBe('Updated Workspace');

      const [row] = await db.select().from(workspaces).limit(1);
      expect(row?.name).toBe('Updated Workspace');
    });

    it('returns 400 for empty body', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workspace')
        .set('Authorization', bearer(adminToken))
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 400 for name exceeding max length', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workspace')
        .set('Authorization', bearer(adminToken))
        .send({ name: 'x'.repeat(256) });

      expect(res.status).toBe(400);
    });
  });
});

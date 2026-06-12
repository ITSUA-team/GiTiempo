import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import { users } from '../src/db/schema';

/**
 * Proves the per-route throttle on `POST /auth/login` trips at 10/min
 * BEFORE the Firebase verification runs. We send intentionally invalid
 * bodies so a successful request would return 400 (or 401 once Firebase
 * runs). Seeing 429 inside the burst confirms the throttler sits in
 * front of the pipeline.
 *
 * Pre-requisites:
 *   - pnpm --filter @gitiempo/api db:migrate
 *   - pnpm --filter @gitiempo/api db:seed
 */
describe('Auth throttling (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<DrizzleDB>(DRIZZLE);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects rapid-fire /auth/login bursts with 429', async () => {
    const server = app.getHttpServer();

    // Fire enough requests to exceed the per-route limit (10 / 60s).
    // We send deliberately invalid bodies so a non-throttled request
    // resolves as 400 (validation) without touching Firebase.
    //
    // Sequential (not Promise.all) to avoid racy socket teardown when
    // the throttler responds 429 while supertest is still negotiating
    // keep-alive on a sibling request. The per-route throttler is
    // storage-based, not wall-clock-based, so sequential issuance is
    // still well within one throttler window.
    const statuses: number[] = [];
    for (let i = 0; i < 20; i++) {
      const res = await request(server).post('/auth/login').send({});
      statuses.push(res.status);
    }

    // Every response is either an in-limit validation failure or a throttle hit.
    for (const status of statuses) {
      expect([400, 401, 429]).toContain(status);
    }
    // At least one must be 429 — that's the whole point of per-route throttling.
    expect(statuses.some((s) => s === 429)).toBe(true);
  });

  it('rejects rapid-fire /auth/register bursts with 429 and the shared rate-limited code', async () => {
    const server = app.getHttpServer();
    const suffix =
      Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const responses: Array<{ email: string; status: number; code?: string }> =
      [];

    for (let i = 0; i < 7; i++) {
      const email = `throttle.${suffix}.${i}@example.com`;
      const res = await request(server)
        .post('/auth/register')
        .send({
          email,
          fullName: 'Owner Person',
          ownerAcknowledgement: true,
          password: 'password123',
          workspaceName: `Throttle Workspace ${suffix} ${i}`,
        });
      responses.push({ code: res.body.code, email, status: res.status });
    }

    for (const response of responses) {
      expect([201, 429]).toContain(response.status);
    }
    expect(
      responses.filter((response) => response.status === 201),
    ).toHaveLength(5);

    const throttled = responses.find((response) => response.status === 429);
    expect(throttled).toBeDefined();
    if (!throttled) {
      throw new Error('Expected the register throttle to reject one request');
    }
    expect(throttled.code).toBe('rate_limited');

    const [throttledUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, throttled.email))
      .limit(1);
    expect(throttledUser).toBeUndefined();
  });
});

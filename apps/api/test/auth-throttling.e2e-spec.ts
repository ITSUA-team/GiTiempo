import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import { users } from '../src/db/schema';

/** Verifies auth throttles trip before login or registration can complete. */
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

    // Send invalid requests sequentially so 400/401 stay distinguishable from
    // 429 without supertest socket races.
    const statuses: number[] = [];
    for (let i = 0; i < 20; i++) {
      const res = await request(server).post('/auth/login').send({});
      statuses.push(res.status);
    }

    for (const status of statuses) {
      expect([400, 401, 429]).toContain(status);
    }
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

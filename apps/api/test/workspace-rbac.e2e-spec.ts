import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import { invites, workspaceMembers, workspaces } from '../src/db/schema';
import { bearer, login } from './helpers/auth';

describe('Workspace RBAC (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let memberToken: string;
  let memberRowId: string;
  let inviteId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<DrizzleDB>(DRIZZLE);

    const [workspace] = await db.select().from(workspaces).limit(1);
    if (!workspace) throw new Error('Expected seeded workspace');

    await login(app);

    const memberTokens = await login(
      app,
      'test:seed-user-2:bob@gitiempo.dev:Bob',
    );
    memberToken = memberTokens.accessToken;

    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspace.id))
      .limit(1);
    if (!member) throw new Error('Expected seeded member');
    memberRowId = member.id;

    const [pendingInvite] = await db
      .select()
      .from(invites)
      .where(eq(invites.workspaceId, workspace.id))
      .limit(1);
    if (!pendingInvite) {
      const [created] = await db
        .insert(invites)
        .values({
          workspaceId: workspace.id,
          email: 'rbac-invite@example.com',
          token: 'rbac-test-token',
          invitedBy: member.userId,
          role: 'member',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
        .returning();
      inviteId = created!.id;
    } else {
      inviteId = pendingInvite.id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  function sendAs(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: () => string,
    token: () => string | null,
    body?: Record<string, unknown>,
  ) {
    return async () => {
      const accessToken = token();
      const req = request(app.getHttpServer())[method](path());
      if (accessToken) req.set('Authorization', bearer(accessToken));
      if (body !== undefined) req.send(body);
      return expect((await req).status).toBe(accessToken ? 403 : 401);
    };
  }

  describe('PATCH /workspace', () => {
    it(
      'returns 403 for member token',
      sendAs(
        'patch',
        () => '/workspace',
        () => memberToken,
        { name: 'x' },
      ),
    );
    it(
      'returns 401 without token',
      sendAs(
        'patch',
        () => '/workspace',
        () => null,
        { name: 'x' },
      ),
    );
  });

  describe('GET /workspace/settings', () => {
    it(
      'returns 403 for member token',
      sendAs(
        'get',
        () => '/workspace/settings',
        () => memberToken,
      ),
    );
    it(
      'returns 401 without token',
      sendAs(
        'get',
        () => '/workspace/settings',
        () => null,
      ),
    );
  });

  describe('PATCH /workspace/settings', () => {
    it(
      'returns 403 for member token',
      sendAs(
        'patch',
        () => '/workspace/settings',
        () => memberToken,
        {
          currency: 'EUR',
        },
      ),
    );
    it(
      'returns 401 without token',
      sendAs(
        'patch',
        () => '/workspace/settings',
        () => null,
        {
          currency: 'EUR',
        },
      ),
    );
  });

  describe('GET /members', () => {
    it(
      'returns 403 for member token',
      sendAs(
        'get',
        () => '/members',
        () => memberToken,
      ),
    );
    it(
      'returns 401 without token',
      sendAs(
        'get',
        () => '/members',
        () => null,
      ),
    );
  });

  describe('PATCH /members/:id/role', () => {
    it(
      'returns 403 for member token',
      sendAs(
        'patch',
        () => `/members/${memberRowId}/role`,
        () => memberToken,
        {
          role: 'admin',
        },
      ),
    );
    it(
      'returns 401 without token',
      sendAs(
        'patch',
        () => `/members/${memberRowId}/role`,
        () => null,
        {
          role: 'admin',
        },
      ),
    );
  });

  describe('DELETE /members/:id', () => {
    it(
      'returns 403 for member token',
      sendAs(
        'delete',
        () => `/members/${memberRowId}`,
        () => memberToken,
      ),
    );
    it(
      'returns 401 without token',
      sendAs(
        'delete',
        () => `/members/${memberRowId}`,
        () => null,
      ),
    );
  });

  describe('GET /invites', () => {
    it(
      'returns 403 for member token',
      sendAs(
        'get',
        () => '/invites',
        () => memberToken,
      ),
    );
    it(
      'returns 401 without token',
      sendAs(
        'get',
        () => '/invites',
        () => null,
      ),
    );
  });

  describe('POST /invites', () => {
    it(
      'returns 403 for member token',
      sendAs(
        'post',
        () => '/invites',
        () => memberToken,
        {
          email: 'nope@example.com',
          role: 'member',
        },
      ),
    );
    it(
      'returns 401 without token',
      sendAs(
        'post',
        () => '/invites',
        () => null,
        {
          email: 'nope@example.com',
          role: 'member',
        },
      ),
    );
  });

  describe('DELETE /invites/:id', () => {
    it(
      'returns 403 for member token',
      sendAs(
        'delete',
        () => `/invites/${inviteId}`,
        () => memberToken,
      ),
    );
    it(
      'returns 401 without token',
      sendAs(
        'delete',
        () => `/invites/${inviteId}`,
        () => null,
      ),
    );
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import { invites, users, workspaceMembers, workspaces } from '../src/db/schema';
import { bearer, login } from './helpers/auth';

describe('Workspace RBAC (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let memberToken: string;
  let workspaceId: string;
  let adminUserId: string;
  let memberUserId: string;
  let memberRowId: string;
  let inviteId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<DrizzleDB>(DRIZZLE);

    const suffix = randomUUID();
    const adminUid = `rbac-admin-${suffix}`;
    const adminEmail = `${adminUid}@example.com`;
    const memberUid = `rbac-member-${suffix}`;
    const memberEmail = `${memberUid}@example.com`;

    const [workspace] = await db
      .insert(workspaces)
      .values({ name: `Workspace RBAC ${suffix}` })
      .returning();
    if (!workspace) throw new Error('Failed to create test workspace');
    workspaceId = workspace.id;

    const [adminUser] = await db
      .insert(users)
      .values({
        firebaseUid: adminUid,
        email: adminEmail,
        displayName: 'RBAC Admin',
        avatarUrl: null,
      })
      .returning();
    if (!adminUser) throw new Error('Failed to create test admin');
    adminUserId = adminUser.id;

    const [memberUser] = await db
      .insert(users)
      .values({
        firebaseUid: memberUid,
        email: memberEmail,
        displayName: 'RBAC Member',
        avatarUrl: null,
      })
      .returning();
    if (!memberUser) throw new Error('Failed to create test member');
    memberUserId = memberUser.id;

    await db.insert(workspaceMembers).values({
      workspaceId,
      userId: adminUserId,
      role: 'admin',
    });

    const [member] = await db
      .insert(workspaceMembers)
      .values({
        workspaceId,
        userId: memberUserId,
        role: 'member',
      })
      .returning();
    if (!member) throw new Error('Failed to create test member membership');
    memberRowId = member.id;

    const [createdInvite] = await db
      .insert(invites)
      .values({
        workspaceId,
        email: `rbac-invite-${suffix}@example.com`,
        token: `rbac-test-token-${suffix}`,
        invitedBy: adminUserId,
        role: 'member',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning();
    if (!createdInvite) throw new Error('Failed to create test invite');
    inviteId = createdInvite.id;

    const memberTokens = await login(
      app,
      `test:${memberUid}:${memberEmail}:RBAC Member`,
    );
    memberToken = memberTokens.accessToken;
  });

  afterAll(async () => {
    if (inviteId) {
      await db.delete(invites).where(eq(invites.id, inviteId));
    }
    if (workspaceId) {
      await db
        .delete(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, workspaceId));
    }
    if (memberUserId) {
      await db.delete(users).where(eq(users.id, memberUserId));
    }
    if (adminUserId) {
      await db.delete(users).where(eq(users.id, adminUserId));
    }
    if (workspaceId) {
      await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    }
    if (app) await app.close();
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

  describe('POST /invites/:id/resend', () => {
    it(
      'returns 403 for member token',
      sendAs(
        'post',
        () => `/invites/${inviteId}/resend`,
        () => memberToken,
      ),
    );
    it(
      'returns 401 without token',
      sendAs(
        'post',
        () => `/invites/${inviteId}/resend`,
        () => null,
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

import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { and, count, eq } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { FIREBASE_ADMIN } from '../src/auth/services/firebase-admin.interface';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import { invites, users, workspaceMembers, workspaces } from '../src/db/schema';
import { InviteDeliveryService } from '../src/invites/services/invite-delivery.service';
import { bearer, login } from './helpers/auth';

async function createResendTestApp(options?: {
  deliveryError?: Error;
  firebasePasswordSetupLinkError?: Error;
  firebaseProvisioningError?: Error;
}) {
  const delivery = {
    deliver: options?.deliveryError
      ? vi.fn().mockRejectedValue(options.deliveryError)
      : vi.fn().mockResolvedValue(undefined),
  };
  const firebase = {
    verifyIdToken: vi.fn().mockResolvedValue({
      uid: 'admin-uid',
      email: 'admin@example.com',
      name: 'Admin',
      email_verified: true,
    }),
    getOrCreateInvitedUserByEmail: options?.firebaseProvisioningError
      ? vi.fn().mockRejectedValue(options.firebaseProvisioningError)
      : vi.fn().mockResolvedValue({
          uid: 'firebase-invitee',
          email: 'invitee@example.com',
          isExistingUser: false,
        }),
    generatePasswordSetupLink: options?.firebasePasswordSetupLinkError
      ? vi.fn().mockRejectedValue(options.firebasePasswordSetupLinkError)
      : vi.fn().mockResolvedValue('https://firebase.test/reset'),
  };

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(InviteDeliveryService)
    .useValue(delivery)
    .overrideProvider(FIREBASE_ADMIN)
    .useValue(firebase)
    .compile();

  const app = moduleFixture.createNestApplication();
  await app.init();

  const db = app.get<DrizzleDB>(DRIZZLE);
  const tokens = await login(app);
  const [workspace] = await db.select().from(workspaces).limit(1);
  const [admin] = await db.select().from(users).limit(1);

  if (!workspace) throw new Error('Expected seeded workspace');
  if (!admin) throw new Error('Expected seeded admin user');

  return {
    app,
    db,
    adminToken: tokens.accessToken,
    adminUserId: admin.id,
    delivery,
    firebase,
    workspace: {
      id: workspace.id,
      name: workspace.name,
    },
  };
}

describe('Invite negative paths (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let adminToken: string;
  let adminUserId: string;
  let workspaceId: string;

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
    workspaceId = workspace.id;

    const [admin] = await db.select().from(users).limit(1);
    if (!admin) throw new Error('Expected seeded admin user');
    adminUserId = admin.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  async function memberCount(): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));
    return row?.value ?? 0;
  }

  function insertInvite(
    email: string,
    overrides?: Partial<typeof invites.$inferInsert>,
  ) {
    return db
      .insert(invites)
      .values({
        workspaceId,
        email,
        token: `token-${randomUUID()}`,
        invitedBy: adminUserId,
        role: 'member',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ...overrides,
      })
      .returning();
  }

  describe('POST /invites — duplicate pending', () => {
    const dupEmail = `dup-${randomUUID()}@example.com`;

    it('creates first invite via DB and detects duplicate via API → 409', async () => {
      const [row] = await insertInvite(dupEmail);
      expect(row).toBeDefined();

      const res = await request(app.getHttpServer())
        .post('/invites')
        .set('Authorization', bearer(adminToken))
        .send({ email: dupEmail, role: 'member' });
      expect(res.status).toBe(409);
    });
  });

  describe('POST /invites — validation', () => {
    it('rejects invalid email → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/invites')
        .set('Authorization', bearer(adminToken))
        .send({ email: 'not-an-email', role: 'member' });
      expect(res.status).toBe(400);
    });

    it('rejects invalid role → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/invites')
        .set('Authorization', bearer(adminToken))
        .send({ email: 'valid@example.com', role: 'superadmin' });
      expect(res.status).toBe(400);
    });

    it('rejects extra fields → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/invites')
        .set('Authorization', bearer(adminToken))
        .send({ email: 'valid@example.com', role: 'member', extra: true });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /invites/:id', () => {
    it('rejects non-existent invite → 404', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/invites/${randomUUID()}`)
        .set('Authorization', bearer(adminToken));
      expect(res.status).toBe(404);
    });

    it('rejects non-pending invite → 404', async () => {
      const email = `accepted-${randomUUID()}@example.com`;
      const [row] = await insertInvite(email, { status: 'accepted' });

      const res = await request(app.getHttpServer())
        .delete(`/invites/${row!.id}`)
        .set('Authorization', bearer(adminToken));
      expect(res.status).toBe(404);
    });
  });

  describe('POST /invites/:id/resend', () => {
    it('resends an existing pending invite without changing identity or creating membership', async () => {
      const resendApp = await createResendTestApp();

      try {
        const [row] = await resendApp.db
          .insert(invites)
          .values({
            workspaceId: resendApp.workspace.id,
            email: `resend-success-${randomUUID()}@example.com`,
            token: `token-${randomUUID()}`,
            invitedBy: resendApp.adminUserId,
            role: 'member',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          })
          .returning();
        const [before] = await resendApp.db
          .select({ value: count() })
          .from(workspaceMembers)
          .where(eq(workspaceMembers.workspaceId, resendApp.workspace.id));

        const res = await request(resendApp.app.getHttpServer())
          .post(`/invites/${row!.id}/resend`)
          .set('Authorization', bearer(resendApp.adminToken));

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
          id: row!.id,
          workspaceId: resendApp.workspace.id,
          email: row!.email,
          invitedBy: resendApp.adminUserId,
          role: row!.role,
          status: 'pending',
          expiresAt: row!.expiresAt.toISOString(),
          createdAt: row!.createdAt.toISOString(),
        });
        expect(res.body).not.toHaveProperty('token');

        const [persistedInvite] = await resendApp.db
          .select()
          .from(invites)
          .where(eq(invites.id, row!.id))
          .limit(1);
        const [after] = await resendApp.db
          .select({ value: count() })
          .from(workspaceMembers)
          .where(eq(workspaceMembers.workspaceId, resendApp.workspace.id));

        expect(resendApp.firebase.getOrCreateInvitedUserByEmail).toHaveBeenCalledWith(
          row!.email,
        );
        expect(
          resendApp.firebase.generatePasswordSetupLink,
        ).toHaveBeenCalledWith(
          row!.email,
          `http://localhost:5173/invites/accept?token=${row!.token}`,
        );
        expect(resendApp.delivery.deliver).toHaveBeenCalledWith(
          expect.objectContaining({
            email: row!.email,
            inviteUrl: `http://localhost:5173/invites/accept?token=${row!.token}`,
            passwordSetupUrl: 'https://firebase.test/reset',
            workspaceName: resendApp.workspace.name,
          }),
        );
        expect(after?.value ?? 0).toBe(before?.value ?? 0);
        expect(persistedInvite).toMatchObject({
          id: row!.id,
          token: row!.token,
          status: 'pending',
        });
        expect(persistedInvite?.expiresAt.toISOString()).toBe(
          row!.expiresAt.toISOString(),
        );
      } finally {
        await resendApp.app.close();
      }
    });

    it('rejects non-existent invite → 404', async () => {
      const before = await memberCount();

      const res = await request(app.getHttpServer())
        .post(`/invites/${randomUUID()}/resend`)
        .set('Authorization', bearer(adminToken));

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Pending invite not found');
      expect(await memberCount()).toBe(before);
    });

    it('rejects accepted invite → 404', async () => {
      const email = `accepted-resend-${randomUUID()}@example.com`;
      const [row] = await insertInvite(email, { status: 'accepted' });
      const before = await memberCount();

      const res = await request(app.getHttpServer())
        .post(`/invites/${row!.id}/resend`)
        .set('Authorization', bearer(adminToken));

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Pending invite not found');
      expect(await memberCount()).toBe(before);
    });

    it('rejects cross-workspace invite → 404', async () => {
      const [otherWorkspace] = await db
        .insert(workspaces)
        .values({ name: `Other Workspace ${randomUUID()}` })
        .returning();
      if (!otherWorkspace) throw new Error('Expected other workspace');

      const [row] = await db
        .insert(invites)
        .values({
          workspaceId: otherWorkspace.id,
          email: `cross-${randomUUID()}@example.com`,
          token: `token-${randomUUID()}`,
          invitedBy: adminUserId,
          role: 'member',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
        .returning();
      const before = await memberCount();

      const res = await request(app.getHttpServer())
        .post(`/invites/${row!.id}/resend`)
        .set('Authorization', bearer(adminToken));

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Pending invite not found');
      expect(await memberCount()).toBe(before);
    });

    it('rejects expired pending invite → 410', async () => {
      const [row] = await insertInvite(
        `expired-resend-${randomUUID()}@example.com`,
        {
          expiresAt: new Date('2020-01-01T00:00:00Z'),
        },
      );
      const before = await memberCount();

      const res = await request(app.getHttpServer())
        .post(`/invites/${row!.id}/resend`)
        .set('Authorization', bearer(adminToken));

      expect(res.status).toBe(410);
      expect(res.body.message).toBe('Invite has expired');
      expect(await memberCount()).toBe(before);
    });

    it('keeps membership count unchanged when resend delivery fails', async () => {
      const resendApp = await createResendTestApp({
        deliveryError: new Error('SMTP failed'),
      });

      try {
        async function deliveryMemberCount(): Promise<number> {
          const [countRow] = await resendApp.db
            .select({ value: count() })
            .from(workspaceMembers)
            .where(eq(workspaceMembers.workspaceId, resendApp.workspace.id));
          return countRow?.value ?? 0;
        }

        const [row] = await resendApp.db
          .insert(invites)
          .values({
            workspaceId: resendApp.workspace.id,
            email: `delivery-failure-resend-${randomUUID()}@example.com`,
            token: `token-${randomUUID()}`,
            invitedBy: resendApp.adminUserId,
            role: 'member',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          })
          .returning();
        const before = await deliveryMemberCount();

        const res = await request(resendApp.app.getHttpServer())
          .post(`/invites/${row!.id}/resend`)
          .set('Authorization', bearer(resendApp.adminToken));

        expect(res.status).toBe(503);
        expect(res.body.message).toBe('SMTP failed');

        const [persistedInvite] = await resendApp.db
          .select()
          .from(invites)
          .where(eq(invites.id, row!.id))
          .limit(1);

        expect(await deliveryMemberCount()).toBe(before);
        expect(persistedInvite).toBeDefined();
        expect(persistedInvite).toMatchObject({
          id: row!.id,
          workspaceId: resendApp.workspace.id,
          token: row!.token,
          role: row!.role,
          status: 'pending',
        });
        expect(persistedInvite?.expiresAt.toISOString()).toBe(
          row!.expiresAt.toISOString(),
        );
      } finally {
        await resendApp.app.close();
      }
    });
  });

  describe('POST /invites/accept', () => {
    it('rejects missing firebaseIdToken → 400', async () => {
      const [row] = await insertInvite(
        `missing-token-${randomUUID()}@example.com`,
      );

      const res = await request(app.getHttpServer())
        .post('/invites/accept')
        .send({
          token: row!.token,
        });

      expect(res.status).toBe(400);
    });

    it('rejects legacy password payload fields → 400', async () => {
      const [row] = await insertInvite(`legacy-${randomUUID()}@example.com`);

      const res = await request(app.getHttpServer())
        .post('/invites/accept')
        .send({
          token: row!.token,
          firebaseIdToken: 'test:legacy:legacy@example.com:Legacy User',
          password: 'password123',
        });

      expect(res.status).toBe(400);
    });

    it('rejects legacy browser account-creation shaped payload → 400', async () => {
      const [row] = await insertInvite(`signup-${randomUUID()}@example.com`);

      const res = await request(app.getHttpServer())
        .post('/invites/accept')
        .send({
          token: row!.token,
          firebaseIdToken: 'test:signup:signup@example.com:Signup User',
          email: 'signup@example.com',
          confirmPassword: 'password123',
        });

      expect(res.status).toBe(400);
    });

    it('rejects bad token → 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/invites/accept')
        .send({
          token: 'nonexistent-token',
          firebaseIdToken: 'test:some-uid:some@example.com:Some',
        });
      expect(res.status).toBe(404);
    });

    it('rejects expired invite → 410', async () => {
      const uid = `expired-${randomUUID()}`;
      const email = `${uid}@example.com`;
      const [row] = await insertInvite(email, {
        expiresAt: new Date('2020-01-01'),
      });

      const before = await memberCount();
      const res = await request(app.getHttpServer())
        .post('/invites/accept')
        .send({
          token: row!.token,
          firebaseIdToken: `test:${uid}:${email}:Expired User`,
        });
      expect(res.status).toBe(410);
      expect(await memberCount()).toBe(before);
    });

    it('rejects already-accepted invite → 409', async () => {
      const uid = `reaccept-${randomUUID()}`;
      const email = `${uid}@example.com`;
      const [row] = await insertInvite(email);

      const accept1 = await request(app.getHttpServer())
        .post('/invites/accept')
        .send({
          token: row!.token,
          firebaseIdToken: `test:${uid}:${email}:User`,
        });
      expect(accept1.status).toBe(204);

      const before = await memberCount();
      const accept2 = await request(app.getHttpServer())
        .post('/invites/accept')
        .send({
          token: row!.token,
          firebaseIdToken: `test:${uid}:${email}:User`,
        });
      expect(accept2.status).toBe(409);
      expect(await memberCount()).toBe(before);
    });

    it('rejects email mismatch → 403', async () => {
      const inviteEmail = `mismatch-${randomUUID()}@example.com`;
      const otherEmail = `other-${randomUUID()}@example.com`;
      const otherUid = `other-${randomUUID()}`;
      const [row] = await insertInvite(inviteEmail);

      const before = await memberCount();
      const res = await request(app.getHttpServer())
        .post('/invites/accept')
        .send({
          token: row!.token,
          firebaseIdToken: `test:${otherUid}:${otherEmail}:Other`,
        });
      expect(res.status).toBe(403);
      expect(await memberCount()).toBe(before);
    });

    it('rejects already-member user → 409', async () => {
      const [bobRow] = await db
        .select()
        .from(users)
        .where(eq(users.firebaseUid, 'seed-user-2'))
        .limit(1);
      if (!bobRow) throw new Error('Expected seeded user bob');

      const [membership] = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.userId, bobRow.id),
            eq(workspaceMembers.workspaceId, workspaceId),
          ),
        )
        .limit(1);
      if (!membership) throw new Error('Expected bob membership');

      const [row] = await insertInvite(bobRow.email);

      const before = await memberCount();
      const res = await request(app.getHttpServer())
        .post('/invites/accept')
        .send({
          token: row!.token,
          firebaseIdToken: `test:seed-user-2:${bobRow.email}:Bob`,
        });
      expect(res.status).toBe(409);
      expect(await memberCount()).toBe(before);
    });
  });
});

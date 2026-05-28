import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import { invites, users, workspaceMembers, workspaces } from '../src/db/schema';
import { bearer, login } from './helpers/auth';

describe('Workspace, members, and invites (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let adminAccessToken: string;
  let workspaceId: string;
  const createdUserEmails: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<DrizzleDB>(DRIZZLE);

    const suffix = randomUUID();
    const adminUid = `workflow-admin-${suffix}`;
    const adminEmail = `${adminUid}@example.com`;

    const [workspace] = await db
      .insert(workspaces)
      .values({ name: `Workflow Members ${suffix}` })
      .returning();
    if (!workspace) throw new Error('Failed to create test workspace');
    workspaceId = workspace.id;

    const [adminUser] = await db
      .insert(users)
      .values({
        firebaseUid: adminUid,
        email: adminEmail,
        displayName: 'Workflow Admin',
        avatarUrl: null,
      })
      .returning();
    if (!adminUser) throw new Error('Failed to create test admin');
    createdUserEmails.push(adminEmail);

    await db.insert(workspaceMembers).values({
      workspaceId,
      userId: adminUser.id,
      role: 'admin',
    });

    const tokens = await login(
      app,
      `test:${adminUid}:${adminEmail}:Workflow Admin`,
    );
    adminAccessToken = tokens.accessToken;
  });

  afterAll(async () => {
    if (workspaceId) {
      await db.delete(invites).where(eq(invites.workspaceId, workspaceId));
      await db
        .delete(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, workspaceId));
    }
    for (const email of createdUserEmails) {
      await db.delete(users).where(eq(users.email, email));
    }
    if (workspaceId) {
      await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    }
    if (app) await app.close();
  });

  it('rejects login and refresh when workspace membership is missing', async () => {
    const uid = `no-member-${randomUUID()}`;
    const email = `${uid}@example.com`;
    await db.insert(users).values({
      firebaseUid: uid,
      email,
      displayName: 'No Member',
      avatarUrl: null,
    });
    createdUserEmails.push(email);

    const loginWithoutMembership = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ firebaseIdToken: `test:${uid}:${email}:No Member` });
    expect(loginWithoutMembership.status).toBe(401);

    const memberUid = `refresh-member-${randomUUID()}`;
    const memberEmail = `${memberUid}@example.com`;
    const [memberUser] = await db
      .insert(users)
      .values({
        firebaseUid: memberUid,
        email: memberEmail,
        displayName: 'Refresh Member',
        avatarUrl: null,
      })
      .returning();
    createdUserEmails.push(memberEmail);
    await db.insert(workspaceMembers).values({
      workspaceId,
      userId: memberUser!.id,
      role: 'member',
    });

    const issued = await login(
      app,
      `test:${memberUid}:${memberEmail}:Refresh Member`,
    );
    await db
      .delete(workspaceMembers)
      .where(eq(workspaceMembers.userId, memberUser!.id));

    const refreshWithoutMembership = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: issued.refreshToken });
    expect(refreshWithoutMembership.status).toBe(401);
  });

  it('supports workspace admin, member administration, and invite lifecycle', async () => {
    const workspaceRes = await request(app.getHttpServer())
      .get('/workspace')
      .set('Authorization', bearer(adminAccessToken));
    expect(workspaceRes.status).toBe(200);
    expect(workspaceRes.body.id).toBe(workspaceId);

    const inviteUid = `invite-${randomUUID()}`;
    const inviteEmail = `${inviteUid}@example.com`;
    createdUserEmails.push(inviteEmail);
    const createInvite = await request(app.getHttpServer())
      .post('/invites')
      .set('Authorization', bearer(adminAccessToken))
      .send({ email: inviteEmail, role: 'member' });
    expect(createInvite.status).toBe(201);
    expect(createInvite.body.email).toBe(inviteEmail);
    expect(createInvite.body).not.toHaveProperty('token');

    const [inviteRow] = await db
      .select()
      .from(invites)
      .where(eq(invites.id, createInvite.body.id));
    expect(inviteRow?.token).toBeTruthy();

    const acceptInvite = await request(app.getHttpServer())
      .post('/invites/accept')
      .send({
        token: inviteRow!.token,
        firebaseIdToken: `test:${inviteUid}:${inviteEmail}:Invited User`,
      });
    expect(acceptInvite.status).toBe(204);

    const invitedSession = await login(
      app,
      `test:${inviteUid}:${inviteEmail}:Invited User`,
    );
    expect(invitedSession.accessToken).toMatch(/^eyJ/);

    const membersRes = await request(app.getHttpServer())
      .get('/members')
      .set('Authorization', bearer(adminAccessToken));
    expect(membersRes.status).toBe(200);
    const invitedMember = membersRes.body.find(
      (member: { email: string }) => member.email === inviteEmail,
    );
    expect(invitedMember?.role).toBe('member');

    const updateRole = await request(app.getHttpServer())
      .patch(`/members/${invitedMember.id}/role`)
      .set('Authorization', bearer(adminAccessToken))
      .send({ role: 'pm' });
    expect(updateRole.status).toBe(200);
    expect(updateRole.body.role).toBe('pm');

    const deleteMember = await request(app.getHttpServer())
      .delete(`/members/${invitedMember.id}`)
      .set('Authorization', bearer(adminAccessToken));
    expect(deleteMember.status).toBe(204);

    await db
      .delete(invites)
      .where(
        and(
          eq(invites.workspaceId, workspaceId),
          eq(invites.email, inviteEmail),
        ),
      );
  });
});

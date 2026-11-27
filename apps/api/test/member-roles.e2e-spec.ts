import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq, inArray } from 'drizzle-orm';
import type { WorkspaceRole } from '@gitiempo/shared';
import request from 'supertest';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { AppModule } from '../src/app.module';
import { TokenService } from '../src/auth/services/token.service';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import { users, workspaceMembers, workspaces } from '../src/db/schema';
import { bearer, login } from './helpers/auth';

describe('Workspace member roles', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let workspaceId: string;
  const workspaceIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(DRIZZLE);
  });

  async function newWorkspace() {
    const [space] = await db
      .insert(workspaces)
      .values({ name: randomUUID() })
      .returning();
    workspaceIds.push(space!.id);
    return space!.id;
  }

  beforeEach(async () => {
    workspaceId = await newWorkspace();
  });
  afterEach(async () => {
    await db
      .delete(workspaceMembers)
      .where(inArray(workspaceMembers.workspaceId, workspaceIds));
    await db.delete(users).where(inArray(users.id, userIds));
    await db.delete(workspaces).where(inArray(workspaces.id, workspaceIds));
    userIds.length = 0;
    workspaceIds.length = 0;
  });
  afterAll(async () => {
    await app.close();
  });

  async function account(role: WorkspaceRole) {
    const firebaseUid = randomUUID();
    const email = firebaseUid + '@example.com';
    const [user] = await db
      .insert(users)
      .values({ firebaseUid, email })
      .returning();
    userIds.push(user!.id);
    const [membership] = await db
      .insert(workspaceMembers)
      .values({ workspaceId, userId: user!.id, role })
      .returning();
    const session = await login(app, 'test:' + firebaseUid + ':' + email);
    return { ...session, membership: membership! };
  }

  function setRole(token: string, id: string, role: WorkspaceRole) {
    return request(app.getHttpServer())
      .patch('/members/' + id + '/role')
      .set('Authorization', bearer(token))
      .send({ role });
  }

  it.each(['pm', 'member'] as const)(
    'transfers responsibility and steps down to %s',
    async (role) => {
      const admin = await account('admin');
      const successor = await account(role);
      const [outside] = await db
        .insert(workspaceMembers)
        .values({
          workspaceId: await newWorkspace(),
          userId: admin.membership.userId,
          role: 'pm',
        })
        .returning();
      await setRole(admin.accessToken, outside!.id, 'admin').expect(404);
      await setRole(
        successor.accessToken,
        successor.membership.id,
        'admin',
      ).expect(403);
      await setRole(admin.accessToken, successor.membership.id, 'admin').expect(
        200,
      );
      await setRole(admin.accessToken, admin.membership.id, role).expect(200);
      for (const path of ['/members', '/workspace/settings']) {
        await request(app.getHttpServer())
          .get(path)
          .set('Authorization', bearer(admin.accessToken))
          .expect(403);
      }
      const refreshed = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: admin.refreshToken })
        .expect(200);
      expect(
        app.get(TokenService).verifyAccess(refreshed.body.accessToken),
      ).toMatchObject({
        sub: admin.membership.userId,
        workspaceId,
        role,
      });
      const list = await request(app.getHttpServer())
        .get('/members')
        .set('Authorization', bearer(successor.accessToken))
        .expect(200);
      expect(list.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: successor.membership.id,
            role: 'admin',
          }),
          expect.objectContaining({ id: admin.membership.id, role }),
        ]),
      );
      const [stored] = await db
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.id, outside!.id));
      expect(stored?.role).toBe('pm');
      await setRole(
        successor.accessToken,
        successor.membership.id,
        role,
      ).expect(409);
      await request(app.getHttpServer())
        .delete('/members/' + successor.membership.id)
        .set('Authorization', bearer(successor.accessToken))
        .expect(409);
    },
  );

  it.each(['demotion', 'removal'])(
    'keeps one admin during concurrent demotion and %s',
    async (otherAction) => {
      const first = await account('admin');
      const second = await account('admin');
      // Each administrator acts on their own row so both requests remain authorized
      // regardless of the order in which the transaction locks are acquired.
      const secondRequest =
        otherAction === 'removal'
          ? request(app.getHttpServer())
              .delete('/members/' + second.membership.id)
              .set('Authorization', bearer(second.accessToken))
          : setRole(second.accessToken, second.membership.id, 'member');
      const [one, two] = await Promise.all([
        setRole(first.accessToken, first.membership.id, 'pm'),
        secondRequest,
      ]);
      const expectedSecondStatus = otherAction === 'removal' ? 204 : 200;
      expect([
        [200, 409],
        [409, expectedSecondStatus],
      ]).toContainEqual([one.status, two.status]);
      const rows = await db
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, workspaceId));
      expect(
        rows.filter((row) => row.role === 'admin').map((row) => row.id),
      ).toEqual([
        one.status === 409 ? first.membership.id : second.membership.id,
      ]);
    },
  );

  it('allows demoting another admin', async () => {
    const admin = await account('admin');
    const other = await account('admin');
    const response = await setRole(
      admin.accessToken,
      other.membership.id,
      'member',
    ).expect(200);
    expect(response.body).toMatchObject({
      id: other.membership.id,
      role: 'member',
    });
  });
});

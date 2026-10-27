import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { UnauthorizedException, type INestApplication } from '@nestjs/common';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ADMIN_FAKE_TOKEN, bearer, login } from './helpers/auth';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  refreshTokens,
  invites,
  users,
  workspaceMembers,
  workspaceSettings,
  workspaces,
} from '../src/db/schema';
import { TokenService } from '../src/auth/services/token.service';
import { AuthService } from '../src/auth/services/auth.service';
import type { FakeFirebaseAdminService } from '../src/auth/services/firebase-admin.fake';
import {
  FirebaseAdminAuthError,
  FIREBASE_ADMIN,
} from '../src/auth/services/firebase-admin.interface';
import { firebaseIdentityReservations } from '../src/auth/schemas/firebase-identity-reservations.schema';
import { firebaseSubjectBindings } from '../src/auth/schemas/firebase-subject-bindings.schema';
import { getSeededAdminWorkspace } from './helpers/seeded-workspace';

let registerTrackerCounter = 1;
let authTrackerCounter = 1;

function uniqueRegisterPayload() {
  const suffix =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  return {
    email: `owner.${suffix}@example.com`,
    fullName: 'Owner Person',
    ownerAcknowledgement: true,
    password: 'password123',
    workspaceName: `Acme Studio ${suffix}`,
  };
}

function postRegister(
  app: INestApplication,
  payload: ReturnType<typeof uniqueRegisterPayload>,
) {
  return request(app.getHttpServer())
    .post('/auth/register')
    .set('X-Forwarded-For', `10.41.0.${registerTrackerCounter++}`)
    .send(payload);
}

function postAuth(app: INestApplication, path: string) {
  return request(app.getHttpServer())
    .post(path)
    .set('X-Forwarded-For', `10.42.0.${authTrackerCounter++}`);
}

function googleToken(uid: string, email: string, name = 'Google User') {
  return `test:${uid}:${email}:${name}:provider=google.com`;
}

/** End-to-end coverage for `/auth/*` using the fake Firebase provider. */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let tokens: TokenService;
  let auth: AuthService;
  let firebase: FakeFirebaseAdminService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.getHttpAdapter().getInstance().set('trust proxy', true);
    await app.init();
    db = app.get<DrizzleDB>(DRIZZLE);
    tokens = app.get(TokenService);
    auth = app.get(AuthService);
    firebase = app.get(FIREBASE_ADMIN);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('exchanges a valid fake Firebase token for a token pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', `10.42.0.${authTrackerCounter++}`)
        .send({ firebaseIdToken: ADMIN_FAKE_TOKEN });

      expect(res.status).toBe(200);
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
      expect(typeof res.body.accessTokenExpiresIn).toBe('number');
    });

    it('rejects an invalid Firebase token with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', `10.42.0.${authTrackerCounter++}`)
        .send({ firebaseIdToken: 'not-a-test-token' });

      expect(res.status).toBe(401);
    });

    it('remains membership-gated for non-social Firebase identities without a workspace member row', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', `10.42.0.${authTrackerCounter++}`)
        .send({
          firebaseIdToken: 'test:outside-uid:outside@example.com:Outside',
        });

      expect(res.status).toBe(401);
    });

    it('provisions one exact personal workspace atomically for repeated concurrent verified Google logins', async () => {
      const uid = `google-provision-${randomUUID()}`;
      const email = `${uid}@example.com`;
      const token = googleToken(uid, email, 'Google Provisioned User');
      let userId: string | undefined;
      let workspaceId: string | undefined;

      try {
        const responses = await Promise.all(
          [1, 2].map(() =>
            request(app.getHttpServer())
              .post('/auth/login')
              .set('X-Forwarded-For', `10.42.1.${authTrackerCounter++}`)
              .send({ firebaseIdToken: token }),
          ),
        );
        for (const response of responses) expect(response.status).toBe(200);

        const claims = responses.map((response) =>
          tokens.verifyAccess(response.body.accessToken as string),
        );
        expect(new Set(claims.map((claim) => claim.sub)).size).toBe(1);
        expect(new Set(claims.map((claim) => claim.workspaceId)).size).toBe(1);
        expect(claims.every((claim) => claim.role === 'admin')).toBe(true);
        userId = claims[0]!.sub;
        workspaceId = claims[0]!.workspaceId;

        const [userRow] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId));
        expect(userRow).toMatchObject({
          firebaseUid: uid,
          email,
          displayName: 'Google Provisioned User',
        });
        const memberships = await db
          .select()
          .from(workspaceMembers)
          .where(eq(workspaceMembers.userId, userId));
        expect(memberships).toHaveLength(1);
        expect(memberships[0]).toMatchObject({
          workspaceId,
          role: 'admin',
        });
        const [workspace] = await db
          .select()
          .from(workspaces)
          .where(eq(workspaces.id, workspaceId));
        expect(workspace?.name).toBe('Workspace');
        const [settings] = await db
          .select()
          .from(workspaceSettings)
          .where(eq(workspaceSettings.workspaceId, workspaceId));
        expect(settings).toMatchObject({ currency: 'USD', timeZone: 'UTC' });

        const repeated = await request(app.getHttpServer())
          .post('/auth/login')
          .set('X-Forwarded-For', `10.42.1.${authTrackerCounter++}`)
          .send({ firebaseIdToken: token });
        expect(repeated.status).toBe(200);
        expect(tokens.verifyAccess(repeated.body.accessToken).workspaceId).toBe(
          workspaceId,
        );
      } finally {
        if (userId) {
          await db
            .delete(refreshTokens)
            .where(eq(refreshTokens.userId, userId));
          await db
            .delete(workspaceMembers)
            .where(eq(workspaceMembers.userId, userId));
        }
        if (workspaceId) {
          await db
            .delete(workspaceSettings)
            .where(eq(workspaceSettings.workspaceId, workspaceId));
          await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
        }
        if (userId) await db.delete(users).where(eq(users.id, userId));
      }
    });

    it('does not provision an unverified Google identity', async () => {
      const uid = `google-unverified-${randomUUID()}`;
      const email = `${uid}@example.com`;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', `10.42.1.${authTrackerCounter++}`)
        .send({
          firebaseIdToken: `${googleToken(uid, email)}:verified=false`,
        });
      expect(res.status).toBe(401);
      expect(
        await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email)),
      ).toEqual([]);
    });

    it('does not let a verified Google identity adopt an unverified manual-registration email', async () => {
      const payload = uniqueRegisterPayload();
      const registration = await postRegister(app, payload);
      expect(registration.status).toBe(201);
      const originalClaims = tokens.verifyAccess(
        registration.body.accessToken as string,
      );
      const attackerUid = `google-preclaim-${randomUUID()}`;

      try {
        const socialLogin = await request(app.getHttpServer())
          .post('/auth/login')
          .set('X-Forwarded-For', `10.42.1.${authTrackerCounter++}`)
          .send({
            firebaseIdToken: googleToken(
              attackerUid,
              payload.email,
              'Google Preclaim Attempt',
            ),
          });

        expect(socialLogin.status).toBe(401);
        expect(socialLogin.body.code).toBe('identity_proof_required');
        const [originalUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, originalClaims.sub));
        expect(originalUser).toMatchObject({
          firebaseUid: originalClaims.firebaseUid,
          email: payload.email,
        });
        expect(
          await db
            .select({ userId: firebaseSubjectBindings.userId })
            .from(firebaseSubjectBindings)
            .where(eq(firebaseSubjectBindings.firebaseUid, attackerUid)),
        ).toEqual([]);
        expect(
          await db
            .select({ id: workspaceMembers.id })
            .from(workspaceMembers)
            .where(eq(workspaceMembers.userId, originalClaims.sub)),
        ).toHaveLength(1);
      } finally {
        await db
          .delete(refreshTokens)
          .where(eq(refreshTokens.userId, originalClaims.sub));
        await db
          .delete(workspaceMembers)
          .where(eq(workspaceMembers.userId, originalClaims.sub));
        await db
          .delete(workspaceSettings)
          .where(eq(workspaceSettings.workspaceId, originalClaims.workspaceId));
        await db
          .delete(workspaces)
          .where(eq(workspaces.id, originalClaims.workspaceId));
        await db.delete(users).where(eq(users.id, originalClaims.sub));
        await db
          .delete(firebaseIdentityReservations)
          .where(
            eq(firebaseIdentityReservations.normalizedEmail, payload.email),
          );
      }
    });

    it('binds a verified Google alias to its existing canonical account without replacing its UID or workspace', async () => {
      const canonicalUid = `canonical-${randomUUID()}`;
      const aliasUid = `google-alias-${randomUUID()}`;
      const email = `${canonicalUid}@example.com`;
      const canonicalLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', `10.42.1.${authTrackerCounter++}`)
        .send({
          firebaseIdToken: googleToken(canonicalUid, email, 'Canonical User'),
        })
        .expect(200);
      const canonicalClaims = tokens.verifyAccess(
        canonicalLogin.body.accessToken,
      );
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, canonicalClaims.sub));
      const workspace = { id: canonicalClaims.workspaceId };
      if (!user) throw new Error('Failed to create canonical user');

      try {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .set('X-Forwarded-For', `10.42.1.${authTrackerCounter++}`)
          .send({
            firebaseIdToken: googleToken(aliasUid, email, 'Google Alias'),
          });
        expect(response.status).toBe(200);
        const claims = tokens.verifyAccess(response.body.accessToken);
        expect(claims).toMatchObject({
          sub: user.id,
          firebaseUid: canonicalUid,
          workspaceId: workspace.id,
          role: 'admin',
        });
        const [canonicalUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id));
        expect(canonicalUser?.firebaseUid).toBe(canonicalUid);
        const [aliasBinding] = await db
          .select()
          .from(firebaseSubjectBindings)
          .where(eq(firebaseSubjectBindings.firebaseUid, aliasUid));
        expect(aliasBinding).toMatchObject({
          userId: user.id,
          providerId: 'google',
          verifiedEmail: email,
        });
      } finally {
        await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id));
        await db
          .delete(workspaceMembers)
          .where(eq(workspaceMembers.userId, user.id));
        await db.delete(users).where(eq(users.id, user.id));
        await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
      }
    });

    it('rejects a Google subject whose alias and verified email belong to different accounts', async () => {
      const firstUid = `conflict-first-${randomUUID()}`;
      const aliasUid = `conflict-alias-${randomUUID()}`;
      const firstEmail = `${firstUid}@example.com`;
      const secondEmail = `${aliasUid}@example.com`;
      const [workspace] = await db
        .insert(workspaces)
        .values({ name: `Conflict workspace ${firstUid}` })
        .returning();
      const [firstUser] = await db
        .insert(users)
        .values({ firebaseUid: firstUid, email: firstEmail })
        .returning();
      const [secondUser] = await db
        .insert(users)
        .values({ firebaseUid: `canonical-${aliasUid}`, email: secondEmail })
        .returning();
      if (!workspace || !firstUser || !secondUser) {
        throw new Error('Failed to create identity-conflict fixtures');
      }

      try {
        await db.insert(workspaceMembers).values({
          workspaceId: workspace.id,
          userId: secondUser.id,
          role: 'member',
        });
        await db.insert(firebaseSubjectBindings).values({
          firebaseUid: aliasUid,
          userId: secondUser.id,
          providerId: 'google',
          verifiedEmail: secondEmail,
        });

        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .set('X-Forwarded-For', `10.42.1.${authTrackerCounter++}`)
          .send({
            firebaseIdToken: googleToken(aliasUid, firstEmail, 'Conflict'),
          });
        expect(response.status).toBe(409);
        expect(response.body.code).toBe('identity_conflict');
        expect(
          await db
            .select()
            .from(workspaceMembers)
            .where(eq(workspaceMembers.userId, firstUser.id)),
        ).toEqual([]);
      } finally {
        await db
          .delete(workspaceMembers)
          .where(eq(workspaceMembers.workspaceId, workspace.id));
        await db.delete(users).where(eq(users.id, firstUser.id));
        await db.delete(users).where(eq(users.id, secondUser.id));
        await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
      }
    });

    it('keeps a pending invite unchanged during Google provisioning and adds it only after explicit acceptance', async () => {
      const uid = `google-invite-${randomUUID()}`;
      const email = `${uid}@example.com`;
      const googleIdToken = googleToken(uid, email, 'Google Invite User');
      const adminTokens = await login(app);
      const invite = await request(app.getHttpServer())
        .post('/invites')
        .set('Authorization', bearer(adminTokens.accessToken))
        .send({ email, role: 'member' });
      expect(invite.status).toBe(201);

      let userId: string | undefined;
      let personalWorkspaceId: string | undefined;
      try {
        const personalLogin = await request(app.getHttpServer())
          .post('/auth/login')
          .set('X-Forwarded-For', `10.42.1.${authTrackerCounter++}`)
          .send({ firebaseIdToken: googleIdToken });
        expect(personalLogin.status).toBe(200);
        const personalClaims = tokens.verifyAccess(
          personalLogin.body.accessToken,
        );
        userId = personalClaims.sub;
        personalWorkspaceId = personalClaims.workspaceId;

        const [pendingInvite] = await db
          .select()
          .from(invites)
          .where(eq(invites.id, invite.body.id));
        expect(pendingInvite?.status).toBe('pending');
        const invitedMemberships = await db
          .select()
          .from(workspaceMembers)
          .where(eq(workspaceMembers.userId, userId));
        expect(invitedMemberships).toHaveLength(1);
        expect(invitedMemberships[0]?.workspaceId).toBe(personalWorkspaceId);

        const accepted = await request(app.getHttpServer())
          .post('/invites/accept')
          .send({
            token: pendingInvite!.token,
            firebaseIdToken: googleIdToken,
          });
        expect(accepted.status).toBe(204);
        const membershipsAfterAccept = await db
          .select()
          .from(workspaceMembers)
          .where(eq(workspaceMembers.userId, userId));
        expect(membershipsAfterAccept).toHaveLength(2);
      } finally {
        await db.delete(invites).where(eq(invites.id, invite.body.id));
        if (userId) {
          await db
            .delete(refreshTokens)
            .where(eq(refreshTokens.userId, userId));
          await db
            .delete(workspaceMembers)
            .where(eq(workspaceMembers.userId, userId));
        }
        if (personalWorkspaceId) {
          await db
            .delete(workspaceSettings)
            .where(eq(workspaceSettings.workspaceId, personalWorkspaceId));
          await db
            .delete(workspaces)
            .where(eq(workspaces.id, personalWorkspaceId));
        }
        await db
          .delete(firebaseIdentityReservations)
          .where(eq(firebaseIdentityReservations.normalizedEmail, email));
        if (userId) await db.delete(users).where(eq(users.id, userId));
      }
    });

    it('keeps a pending invite pending when a legacy Firebase identity has no application creation proof', async () => {
      const email = `legacy-unbound-invite-${randomUUID()}@example.test`;
      const firebaseUid = `legacy-unbound-${randomUUID()}`;
      const { admin, workspace } = await getSeededAdminWorkspace(db);
      const [invite] = await db
        .insert(invites)
        .values({
          workspaceId: workspace.id,
          email,
          token: randomUUID(),
          invitedBy: admin.id,
          role: 'member',
          expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
        })
        .returning();
      if (!invite) throw new Error('Expected legacy invite fixture');

      await firebase.createEmailPasswordUser({
        uid: firebaseUid,
        email,
        password: 'password123',
        displayName: 'Legacy Firebase Identity',
      });
      expect(await firebase.getUserByUid(firebaseUid)).toMatchObject({
        uid: firebaseUid,
        email,
        emailVerified: false,
        disabled: false,
      });
      const foundationCounts = () =>
        Promise.all([
          db.select({ count: sql<number>`count(*)` }).from(users),
          db.select({ count: sql<number>`count(*)` }).from(workspaces),
          db.select({ count: sql<number>`count(*)` }).from(workspaceMembers),
          db.select({ count: sql<number>`count(*)` }).from(refreshTokens),
          db
            .select({ count: sql<number>`count(*)` })
            .from(firebaseSubjectBindings),
        ]);
      const countsBefore = await foundationCounts();
      const createUnclaimedUser = vi
        .spyOn(firebase, 'createUnclaimedUser')
        .mockRejectedValueOnce(
          new FirebaseAdminAuthError(
            'auth/email-already-exists',
            'Legacy Firebase identity already owns this email',
          ),
        );

      try {
        let rejection: unknown;
        try {
          await auth.provisionSocialSession({
            provider: 'github',
            email,
            verifiedEmails: [email],
            name: 'Legacy GitHub Identity',
          });
        } catch (error) {
          rejection = error;
        }

        expect(rejection).toBeInstanceOf(UnauthorizedException);
        expect(
          (rejection as UnauthorizedException).getResponse(),
        ).toMatchObject({
          code: 'identity_proof_required',
        });
        expect(
          await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, email)),
        ).toEqual([]);
        expect(
          await db
            .select({ id: firebaseSubjectBindings.id })
            .from(firebaseSubjectBindings)
            .where(eq(firebaseSubjectBindings.verifiedEmail, email)),
        ).toEqual([]);
        expect(
          await db
            .select({ status: invites.status })
            .from(invites)
            .where(eq(invites.id, invite.id)),
        ).toEqual([{ status: 'pending' }]);
        expect(
          await db
            .select({
              firebaseUid: firebaseIdentityReservations.firebaseUid,
              purpose: firebaseIdentityReservations.purpose,
              state: firebaseIdentityReservations.state,
              userId: firebaseIdentityReservations.userId,
            })
            .from(firebaseIdentityReservations)
            .where(eq(firebaseIdentityReservations.normalizedEmail, email)),
        ).toEqual([
          expect.objectContaining({
            purpose: 'github-signin',
            state: 'reserved',
            userId: null,
          }),
        ]);
        const [reservation] = await db
          .select({ firebaseUid: firebaseIdentityReservations.firebaseUid })
          .from(firebaseIdentityReservations)
          .where(eq(firebaseIdentityReservations.normalizedEmail, email));
        expect(reservation?.firebaseUid).not.toBe(firebaseUid);
        expect(await firebase.getUserByUid(firebaseUid)).toMatchObject({
          uid: firebaseUid,
          email,
          emailVerified: false,
          disabled: false,
        });
        expect(await foundationCounts()).toEqual(countsBefore);
      } finally {
        createUnclaimedUser.mockRestore();
        await db.delete(invites).where(eq(invites.id, invite.id));
        await db
          .delete(firebaseIdentityReservations)
          .where(eq(firebaseIdentityReservations.normalizedEmail, email));
        await firebase.deleteUser(firebaseUid);
        expect(
          await db
            .select({ id: invites.id })
            .from(invites)
            .where(eq(invites.id, invite.id)),
        ).toEqual([]);
        expect(
          await db
            .select({ id: firebaseIdentityReservations.id })
            .from(firebaseIdentityReservations)
            .where(eq(firebaseIdentityReservations.normalizedEmail, email)),
        ).toEqual([]);
        expect(await firebase.getUserByUid(firebaseUid)).toBeNull();
      }
    });

    it('does not create a personal workspace when invite acceptance establishes the first membership before Google login', async () => {
      const uid = `google-invite-first-${randomUUID()}`;
      const email = `${uid}@example.com`;
      const googleIdToken = googleToken(uid, email, 'Google Invite First');
      const adminTokens = await login(app);
      const invite = await request(app.getHttpServer())
        .post('/invites')
        .set('Authorization', bearer(adminTokens.accessToken))
        .send({ email, role: 'member' });
      expect(invite.status).toBe(201);

      let userId: string | undefined;
      try {
        const [pendingInvite] = await db
          .select()
          .from(invites)
          .where(eq(invites.id, invite.body.id));
        expect(pendingInvite?.status).toBe('pending');

        const accepted = await request(app.getHttpServer())
          .post('/invites/accept')
          .send({
            token: pendingInvite!.token,
            firebaseIdToken: googleIdToken,
          });
        expect(accepted.status).toBe(204);

        const loginAfterAccept = await request(app.getHttpServer())
          .post('/auth/login')
          .set('X-Forwarded-For', `10.42.2.${authTrackerCounter++}`)
          .send({ firebaseIdToken: googleIdToken });
        expect(loginAfterAccept.status).toBe(200);
        const claims = tokens.verifyAccess(loginAfterAccept.body.accessToken);
        userId = claims.sub;
        expect(claims.workspaceId).toBe(pendingInvite!.workspaceId);

        const memberships = await db
          .select()
          .from(workspaceMembers)
          .where(eq(workspaceMembers.userId, userId));
        expect(memberships).toEqual([
          expect.objectContaining({ workspaceId: pendingInvite!.workspaceId }),
        ]);
        const [acceptedInvite] = await db
          .select()
          .from(invites)
          .where(eq(invites.id, invite.body.id));
        expect(acceptedInvite?.status).toBe('accepted');
      } finally {
        await db.delete(invites).where(eq(invites.id, invite.body.id));
        if (userId) {
          await db
            .delete(refreshTokens)
            .where(eq(refreshTokens.userId, userId));
          await db
            .delete(workspaceMembers)
            .where(eq(workspaceMembers.userId, userId));
          await db.delete(users).where(eq(users.id, userId));
        }
        await db
          .delete(firebaseIdentityReservations)
          .where(eq(firebaseIdentityReservations.normalizedEmail, email));
      }
    });

    it('preserves the invited membership when invite acceptance and Google provisioning race', async () => {
      const uid = `google-invite-race-${randomUUID()}`;
      const email = `${uid}@example.com`;
      const googleIdToken = googleToken(uid, email, 'Google Invite Race');
      const adminTokens = await login(app);
      const invite = await request(app.getHttpServer())
        .post('/invites')
        .set('Authorization', bearer(adminTokens.accessToken))
        .send({ email, role: 'member' });
      expect(invite.status).toBe(201);

      let userId: string | undefined;
      let personalWorkspaceId: string | undefined;
      try {
        const [pendingInvite] = await db
          .select()
          .from(invites)
          .where(eq(invites.id, invite.body.id));
        if (!pendingInvite) throw new Error('Expected pending invite fixture');

        const [acceptance, socialLogin] = await Promise.all([
          request(app.getHttpServer()).post('/invites/accept').send({
            token: pendingInvite.token,
            firebaseIdToken: googleIdToken,
          }),
          request(app.getHttpServer())
            .post('/auth/login')
            .set('X-Forwarded-For', `10.42.3.${authTrackerCounter++}`)
            .send({ firebaseIdToken: googleIdToken }),
        ]);
        expect(acceptance.status).toBe(204);
        expect(socialLogin.status).toBe(200);
        userId = tokens.verifyAccess(socialLogin.body.accessToken).sub;

        const [acceptedInvite] = await db
          .select()
          .from(invites)
          .where(eq(invites.id, invite.body.id));
        expect(acceptedInvite?.status).toBe('accepted');
        const memberships = await db
          .select()
          .from(workspaceMembers)
          .where(eq(workspaceMembers.userId, userId));
        expect(memberships).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ workspaceId: pendingInvite.workspaceId }),
          ]),
        );
        expect([1, 2]).toContain(memberships.length);
        personalWorkspaceId = memberships
          .filter(
            (membership) =>
              membership.workspaceId !== pendingInvite.workspaceId,
          )
          .at(0)?.workspaceId;
      } finally {
        await db.delete(invites).where(eq(invites.id, invite.body.id));
        if (userId) {
          await db
            .delete(refreshTokens)
            .where(eq(refreshTokens.userId, userId));
          await db
            .delete(workspaceMembers)
            .where(eq(workspaceMembers.userId, userId));
        }
        if (personalWorkspaceId) {
          await db
            .delete(workspaceSettings)
            .where(eq(workspaceSettings.workspaceId, personalWorkspaceId));
          await db
            .delete(workspaces)
            .where(eq(workspaces.id, personalWorkspaceId));
        }
        await db
          .delete(firebaseIdentityReservations)
          .where(eq(firebaseIdentityReservations.normalizedEmail, email));
        if (userId) await db.delete(users).where(eq(users.id, userId));
      }
    });

    it('rejects a social token observed before a failed registration deletes its Firebase UID without creating a foundation', async () => {
      const payload = uniqueRegisterPayload();
      const triggerName = `fail_registration_${randomUUID().replaceAll('-', '')}`;
      const functionName = `fail_registration_fn_${randomUUID().replaceAll('-', '')}`;
      const workspaceCountBefore = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(workspaces)
        .where(eq(workspaces.name, 'Workspace'));
      const originalCreate = firebase.createEmailPasswordUser.bind(firebase);
      const originalVerify = firebase.verifyIdToken.bind(firebase);
      let resolveCreatedUid!: (uid: string) => void;
      const createdUid = new Promise<string>((resolve) => {
        resolveCreatedUid = resolve;
      });
      let releaseRegistration!: () => void;
      const registrationRelease = new Promise<void>((resolve) => {
        releaseRegistration = resolve;
      });
      let resolveSocialVerified!: () => void;
      const socialVerified = new Promise<void>((resolve) => {
        resolveSocialVerified = resolve;
      });
      let releaseSocial!: () => void;
      const socialRelease = new Promise<void>((resolve) => {
        releaseSocial = resolve;
      });
      let socialToken = '';
      const createSpy = vi
        .spyOn(firebase, 'createEmailPasswordUser')
        .mockImplementation(async (input) => {
          const created = await originalCreate(input);
          resolveCreatedUid(created.uid);
          await registrationRelease;
          return created;
        });
      const verifySpy = vi
        .spyOn(firebase, 'verifyIdToken')
        .mockImplementation(async (idToken) => {
          const decoded = await originalVerify(idToken);
          if (idToken === socialToken) {
            resolveSocialVerified();
            await socialRelease;
          }
          return decoded;
        });

      try {
        await db.execute(
          sql.raw(
            `CREATE FUNCTION ${functionName}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced registration workspace failure'; END; $$`,
          ),
        );
        await db.execute(
          sql.raw(
            `CREATE TRIGGER ${triggerName} BEFORE INSERT ON workspaces FOR EACH ROW EXECUTE FUNCTION ${functionName}()`,
          ),
        );

        const registration = postRegister(app, payload).then(
          (response) => response,
        );
        const firebaseUid = await createdUid;
        socialToken = googleToken(firebaseUid, payload.email, 'Stale Google');
        const socialLogin = auth.login(socialToken);
        await socialVerified;
        releaseRegistration();

        const failedRegistration = await registration;
        expect(failedRegistration.status).toBe(503);
        releaseSocial();
        await expect(socialLogin).rejects.toMatchObject({ status: 401 });
        expect(
          await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.firebaseUid, firebaseUid)),
        ).toEqual([]);
        const workspaceCountAfter = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(workspaces)
          .where(eq(workspaces.name, 'Workspace'));
        expect(workspaceCountAfter).toEqual(workspaceCountBefore);
      } finally {
        releaseRegistration();
        releaseSocial();
        createSpy.mockRestore();
        verifySpy.mockRestore();
        await db.execute(
          sql.raw(`DROP TRIGGER IF EXISTS ${triggerName} ON workspaces`),
        );
        await db.execute(sql.raw(`DROP FUNCTION IF EXISTS ${functionName}()`));
        await db
          .delete(firebaseIdentityReservations)
          .where(
            eq(firebaseIdentityReservations.normalizedEmail, payload.email),
          );
      }
    });

    it('rolls back the complete social foundation when refresh persistence fails', async () => {
      const uid = `refresh-rollback-${randomUUID()}`;
      const email = `${uid}@example.com`;
      const [user] = await db
        .insert(users)
        .values({ firebaseUid: uid, email, displayName: 'Refresh rollback' })
        .returning();
      if (!user) throw new Error('Failed to create rollback fixture user');
      const functionName = `fail_social_refresh_${randomUUID().replaceAll('-', '')}`;
      const triggerName = `fail_social_refresh_trigger_${randomUUID().replaceAll('-', '')}`;
      const workspaceIdsBefore = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.name, 'Workspace'));

      try {
        await db.execute(
          sql.raw(`
            CREATE FUNCTION "${functionName}"() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
              IF NEW.user_id = '${user.id}'::uuid THEN
                RAISE EXCEPTION 'forced refresh persistence failure';
              END IF;
              RETURN NEW;
            END;
            $$;
          `),
        );
        await db.execute(
          sql.raw(`
            CREATE TRIGGER "${triggerName}"
            BEFORE INSERT ON refresh_tokens
            FOR EACH ROW EXECUTE FUNCTION "${functionName}"();
          `),
        );

        await expect(
          auth.provisionSocialSession({
            provider: 'github',
            userId: user.id,
            linked: true,
          }),
        ).rejects.toThrow();
        expect(
          await db
            .select()
            .from(workspaceMembers)
            .where(eq(workspaceMembers.userId, user.id)),
        ).toEqual([]);
        expect(
          await db
            .select()
            .from(refreshTokens)
            .where(eq(refreshTokens.userId, user.id)),
        ).toEqual([]);
        expect(
          await db
            .select({ id: workspaces.id })
            .from(workspaces)
            .where(eq(workspaces.name, 'Workspace')),
        ).toEqual(workspaceIdsBefore);
      } finally {
        await db.execute(
          sql.raw(`DROP TRIGGER IF EXISTS "${triggerName}" ON refresh_tokens`),
        );
        await db.execute(
          sql.raw(`DROP FUNCTION IF EXISTS "${functionName}"()`),
        );
        await db.delete(users).where(eq(users.id, user.id));
      }
    });

    it('rolls back the complete social foundation when access-token signing fails', async () => {
      const uid = `signing-rollback-${randomUUID()}`;
      const email = `${uid}@example.com`;
      const [user] = await db
        .insert(users)
        .values({ firebaseUid: uid, email, displayName: 'Signing rollback' })
        .returning();
      if (!user) throw new Error('Failed to create rollback fixture user');
      const workspaceIdsBefore = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.name, 'Workspace'));
      const signingFailure = vi
        .spyOn(tokens, 'signAccess')
        .mockImplementation(() => {
          throw new Error('forced access-token signing failure');
        });

      try {
        await expect(
          auth.provisionSocialSession({
            provider: 'github',
            userId: user.id,
            linked: true,
          }),
        ).rejects.toThrow('forced access-token signing failure');
        expect(
          await db
            .select()
            .from(workspaceMembers)
            .where(eq(workspaceMembers.userId, user.id)),
        ).toEqual([]);
        expect(
          await db
            .select()
            .from(refreshTokens)
            .where(eq(refreshTokens.userId, user.id)),
        ).toEqual([]);
        expect(
          await db
            .select({ id: workspaces.id })
            .from(workspaces)
            .where(eq(workspaces.name, 'Workspace')),
        ).toEqual(workspaceIdsBefore);
      } finally {
        signingFailure.mockRestore();
        await db.delete(users).where(eq(users.id, user.id));
      }
    });
  });

  describe('POST /auth/register', () => {
    it('registers the first owner and returns the normal token pair', async () => {
      const payload = uniqueRegisterPayload();
      const res = await postRegister(app, payload);

      expect(res.status).toBe(201);
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
      expect(typeof res.body.accessTokenExpiresIn).toBe('number');

      const claims = tokens.verifyAccess(res.body.accessToken as string);
      expect(claims.email).toBe(payload.email);
      expect(claims.role).toBe('admin');

      const me = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', bearer(res.body.accessToken as string));
      expect(me.status).toBe(200);
      expect(me.body).toMatchObject({
        displayName: payload.fullName,
        email: payload.email,
        role: 'admin',
      });

      const [userRow] = await db
        .select()
        .from(users)
        .where(eq(users.id, claims.sub))
        .limit(1);
      expect(userRow).toMatchObject({
        displayName: payload.fullName,
        email: payload.email,
        firebaseUid: claims.firebaseUid,
      });

      const [workspaceRow] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, claims.workspaceId))
        .limit(1);
      expect(workspaceRow?.name).toBe(payload.workspaceName);

      const [memberRow] = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.userId, claims.sub),
            eq(workspaceMembers.workspaceId, claims.workspaceId),
          ),
        )
        .limit(1);
      expect(memberRow?.role).toBe('admin');

      const [settingsRow] = await db
        .select()
        .from(workspaceSettings)
        .where(eq(workspaceSettings.workspaceId, claims.workspaceId))
        .limit(1);
      expect(settingsRow).toMatchObject({
        currency: 'USD',
        timeZone: 'UTC',
      });

      const [refreshRow] = await db
        .select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.userId, claims.sub),
            eq(
              refreshTokens.tokenHash,
              tokens.hashRefreshToken(res.body.refreshToken as string),
            ),
          ),
        )
        .limit(1);
      expect(refreshRow?.revokedAt).toBeNull();
      expect(refreshRow?.workspaceMemberId).toBe(memberRow?.id);
      expect(refreshRow?.workspaceId).toBe(claims.workspaceId);

      const refreshed = await postAuth(app, '/auth/refresh').send({
        refreshToken: res.body.refreshToken,
      });
      expect(refreshed.status).toBe(200);

      const refreshedClaims = tokens.verifyAccess(
        refreshed.body.accessToken as string,
      );
      expect(refreshedClaims.sub).toBe(claims.sub);
      expect(refreshedClaims.workspaceId).toBe(claims.workspaceId);
      expect(refreshedClaims.role).toBe('admin');
    });

    it('maps duplicate email failures to the shared registration code', async () => {
      const res = await postRegister(app, {
        ...uniqueRegisterPayload(),
        email: 'admin@example.com',
      });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('duplicate_email');
    });

    it('treats trimmed and case-insensitive email duplicates as duplicate_email', async () => {
      const payload = uniqueRegisterPayload();

      const first = await postRegister(app, payload);
      expect(first.status).toBe(201);

      const duplicateEmail = `  ${payload.email.toUpperCase()}  `;
      const second = await postRegister(app, {
        ...uniqueRegisterPayload(),
        email: duplicateEmail,
      });

      expect(second.status).toBe(409);
      expect(second.body.code).toBe('duplicate_email');
    });

    it('allows duplicate workspace display names and preserves distinct workspace IDs', async () => {
      const payload = uniqueRegisterPayload();
      const workspaceName = `Acme Registration ${Date.now().toString(36)}`;
      const first = await postRegister(app, {
        ...payload,
        workspaceName,
      });
      expect(first.status).toBe(201);

      const secondPayload = uniqueRegisterPayload();
      const second = await postRegister(app, {
        ...secondPayload,
        workspaceName: `  ${workspaceName.toUpperCase().replace(' ', '   ')}  `,
      });

      expect(second.status).toBe(201);

      const firstClaims = tokens.verifyAccess(first.body.accessToken as string);
      const secondClaims = tokens.verifyAccess(
        second.body.accessToken as string,
      );
      expect(secondClaims.workspaceId).not.toBe(firstClaims.workspaceId);

      const [secondUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(btrim(${users.email})) = ${secondPayload.email}`)
        .limit(1);
      expect(secondUser).toBeDefined();
    });

    it('maps blank workspace names to invalid_workspace_name', async () => {
      const res = await postRegister(app, {
        ...uniqueRegisterPayload(),
        workspaceName: '   ',
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('invalid_workspace_name');
    });

    it('maps weak passwords to weak_password', async () => {
      const res = await postRegister(app, {
        ...uniqueRegisterPayload(),
        password: 'short',
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('weak_password');
    });

    it('recovers a timed-out manual registration only from its exact Firebase UID without persisting the password', async () => {
      const payload = uniqueRegisterPayload();
      const originalCreate = firebase.createEmailPasswordUser.bind(firebase);
      let releaseFirebaseCreation!: () => void;
      const firebaseCreationGate = new Promise<void>((resolve) => {
        releaseFirebaseCreation = resolve;
      });
      const createSpy = vi
        .spyOn(firebase, 'createEmailPasswordUser')
        .mockImplementation(async (input) => {
          await firebaseCreationGate;
          return originalCreate(input);
        });
      const timeoutOwner = auth as unknown as {
        registrationFirebaseCreationTimeoutMs: number;
      };
      const originalTimeout =
        timeoutOwner.registrationFirebaseCreationTimeoutMs;
      timeoutOwner.registrationFirebaseCreationTimeoutMs = 20;

      try {
        const timedOut = await postRegister(app, payload);
        expect(timedOut.status).toBe(503);
        expect(timedOut.body.code).toBe('registration_service_unavailable');

        const [reserved] = await db
          .select()
          .from(firebaseIdentityReservations)
          .where(
            eq(firebaseIdentityReservations.normalizedEmail, payload.email),
          );
        expect(reserved).toMatchObject({
          purpose: 'registration',
          state: 'reserved',
          registrationDisplayName: payload.fullName,
          registrationWorkspaceName: payload.workspaceName,
          registrationOwnerAcknowledgement: true,
        });
        expect(reserved).not.toHaveProperty('password');
        expect(
          await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, payload.email)),
        ).toEqual([]);

        releaseFirebaseCreation();
        for (let attempt = 0; attempt < 20; attempt += 1) {
          const [updated] = await db
            .select({ state: firebaseIdentityReservations.state })
            .from(firebaseIdentityReservations)
            .where(eq(firebaseIdentityReservations.id, reserved!.id));
          if (updated?.state === 'confirmed') break;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        const [confirmed] = await db
          .select()
          .from(firebaseIdentityReservations)
          .where(eq(firebaseIdentityReservations.id, reserved!.id));
        expect(confirmed?.state).toBe('confirmed');

        const recovered = await request(app.getHttpServer())
          .post('/auth/login')
          .set('X-Forwarded-For', `10.42.0.${authTrackerCounter++}`)
          .send({
            firebaseIdToken: `test:${reserved!.firebaseUid}:${payload.email}:Ignored:verified=false`,
          })
          .expect(200);
        const recoveredClaims = tokens.verifyAccess(recovered.body.accessToken);
        expect(recoveredClaims.firebaseUid).toBe(reserved!.firebaseUid);
        const [recoveredUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, recoveredClaims.sub));
        expect(recoveredUser).toMatchObject({
          email: payload.email,
          displayName: payload.fullName,
          firebaseUid: reserved!.firebaseUid,
        });
        const memberships = await db
          .select()
          .from(workspaceMembers)
          .where(eq(workspaceMembers.userId, recoveredClaims.sub));
        expect(memberships).toHaveLength(1);
        const [recoveredWorkspace] = await db
          .select()
          .from(workspaces)
          .where(eq(workspaces.id, memberships[0]!.workspaceId));
        expect(recoveredWorkspace?.name).toBe(payload.workspaceName);
        expect(
          await request(app.getHttpServer())
            .post('/auth/login')
            .set('X-Forwarded-For', `10.42.0.${authTrackerCounter++}`)
            .send({
              firebaseIdToken: `test:${reserved!.firebaseUid}:${payload.email}:Ignored:verified=false`,
            })
            .expect(200),
        ).toBeDefined();
        expect(
          await db
            .select({ id: workspaceMembers.id })
            .from(workspaceMembers)
            .where(eq(workspaceMembers.userId, recoveredClaims.sub)),
        ).toHaveLength(1);

        const wrongUid = await request(app.getHttpServer())
          .post('/auth/login')
          .set('X-Forwarded-For', `10.42.0.${authTrackerCounter++}`)
          .send({
            firebaseIdToken: `test:wrong-${randomUUID()}:${payload.email}:Wrong:verified=false`,
          });
        expect(wrongUid.status).toBe(401);
      } finally {
        releaseFirebaseCreation();
        timeoutOwner.registrationFirebaseCreationTimeoutMs = originalTimeout;
        createSpy.mockRestore();
        const [reservation] = await db
          .select()
          .from(firebaseIdentityReservations)
          .where(
            eq(firebaseIdentityReservations.normalizedEmail, payload.email),
          );
        if (reservation?.userId) {
          const [membership] = await db
            .select()
            .from(workspaceMembers)
            .where(eq(workspaceMembers.userId, reservation.userId));
          await db
            .delete(refreshTokens)
            .where(eq(refreshTokens.userId, reservation.userId));
          await db
            .delete(workspaceMembers)
            .where(eq(workspaceMembers.userId, reservation.userId));
          if (membership) {
            await db
              .delete(workspaceSettings)
              .where(eq(workspaceSettings.workspaceId, membership.workspaceId));
            await db
              .delete(workspaces)
              .where(eq(workspaces.id, membership.workspaceId));
          }
          await db.delete(users).where(eq(users.id, reservation.userId));
        }
        await db
          .delete(firebaseIdentityReservations)
          .where(
            eq(firebaseIdentityReservations.normalizedEmail, payload.email),
          );
      }
    });

    it('retains timeout provenance after a late Firebase failure and rejects unauthenticated retries without another credential write', async () => {
      const payload = uniqueRegisterPayload();
      let rejectFirebaseCreation!: (reason?: unknown) => void;
      const firebaseCreationGate = new Promise<never>((_, reject) => {
        rejectFirebaseCreation = reject;
      });
      const createSpy = vi
        .spyOn(firebase, 'createEmailPasswordUser')
        .mockImplementation(async () => firebaseCreationGate);
      const timeoutOwner = auth as unknown as {
        registrationFirebaseCreationTimeoutMs: number;
      };
      const originalTimeout =
        timeoutOwner.registrationFirebaseCreationTimeoutMs;
      timeoutOwner.registrationFirebaseCreationTimeoutMs = 20;

      try {
        const timedOut = await postRegister(app, payload);
        expect(timedOut.status).toBe(503);
        const [reserved] = await db
          .select()
          .from(firebaseIdentityReservations)
          .where(
            eq(firebaseIdentityReservations.normalizedEmail, payload.email),
          );
        expect(reserved).toMatchObject({
          purpose: 'registration',
          state: 'reserved',
          registrationDisplayName: payload.fullName,
          registrationWorkspaceName: payload.workspaceName,
          registrationOwnerAcknowledgement: true,
        });

        const unknownSubject = await request(app.getHttpServer())
          .post('/auth/login')
          .set('X-Forwarded-For', `10.42.0.${authTrackerCounter++}`)
          .send({
            firebaseIdToken: `test:absent-${randomUUID()}:${payload.email}:Unknown:verified=false`,
          });
        expect(unknownSubject.status).toBe(401);
        expect(
          (
            await db
              .select({ state: firebaseIdentityReservations.state })
              .from(firebaseIdentityReservations)
              .where(eq(firebaseIdentityReservations.id, reserved!.id))
          )[0],
        ).toEqual({ state: 'reserved' });

        rejectFirebaseCreation(new Error('late Firebase network failure'));
        await new Promise((resolve) => setTimeout(resolve, 20));

        const retry = await postRegister(app, payload);
        expect(retry.status).toBe(503);
        expect(retry.body.code).toBe('registration_service_unavailable');
        expect(createSpy).toHaveBeenCalledTimes(1);
        const [afterLateFailure] = await db
          .select()
          .from(firebaseIdentityReservations)
          .where(eq(firebaseIdentityReservations.id, reserved!.id));
        expect(afterLateFailure).toMatchObject({
          firebaseUid: reserved!.firebaseUid,
          state: 'reserved',
          registrationDisplayName: payload.fullName,
          registrationWorkspaceName: payload.workspaceName,
          registrationOwnerAcknowledgement: true,
        });
        expect(
          await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, payload.email)),
        ).toEqual([]);
      } finally {
        rejectFirebaseCreation(new Error('test cleanup'));
        timeoutOwner.registrationFirebaseCreationTimeoutMs = originalTimeout;
        createSpy.mockRestore();
        await db
          .delete(firebaseIdentityReservations)
          .where(
            eq(firebaseIdentityReservations.normalizedEmail, payload.email),
          );
      }
    });

    it('retains a reservation when Firebase may have created the exact UID before reporting an ambiguous internal error', async () => {
      const payload = uniqueRegisterPayload();
      const originalCreate = firebase.createEmailPasswordUser.bind(firebase);
      const createSpy = vi
        .spyOn(firebase, 'createEmailPasswordUser')
        .mockImplementation(async (input) => {
          await originalCreate(input);
          throw new FirebaseAdminAuthError(
            'auth/internal-error',
            'Remote creation outcome was not acknowledged',
          );
        });

      try {
        const failed = await postRegister(app, payload);
        expect(failed.status).toBe(503);
        expect(failed.body.code).toBe('registration_service_unavailable');
        const [reserved] = await db
          .select()
          .from(firebaseIdentityReservations)
          .where(
            eq(firebaseIdentityReservations.normalizedEmail, payload.email),
          );
        expect(reserved).toMatchObject({
          purpose: 'registration',
          state: 'reserved',
          registrationDisplayName: payload.fullName,
          registrationWorkspaceName: payload.workspaceName,
          registrationOwnerAcknowledgement: true,
        });
        expect(
          await firebase.getUserByUid(reserved!.firebaseUid),
        ).toMatchObject({
          uid: reserved!.firebaseUid,
          email: payload.email,
          disabled: false,
        });

        const recovered = await request(app.getHttpServer())
          .post('/auth/login')
          .set('X-Forwarded-For', `10.42.0.${authTrackerCounter++}`)
          .send({
            firebaseIdToken: `test:${reserved!.firebaseUid}:${payload.email}:Fresh service recovery:verified=false`,
          })
          .expect(200);
        const claims = tokens.verifyAccess(recovered.body.accessToken);
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, claims.sub));
        expect(user).toMatchObject({
          firebaseUid: reserved!.firebaseUid,
          email: payload.email,
          displayName: payload.fullName,
        });
        expect(
          await db
            .select({ id: workspaceMembers.id })
            .from(workspaceMembers)
            .where(eq(workspaceMembers.userId, user!.id)),
        ).toHaveLength(1);
      } finally {
        createSpy.mockRestore();
        const [reservation] = await db
          .select()
          .from(firebaseIdentityReservations)
          .where(
            eq(firebaseIdentityReservations.normalizedEmail, payload.email),
          );
        if (reservation?.userId) {
          const [membership] = await db
            .select()
            .from(workspaceMembers)
            .where(eq(workspaceMembers.userId, reservation.userId));
          await db
            .delete(refreshTokens)
            .where(eq(refreshTokens.userId, reservation.userId));
          await db
            .delete(workspaceMembers)
            .where(eq(workspaceMembers.userId, reservation.userId));
          if (membership) {
            await db
              .delete(workspaceSettings)
              .where(eq(workspaceSettings.workspaceId, membership.workspaceId));
            await db
              .delete(workspaces)
              .where(eq(workspaces.id, membership.workspaceId));
          }
          await db.delete(users).where(eq(users.id, reservation.userId));
        }
        await db
          .delete(firebaseIdentityReservations)
          .where(
            eq(firebaseIdentityReservations.normalizedEmail, payload.email),
          );
      }
    });

    it('reuses a compatible existing foundation during exact-UID registration recovery without another membership', async () => {
      const email = `recovery-existing-${randomUUID()}@example.test`;
      const firebaseUid = randomUUID();
      const [workspace] = await db
        .insert(workspaces)
        .values({ name: `Existing recovery workspace ${randomUUID()}` })
        .returning();
      const [user] = await db
        .insert(users)
        .values({
          firebaseUid,
          email,
          displayName: 'Existing Recovery User',
        })
        .returning();
      if (!workspace || !user) throw new Error('Expected recovery fixtures');
      await firebase.createEmailPasswordUser({
        uid: firebaseUid,
        email,
        password: 'password123',
        displayName: 'Existing Recovery User',
      });
      await db.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: user.id,
        role: 'member',
      });
      const [reservation] = await db
        .insert(firebaseIdentityReservations)
        .values({
          normalizedEmail: email,
          firebaseUid,
          purpose: 'registration',
          state: 'confirmed',
          registrationDisplayName: 'Stored Recovery Name',
          registrationWorkspaceName: 'Stored Recovery Workspace',
          registrationOwnerAcknowledgement: true,
        })
        .returning();

      try {
        const recovered = await request(app.getHttpServer())
          .post('/auth/login')
          .set('X-Forwarded-For', `10.42.0.${authTrackerCounter++}`)
          .send({
            firebaseIdToken: `test:${firebaseUid}:${email}:Ignored:verified=false`,
          })
          .expect(200);
        const claims = tokens.verifyAccess(recovered.body.accessToken);
        expect(claims).toMatchObject({
          sub: user.id,
          firebaseUid,
          workspaceId: workspace.id,
          role: 'member',
        });
        expect(
          await db
            .select({ id: workspaceMembers.id })
            .from(workspaceMembers)
            .where(eq(workspaceMembers.userId, user.id)),
        ).toHaveLength(1);
        expect(
          (
            await db
              .select({
                state: firebaseIdentityReservations.state,
                userId: firebaseIdentityReservations.userId,
              })
              .from(firebaseIdentityReservations)
              .where(eq(firebaseIdentityReservations.id, reservation!.id))
          )[0],
        ).toEqual({ state: 'bound', userId: user.id });
      } finally {
        await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id));
        await db
          .delete(workspaceMembers)
          .where(eq(workspaceMembers.userId, user.id));
        await db
          .delete(firebaseIdentityReservations)
          .where(eq(firebaseIdentityReservations.id, reservation!.id));
        await db.delete(users).where(eq(users.id, user.id));
        await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
      }
    });

    it('rebuilds an unbound stored registration from durable reservation and live Firebase identity without a pending creation promise', async () => {
      const email = `recovery-restart-${randomUUID()}@example.test`;
      const firebaseUid = randomUUID();
      const displayName = 'Restart Recovery Owner';
      const workspaceName = `Restart Recovery Workspace ${randomUUID()}`;
      await firebase.createEmailPasswordUser({
        uid: firebaseUid,
        email,
        password: 'password123',
        displayName,
      });
      const [reservation] = await db
        .insert(firebaseIdentityReservations)
        .values({
          normalizedEmail: email,
          firebaseUid,
          purpose: 'registration',
          state: 'confirmed',
          registrationDisplayName: displayName,
          registrationWorkspaceName: workspaceName,
          registrationOwnerAcknowledgement: true,
        })
        .returning();

      try {
        expect(await firebase.getUserByUid(firebaseUid)).toMatchObject({
          uid: firebaseUid,
          email,
          disabled: false,
        });
        const recovered = await request(app.getHttpServer())
          .post('/auth/login')
          .set('X-Forwarded-For', `10.42.0.${authTrackerCounter++}`)
          .send({
            firebaseIdToken: `test:${firebaseUid}:${email}:Ignored:verified=false`,
          })
          .expect(200);
        const claims = tokens.verifyAccess(recovered.body.accessToken);
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, claims.sub));
        expect(user).toMatchObject({ firebaseUid, email, displayName });
        const memberships = await db
          .select()
          .from(workspaceMembers)
          .where(eq(workspaceMembers.userId, user!.id));
        expect(memberships).toHaveLength(1);
        const [createdWorkspace] = await db
          .select()
          .from(workspaces)
          .where(eq(workspaces.id, memberships[0]!.workspaceId));
        expect(createdWorkspace?.name).toBe(workspaceName);
      } finally {
        const [current] = await db
          .select()
          .from(firebaseIdentityReservations)
          .where(eq(firebaseIdentityReservations.id, reservation!.id));
        if (current?.userId) {
          const [membership] = await db
            .select()
            .from(workspaceMembers)
            .where(eq(workspaceMembers.userId, current.userId));
          await db
            .delete(refreshTokens)
            .where(eq(refreshTokens.userId, current.userId));
          await db
            .delete(workspaceMembers)
            .where(eq(workspaceMembers.userId, current.userId));
          if (membership) {
            await db
              .delete(workspaceSettings)
              .where(eq(workspaceSettings.workspaceId, membership.workspaceId));
            await db
              .delete(workspaces)
              .where(eq(workspaces.id, membership.workspaceId));
          }
          await db.delete(users).where(eq(users.id, current.userId));
        }
        await db
          .delete(firebaseIdentityReservations)
          .where(eq(firebaseIdentityReservations.id, reservation!.id));
      }
    });
  });

  describe('POST /auth/switch-workspace', () => {
    it('switches to another workspace membership, scopes the new token, and preserves that scope on refresh', async () => {
      const suffix = randomUUID();
      const { admin } = await getSeededAdminWorkspace(db);
      const [workspace] = await db
        .insert(workspaces)
        .values({ name: `Switched Workspace ${suffix}` })
        .returning();
      if (!workspace) throw new Error('Failed to create switched workspace');

      try {
        await db.insert(workspaceMembers).values({
          workspaceId: workspace.id,
          userId: admin.id,
          role: 'member',
        });

        const initialTokens = await login(app);
        const switched = await request(app.getHttpServer())
          .post('/auth/switch-workspace')
          .set('Authorization', bearer(initialTokens.accessToken))
          .send({
            refreshToken: initialTokens.refreshToken,
            workspaceId: workspace.id,
          });

        expect(switched.status).toBe(200);
        expect(typeof switched.body.accessToken).toBe('string');
        expect(typeof switched.body.refreshToken).toBe('string');

        const switchedClaims = tokens.verifyAccess(
          switched.body.accessToken as string,
        );
        expect(switchedClaims.workspaceId).toBe(workspace.id);
        expect(switchedClaims.role).toBe('member');

        const switchedWorkspace = await request(app.getHttpServer())
          .get('/workspace')
          .set('Authorization', bearer(switched.body.accessToken as string));
        expect(switchedWorkspace.status).toBe(200);
        expect(switchedWorkspace.body.name).toBe(workspace.name);

        const adminOnlyMembers = await request(app.getHttpServer())
          .get('/members')
          .set('Authorization', bearer(switched.body.accessToken as string));
        expect(adminOnlyMembers.status).toBe(403);

        const [refreshRow] = await db
          .select()
          .from(refreshTokens)
          .where(
            and(
              eq(refreshTokens.userId, admin.id),
              eq(
                refreshTokens.tokenHash,
                tokens.hashRefreshToken(switched.body.refreshToken as string),
              ),
            ),
          )
          .limit(1);
        expect(refreshRow?.workspaceId).toBe(workspace.id);

        const oldRefresh = await postAuth(app, '/auth/refresh').send({
          refreshToken: initialTokens.refreshToken,
        });
        expect(oldRefresh.status).toBe(401);

        const refreshed = await postAuth(app, '/auth/refresh').send({
          refreshToken: switched.body.refreshToken,
        });
        expect(refreshed.status).toBe(200);

        const refreshedClaims = tokens.verifyAccess(
          refreshed.body.accessToken as string,
        );
        expect(refreshedClaims.workspaceId).toBe(workspace.id);
        expect(refreshedClaims.role).toBe('member');
      } finally {
        await db
          .delete(refreshTokens)
          .where(eq(refreshTokens.workspaceId, workspace.id));
        await db
          .delete(workspaceMembers)
          .where(eq(workspaceMembers.workspaceId, workspace.id));
        await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
      }
    });

    it('rejects invalid switch payloads before issuing new tokens', async () => {
      const initialTokens = await login(app);
      const { workspace } = await getSeededAdminWorkspace(db);

      const invalidWorkspaceId = await request(app.getHttpServer())
        .post('/auth/switch-workspace')
        .set('Authorization', bearer(initialTokens.accessToken))
        .send({
          refreshToken: initialTokens.refreshToken,
          workspaceId: 'not-a-uuid',
        });

      expect(invalidWorkspaceId.status).toBe(400);

      const missingRefreshToken = await request(app.getHttpServer())
        .post('/auth/switch-workspace')
        .set('Authorization', bearer(initialTokens.accessToken))
        .send({ workspaceId: workspace.id });

      expect(missingRefreshToken.status).toBe(400);

      const payloadWithUnknownKey = await request(app.getHttpServer())
        .post('/auth/switch-workspace')
        .set('Authorization', bearer(initialTokens.accessToken))
        .send({
          refreshToken: initialTokens.refreshToken,
          workspaceId: workspace.id,
          unexpected: true,
        });

      expect(payloadWithUnknownKey.status).toBe(400);
    });

    it('rejects target workspaces where the caller has no membership', async () => {
      const [workspace] = await db
        .insert(workspaces)
        .values({ name: `Forbidden Workspace ${randomUUID()}` })
        .returning();
      if (!workspace) throw new Error('Failed to create forbidden workspace');

      try {
        const initialTokens = await login(app);
        const switched = await request(app.getHttpServer())
          .post('/auth/switch-workspace')
          .set('Authorization', bearer(initialTokens.accessToken))
          .send({
            refreshToken: initialTokens.refreshToken,
            workspaceId: workspace.id,
          });

        expect(switched.status).toBe(403);
      } finally {
        await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
      }
    });

    it('rejects refresh when the selected workspace membership is removed after switching', async () => {
      const suffix = randomUUID();
      const { admin } = await getSeededAdminWorkspace(db);
      const [workspace] = await db
        .insert(workspaces)
        .values({ name: `Removed Membership Workspace ${suffix}` })
        .returning();
      if (!workspace) throw new Error('Failed to create switched workspace');

      try {
        await db.insert(workspaceMembers).values({
          workspaceId: workspace.id,
          userId: admin.id,
          role: 'member',
        });

        const initialTokens = await login(app);
        const switched = await request(app.getHttpServer())
          .post('/auth/switch-workspace')
          .set('Authorization', bearer(initialTokens.accessToken))
          .send({
            refreshToken: initialTokens.refreshToken,
            workspaceId: workspace.id,
          });

        expect(switched.status).toBe(200);

        await db
          .delete(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.workspaceId, workspace.id),
              eq(workspaceMembers.userId, admin.id),
            ),
          );

        const refreshed = await postAuth(app, '/auth/refresh').send({
          refreshToken: switched.body.refreshToken,
        });

        expect(refreshed.status).toBe(401);
      } finally {
        await db
          .delete(refreshTokens)
          .where(eq(refreshTokens.workspaceId, workspace.id));
        await db
          .delete(workspaceMembers)
          .where(eq(workspaceMembers.workspaceId, workspace.id));
        await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
      }
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates the refresh token; the old one is no longer usable', async () => {
      const first = await login(app);

      const rotated = await postAuth(app, '/auth/refresh').send({
        refreshToken: first.refreshToken,
      });

      expect(rotated.status).toBe(200);
      expect(rotated.body.refreshToken).not.toBe(first.refreshToken);

      // Using the new one again must succeed.
      const rotated2 = await postAuth(app, '/auth/refresh').send({
        refreshToken: rotated.body.refreshToken,
      });
      expect(rotated2.status).toBe(200);

      // Replaying the very first (now-revoked) refresh token → reuse
      // detection → family destroyed → 401, and the latest rotated
      // token from that family must also be invalidated.
      const replay = await postAuth(app, '/auth/refresh').send({
        refreshToken: first.refreshToken,
      });
      expect(replay.status).toBe(401);

      const afterReuse = await postAuth(app, '/auth/refresh').send({
        refreshToken: rotated2.body.refreshToken,
      });
      expect(afterReuse.status).toBe(401);
    });

    it('rejects an unknown refresh token with 401', async () => {
      const res = await postAuth(app, '/auth/refresh').send({
        refreshToken: 'not-a-real-token',
      });
      expect(res.status).toBe(401);
    });

    it('rejects refresh after the exact membership row is removed and recreated', async () => {
      const session = await login(app);
      const claims = tokens.verifyAccess(session.accessToken);

      const [membershipRow] = await db
        .select({ id: workspaceMembers.id, role: workspaceMembers.role })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.userId, claims.sub),
            eq(workspaceMembers.workspaceId, claims.workspaceId),
          ),
        )
        .limit(1);
      expect(membershipRow).toBeDefined();

      await db
        .delete(workspaceMembers)
        .where(eq(workspaceMembers.id, membershipRow!.id));

      await db.insert(workspaceMembers).values({
        role: membershipRow!.role,
        userId: claims.sub,
        workspaceId: claims.workspaceId,
      });

      const refreshed = await postAuth(app, '/auth/refresh').send({
        refreshToken: session.refreshToken,
      });
      expect(refreshed.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('requires a bearer token', async () => {
      const res = await postAuth(app, '/auth/logout').send({
        refreshToken: 'whatever',
      });
      expect(res.status).toBe(401);
    });

    it('invalidates the presented refresh token; other sessions survive', async () => {
      // Two independent sessions for the same user.
      const sessionA = await login(app);
      const sessionB = await login(app);

      const out = await postAuth(app, '/auth/logout')
        .set('Authorization', bearer(sessionA.accessToken))
        .send({
          refreshToken: sessionA.refreshToken,
        });
      expect(out.status).toBe(204);

      // Session A's refresh token no longer works.
      const refreshA = await postAuth(app, '/auth/refresh').send({
        refreshToken: sessionA.refreshToken,
      });
      expect(refreshA.status).toBe(401);

      // Session B is unaffected.
      const refreshB = await postAuth(app, '/auth/refresh').send({
        refreshToken: sessionB.refreshToken,
      });
      expect(refreshB.status).toBe(200);
    });
  });

  describe('POST /auth/refresh (concurrency)', () => {
    it('atomic rotation ensures only one refresh per token can succeed', async () => {
      const session = await login(app);

      const [res1, res2] = await Promise.all([
        postAuth(app, '/auth/refresh').send({
          refreshToken: session.refreshToken,
        }),
        postAuth(app, '/auth/refresh').send({
          refreshToken: session.refreshToken,
        }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 401]);

      const winningRefreshToken =
        res1.status === 200 ? res1.body.refreshToken : res2.body.refreshToken;

      const winnerStillWorks = await postAuth(app, '/auth/refresh').send({
        refreshToken: winningRefreshToken,
      });
      expect(winnerStillWorks.status).toBe(200);
    });
  });
});

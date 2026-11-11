import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Client } from 'pg';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../src/auth/services/auth.service';
import request from 'supertest';
import { ADMIN_FAKE_TOKEN, bearer, login } from './helpers/auth';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import { firebaseIdentityReservations } from '../src/auth/schemas/firebase-identity-reservations.schema';
import { firebaseSubjectBindings } from '../src/auth/schemas/firebase-subject-bindings.schema';
import { identityRecoveryAudit } from '../src/auth/schemas/identity-recovery-audit.schema';
import { users, workspaceMembers, workspaces } from '../src/db/schema';
import type { FakeFirebaseAdminService } from '../src/auth/services/firebase-admin.fake';
import {
  FIREBASE_ADMIN,
  FirebaseAdminAuthError,
} from '../src/auth/services/firebase-admin.interface';
import { TokenService } from '../src/auth/services/token.service';

const MEMBER_FAKE_TOKEN = 'test:seed-user-2:bob@gitiempo.dev:Bob';
const ASSESS_PATH = '/auth/identity-recovery/assess';
const RESOLVE_PATH = '/auth/identity-recovery/resolve';
const AGED_RESERVATION_AGE_MS = 25 * 60 * 60 * 1000;
const CONFIRMED_ABSENCE_EVIDENCE =
  'auth/user-not-found (confirmed by two consecutive lookups)';
const AUDIT_ROW_KEYS = [
  'createdAt',
  'firebaseUid',
  'id',
  'normalizedEmail',
  'operatorDecision',
  'operatorIdentity',
  'providerAbsenceEvidence',
  'purpose',
  'registrationDisplayName',
  'registrationOwnerAcknowledgement',
  'registrationWorkspaceName',
  'reservationId',
  'updatedAt',
];

type ReservationInsert = typeof firebaseIdentityReservations.$inferInsert;

let requestTracker = 1;
let registerTracker = 1;

function forwardFor(): string {
  return `10.46.0.${requestTracker++}`;
}

function postRegister(app: INestApplication, payload: Record<string, unknown>) {
  return request(app.getHttpServer())
    .post('/auth/register')
    .set('X-Forwarded-For', `10.47.0.${registerTracker++}`)
    .send(payload);
}

function getAssess(app: INestApplication, accessToken?: string) {
  const req = request(app.getHttpServer())
    .get(ASSESS_PATH)
    .set('X-Forwarded-For', forwardFor());
  if (accessToken) return req.set('Authorization', bearer(accessToken));
  return req;
}

function postResolve(
  app: INestApplication,
  accessToken: string | undefined,
  body: Record<string, unknown>,
) {
  const req = request(app.getHttpServer())
    .post(RESOLVE_PATH)
    .set('X-Forwarded-For', forwardFor())
    .send(body);
  if (accessToken) return req.set('Authorization', bearer(accessToken));
  return req;
}

async function seedRegistrationReservation(
  db: DrizzleDB,
  overrides: Partial<ReservationInsert> = {},
) {
  const [row] = await db
    .insert(firebaseIdentityReservations)
    .values({
      normalizedEmail: `aged.${randomUUID()}@example.com`,
      firebaseUid: `aged-uid-${randomUUID()}`,
      purpose: 'registration',
      state: 'reserved',
      creationOutcomePending: false,
      registrationDisplayName: 'Aged Owner',
      registrationWorkspaceName: 'Aged Studio',
      registrationOwnerAcknowledgement: true,
      createdAt: new Date(Date.now() - AGED_RESERVATION_AGE_MS),
      ...overrides,
    })
    .returning();
  return row;
}

async function fetchReservation(db: DrizzleDB, id: string) {
  const [row] = await db
    .select()
    .from(firebaseIdentityReservations)
    .where(eq(firebaseIdentityReservations.id, id));
  return row;
}

function fetchAuditRows(db: DrizzleDB, reservationId: string) {
  return db
    .select()
    .from(identityRecoveryAudit)
    .where(eq(identityRecoveryAudit.reservationId, reservationId));
}

/** Operator recovery surface coverage: assess + resolve against the fake Firebase provider. */
describe('Identity recovery (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let tokens: TokenService;
  let firebase: FakeFirebaseAdminService;
  let operatorIdentity: string;
  let operatorAccessToken: string;
  let memberAccessToken: string;

  beforeAll(async () => {
    // ConfigModule.forRoot validates env when app.module.ts is imported, so
    // the operator allowlist must be resolved from the seeded database and
    // assigned to process.env before the AppModule is imported here.
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL is required for e2e');
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const { rows } = await client.query<{ id: string }>(
        "SELECT id FROM users WHERE firebase_uid = 'admin-uid' LIMIT 1",
      );
      operatorIdentity = rows[0]?.id ?? '';
    } finally {
      await client.end();
    }
    if (!operatorIdentity) throw new Error('Expected seeded admin user');
    process.env.PLATFORM_OPERATOR_USER_IDS = operatorIdentity;

    const { AppModule } = await import('../src/app.module.js');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.getHttpAdapter().getInstance().set('trust proxy', true);
    await app.init();
    db = app.get<DrizzleDB>(DRIZZLE);
    tokens = app.get(TokenService);
    firebase = app.get(FIREBASE_ADMIN);
    operatorAccessToken = (await login(app, ADMIN_FAKE_TOKEN)).accessToken;
    memberAccessToken = (await login(app, MEMBER_FAKE_TOKEN)).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /auth/identity-recovery/assess', () => {
    it('lists aged unbound registration reservations for a platform operator without registration secrets', async () => {
      const baseline = await getAssess(app, operatorAccessToken);
      expect(baseline.status).toBe(200);
      expect(Array.isArray(baseline.body)).toBe(true);
      const baselineIds = new Set<string>(
        baseline.body.map(
          (row: { reservationId: string }) => row.reservationId,
        ),
      );

      const seeded = await seedRegistrationReservation(db);

      const after = await getAssess(app, operatorAccessToken);
      expect(after.status).toBe(200);
      const added = after.body.filter(
        (row: { reservationId: string }) => !baselineIds.has(row.reservationId),
      );
      expect(added).toHaveLength(1);
      const [entry] = added;
      expect(entry).toEqual({
        reservationId: seeded.id,
        normalizedEmail: seeded.normalizedEmail,
        firebaseUid: seeded.firebaseUid,
        purpose: 'registration',
        state: 'reserved',
        registrationDisplayName: 'Aged Owner',
        registrationWorkspaceName: 'Aged Studio',
        createdAt: seeded.createdAt.toISOString(),
      });
    });

    it('forbids non-operator members with 403', async () => {
      const res = await getAssess(app, memberAccessToken);
      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated callers with 401', async () => {
      const res = await getAssess(app);
      expect(res.status).toBe(401);
    });
  });

  describe('uncertain registration creation', () => {
    it.each(['immediate', 'after-timeout'] as const)(
      'retains the email and refuses operator resolution after %s response loss',
      async (failureTiming) => {
        const auth = app.get(AuthService);
        const previousTimeout = Reflect.get(
          auth,
          'registrationFirebaseCreationTimeoutMs',
        );
        Reflect.set(
          auth,
          'registrationFirebaseCreationTimeoutMs',
          failureTiming === 'immediate' ? 1000 : 50,
        );
        let rejectCreation!: (error: unknown) => void;
        const creation = new Promise<never>((_resolve, reject) => {
          rejectCreation = reject;
        });
        let committedPendingAtDispatch: boolean | null | undefined;
        const create = vi
          .spyOn(firebase, 'createEmailPasswordUser')
          .mockImplementationOnce(async (input) => {
            const [committed] = await db
              .select()
              .from(firebaseIdentityReservations)
              .where(eq(firebaseIdentityReservations.firebaseUid, input.uid!));
            committedPendingAtDispatch = committed?.creationOutcomePending;
            if (failureTiming === 'immediate') {
              throw new FirebaseAdminAuthError(
                'auth/internal-error',
                'response lost',
              );
            }
            return creation;
          });
        const email = `lost-response.${randomUUID()}@example.com`;
        const payload = {
          email,
          fullName: 'Retained Owner',
          ownerAcknowledgement: true,
          password: 'password123',
          workspaceName: 'Retained Workspace',
        };
        try {
          const registration = await postRegister(app, payload);
          expect(registration.status).toBe(503);
          await vi.waitFor(() => expect(committedPendingAtDispatch).toBe(true));
          const [reservation] = await db
            .select()
            .from(firebaseIdentityReservations)
            .where(eq(firebaseIdentityReservations.normalizedEmail, email));
          expect(reservation.creationOutcomePending).toBe(true);
          if (failureTiming === 'after-timeout') {
            rejectCreation(
              new FirebaseAdminAuthError(
                'auth/internal-error',
                'late response lost',
              ),
            );
            await new Promise<void>((resolve) => setImmediate(resolve));
          }
          await db
            .update(firebaseIdentityReservations)
            .set({ createdAt: new Date(Date.now() - AGED_RESERVATION_AGE_MS) })
            .where(eq(firebaseIdentityReservations.id, reservation.id));
          expect(
            await firebase.confirmUidAbsent(reservation.firebaseUid),
          ).toMatchObject({ absent: true });
          const resolved = await postResolve(app, operatorAccessToken, {
            reservationId: reservation.id,
            operatorDecision: 'Attempt to release an uncertain creation',
          });
          expect(resolved.status).toBe(503);
          expect((await postRegister(app, payload)).status).toBe(503);
          expect(create).toHaveBeenCalledTimes(1);
          expect(await fetchReservation(db, reservation.id)).toMatchObject({
            state: 'reserved',
            creationOutcomePending: true,
            firebaseUid: reservation.firebaseUid,
          });
          expect(await fetchAuditRows(db, reservation.id)).toEqual([]);
        } finally {
          create.mockRestore();
          Reflect.set(
            auth,
            'registrationFirebaseCreationTimeoutMs',
            previousTimeout,
          );
        }
      },
    );
  });

  it('resolves a timed-out registration after definitive non-creation and permits a new registration', async () => {
    const auth = app.get(AuthService);
    const previousTimeout = Reflect.get(
      auth,
      'registrationFirebaseCreationTimeoutMs',
    );
    Reflect.set(auth, 'registrationFirebaseCreationTimeoutMs', 5);
    let rejectCreation!: (error: unknown) => void;
    const creation = new Promise<never>((_resolve, reject) => {
      rejectCreation = reject;
    });
    const create = vi
      .spyOn(firebase, 'createEmailPasswordUser')
      .mockImplementationOnce(() => creation);
    const email = `definitive-failure.${randomUUID()}@example.com`;
    const payload = {
      email,
      fullName: 'Retry Owner',
      ownerAcknowledgement: true,
      password: 'password123',
      workspaceName: 'Retry Workspace',
    };
    try {
      expect((await postRegister(app, payload)).status).toBe(503);
      const [reservation] = await db
        .select()
        .from(firebaseIdentityReservations)
        .where(eq(firebaseIdentityReservations.normalizedEmail, email));
      expect(reservation.creationOutcomePending).toBe(true);
      rejectCreation(
        new FirebaseAdminAuthError(
          'auth/operation-not-allowed',
          'Creation disabled',
        ),
      );
      await vi.waitFor(async () => {
        expect(await fetchReservation(db, reservation.id)).toMatchObject({
          state: 'reserved',
          creationOutcomePending: false,
        });
      });
      await db
        .update(firebaseIdentityReservations)
        .set({ createdAt: new Date(Date.now() - AGED_RESERVATION_AGE_MS) })
        .where(eq(firebaseIdentityReservations.id, reservation.id));
      expect(
        (
          await postResolve(app, operatorAccessToken, {
            reservationId: reservation.id,
            operatorDecision: 'Provider definitively refused creation',
          })
        ).status,
      ).toBe(204);
      expect(await fetchAuditRows(db, reservation.id)).toHaveLength(1);
      expect((await fetchReservation(db, reservation.id)).state).toBe(
        'resolved',
      );
      Reflect.set(
        auth,
        'registrationFirebaseCreationTimeoutMs',
        previousTimeout,
      );
      expect((await postRegister(app, payload)).status).toBe(201);
    } finally {
      create.mockRestore();
      Reflect.set(
        auth,
        'registrationFirebaseCreationTimeoutMs',
        previousTimeout,
      );
    }
  });

  describe('POST /auth/identity-recovery/resolve', () => {
    it('forbids non-operator members with 403', async () => {
      const res = await postResolve(app, memberAccessToken, {
        reservationId: randomUUID(),
        operatorDecision: 'non-operator attempt',
      });
      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated callers with 401', async () => {
      const res = await postResolve(app, undefined, {
        reservationId: randomUUID(),
        operatorDecision: 'unauthenticated attempt',
      });
      expect(res.status).toBe(401);
    });

    it('rejects a body-supplied operator identity with 400 and retains the reservation', async () => {
      const seeded = await seedRegistrationReservation(db);

      const res = await postResolve(app, operatorAccessToken, {
        reservationId: seeded.id,
        operatorDecision: 'body-injected operator identity',
        operatorIdentity: 'attacker-sub',
      });
      expect(res.status).toBe(400);

      const current = await fetchReservation(db, seeded.id);
      expect(current.state).toBe('reserved');
      expect(await fetchAuditRows(db, seeded.id)).toHaveLength(0);
    });

    it('resolves a conclusively abandoned reservation and audits the operator identity from the token', async () => {
      const seeded = await seedRegistrationReservation(db);
      const decision = 'Confirmed abandoned: UID absent and unadopted';

      const res = await postResolve(app, operatorAccessToken, {
        reservationId: seeded.id,
        operatorDecision: decision,
      });
      expect(res.status).toBe(204);

      const current = await fetchReservation(db, seeded.id);
      expect(current.state).toBe('resolved');
      expect(current.purpose).toBe('registration');

      const audits = await fetchAuditRows(db, seeded.id);
      expect(audits).toHaveLength(1);
      const [audit] = audits;
      expect(Object.keys(audit).sort()).toEqual(AUDIT_ROW_KEYS);
      expect(audit.reservationId).toBe(seeded.id);
      expect(audit.normalizedEmail).toBe(seeded.normalizedEmail);
      expect(audit.firebaseUid).toBe(seeded.firebaseUid);
      expect(audit.operatorDecision).toBe(decision);
      expect(audit.providerAbsenceEvidence).toBe(CONFIRMED_ABSENCE_EVIDENCE);

      const claims = tokens.verifyAccess(operatorAccessToken);
      expect(claims.sub).toBe(operatorIdentity);
      expect(audit.operatorIdentity).toBe(operatorIdentity);
    });

    it('frees the email for re-registration after resolving an abandoned registration', async () => {
      const seeded = await seedRegistrationReservation(db);
      expect(await firebase.confirmUidAbsent(seeded.firebaseUid)).toMatchObject(
        {
          absent: true,
        },
      );

      const resolve = await postResolve(app, operatorAccessToken, {
        reservationId: seeded.id,
        operatorDecision:
          'Confirmed abandoned: email freed for re-registration',
      });
      expect(resolve.status).toBe(204);

      const resolved = await fetchReservation(db, seeded.id);
      expect(resolved.state).toBe('resolved');
      expect(await fetchAuditRows(db, seeded.id)).toHaveLength(1);

      const payload = {
        email: seeded.normalizedEmail,
        fullName: 'Re-Registered Owner',
        ownerAcknowledgement: true,
        password: 'password123',
        workspaceName: `Reborn Studio ${randomUUID().slice(0, 8)}`,
      };
      const reRegistration = await postRegister(app, payload);
      expect(reRegistration.status).toBe(201);
      expect(typeof reRegistration.body.accessToken).toBe('string');
      expect(typeof reRegistration.body.refreshToken).toBe('string');

      const claims = tokens.verifyAccess(
        String(reRegistration.body.accessToken),
      );
      expect(claims.email).toBe(seeded.normalizedEmail);
      expect(claims.role).toBe('admin');
      expect(claims.firebaseUid).not.toBe(seeded.firebaseUid);

      expect(await firebase.getUserByUid(claims.firebaseUid)).toMatchObject({
        email: seeded.normalizedEmail,
      });

      const [userRow] = await db
        .select()
        .from(users)
        .where(eq(users.id, claims.sub))
        .limit(1);
      expect(userRow).toMatchObject({
        displayName: payload.fullName,
        email: seeded.normalizedEmail,
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

      const reservationsForEmail = await db
        .select()
        .from(firebaseIdentityReservations)
        .where(
          eq(
            firebaseIdentityReservations.normalizedEmail,
            seeded.normalizedEmail,
          ),
        );
      const original = reservationsForEmail.find((row) => row.id === seeded.id);
      const fresh = reservationsForEmail.find((row) => row.id !== seeded.id);
      expect(original?.state).toBe('resolved');
      expect(fresh).toMatchObject({
        purpose: 'registration',
        state: 'bound',
        firebaseUid: claims.firebaseUid,
        userId: claims.sub,
      });
    });

    it('preserves repeated registration history and audit when operator recovery is disabled', async () => {
      const email = `rollback.${randomUUID()}@example.com`;
      const historical: Array<
        typeof firebaseIdentityReservations.$inferSelect
      > = [];
      for (let attempt = 0; attempt < 2; attempt++) {
        const reservation = await seedRegistrationReservation(db, {
          normalizedEmail: email,
          creationOutcomePending: false,
        });
        expect(
          (
            await postResolve(app, operatorAccessToken, {
              reservationId: reservation.id,
              operatorDecision: `Abandoned attempt ${attempt + 1}`,
            })
          ).status,
        ).toBe(204);
        historical.push(reservation);
      }
      const registered = await postRegister(app, {
        email,
        fullName: 'New Owner',
        ownerAcknowledgement: true,
        password: 'password123',
        workspaceName: 'New Workspace',
      });
      expect(registered.status).toBe(201);
      const beforeReservations = await db
        .select()
        .from(firebaseIdentityReservations)
        .where(eq(firebaseIdentityReservations.normalizedEmail, email));
      const beforeAudits = await db
        .select()
        .from(identityRecoveryAudit)
        .where(eq(identityRecoveryAudit.normalizedEmail, email));
      expect(beforeReservations).toHaveLength(3);
      expect(beforeAudits).toHaveLength(2);
      const config = app.get(ConfigService);
      const previousOperators = config.get('PLATFORM_OPERATOR_USER_IDS');
      config.set('PLATFORM_OPERATOR_USER_IDS', []);
      try {
        expect((await getAssess(app, operatorAccessToken)).status).toBe(403);
        expect(
          (
            await postResolve(app, operatorAccessToken, {
              reservationId: historical[0].id,
              operatorDecision: 'Disabled recovery attempt',
            })
          ).status,
        ).toBe(403);
        const claims = tokens.verifyAccess(String(registered.body.accessToken));
        const relogin = await login(app, `test:${claims.firebaseUid}:${email}`);
        expect(tokens.verifyAccess(relogin.accessToken).sub).toBe(claims.sub);
        expect(
          await db
            .select()
            .from(firebaseIdentityReservations)
            .where(eq(firebaseIdentityReservations.normalizedEmail, email)),
        ).toEqual(beforeReservations);
        expect(
          await db
            .select()
            .from(identityRecoveryAudit)
            .where(eq(identityRecoveryAudit.normalizedEmail, email)),
        ).toEqual(beforeAudits);
      } finally {
        config.set('PLATFORM_OPERATOR_USER_IDS', previousOperators);
      }
    });

    it('retains the reservation and writes no audit when provider absence is uncertain', async () => {
      const seeded = await seedRegistrationReservation(db);
      firebase.setProviderLookupFailure(seeded.firebaseUid, 'timeout');

      const res = await postResolve(app, operatorAccessToken, {
        reservationId: seeded.id,
        operatorDecision: 'provider lookup failed',
      });
      expect(res.status).toBe(503);

      const current = await fetchReservation(db, seeded.id);
      expect(current.state).toBe('reserved');
      expect(await fetchAuditRows(db, seeded.id)).toHaveLength(0);
    });

    it('refuses an adopted identity with 409 and retains the reservation', async () => {
      const seeded = await seedRegistrationReservation(db);
      await db.insert(firebaseSubjectBindings).values({
        firebaseUid: seeded.firebaseUid,
        userId: operatorIdentity,
        providerId: 'google.com',
        verifiedEmail: seeded.normalizedEmail,
      });

      const res = await postResolve(app, operatorAccessToken, {
        reservationId: seeded.id,
        operatorDecision: 'adopted identity attempt',
      });
      expect(res.status).toBe(409);

      const current = await fetchReservation(db, seeded.id);
      expect(current.state).toBe('reserved');
      expect(await fetchAuditRows(db, seeded.id)).toHaveLength(0);
    });

    it('refuses a reservation younger than the age threshold with 409', async () => {
      const seeded = await seedRegistrationReservation(db, {
        createdAt: new Date(),
      });

      const res = await postResolve(app, operatorAccessToken, {
        reservationId: seeded.id,
        operatorDecision: 'recent reservation attempt',
      });
      expect(res.status).toBe(409);

      const current = await fetchReservation(db, seeded.id);
      expect(current.state).toBe('reserved');
    });
  });
});

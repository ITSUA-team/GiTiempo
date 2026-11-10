import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import request from 'supertest';
import { ADMIN_FAKE_TOKEN, bearer, login } from './helpers/auth';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import { firebaseIdentityReservations } from '../src/auth/schemas/firebase-identity-reservations.schema';
import { firebaseSubjectBindings } from '../src/auth/schemas/firebase-subject-bindings.schema';
import { identityRecoveryAudit } from '../src/auth/schemas/identity-recovery-audit.schema';
import { users, workspaceMembers, workspaces } from '../src/db/schema';
import type { FakeFirebaseAdminService } from '../src/auth/services/firebase-admin.fake';
import { FIREBASE_ADMIN } from '../src/auth/services/firebase-admin.interface';
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

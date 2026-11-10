import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { and, eq, inArray, lt, ne, sql } from 'drizzle-orm';
import type { DbTransaction, DrizzleDB } from '../../db/db.types';
import type { users } from '../../users/schemas/users.schema';
import {
  firebaseIdentityReservationRowSelection,
  firebaseIdentityReservations,
  type FirebaseIdentityReservationPurpose,
  type FirebaseIdentityReservationState,
} from '../schemas/firebase-identity-reservations.schema';
import { firebaseSubjectBindings } from '../schemas/firebase-subject-bindings.schema';
import { identityRecoveryAudit } from '../schemas/identity-recovery-audit.schema';
import {
  FirebaseAdminAuthError,
  type FirebaseAdminService,
} from './firebase-admin.interface';
import {
  createIdentityProofRequired,
  createRegistrationConflict,
  createRegistrationUnavailable,
} from './registration-error-factories';

type SelectableDb = Pick<DrizzleDB, 'select'>;
type UserRow = typeof users.$inferSelect;
type ReservationRow = typeof firebaseIdentityReservations.$inferSelect;

/** Redacted, secret-free view of a reservation for observability consumers. */
export interface AgedUnboundRegistrationReservation {
  id: string;
  normalizedEmail: string;
  firebaseUid: string;
  purpose: FirebaseIdentityReservationPurpose;
  state: FirebaseIdentityReservationState;
  createdAt: Date;
  registrationDisplayName: string | null;
  registrationWorkspaceName: string | null;
}

export interface ResolveRegistrationInput {
  reservationId: string;
  operatorDecision: string;
  operatorIdentity: string;
  /** Reservations younger than this are not conclusively abandoned. */
  minAgeMs: number;
}

export interface IdentityReservationUserLookups {
  findUserByEmail(email: string, db?: SelectableDb): Promise<UserRow | null>;
  findUserByFirebaseSubject(
    firebaseUid: string,
    db?: SelectableDb,
  ): Promise<UserRow | null>;
}

/**
 * Owns the `firebase_identity_reservations` lifecycle: reserving identities,
 * advisory lock acquisition, confirmation, rejection, social binding, and
 * guarded registration compensation. Instantiated by `AuthService`, not
 * registered as a Nest provider.
 *
 * Invariants callers rely on:
 * - Locks are acquired via `pg_advisory_xact_lock` with the canonical
 *   `identity:<key>` prefix; callers pass key arrays with `email:` entries
 *   before `uid:` entries and this class deduplicates/sorts them for execution.
 * - Transactions are owned by callers: every method that runs inside a
 *   transaction receives the `tx` handle instead of opening its own.
 */
export class IdentityReservationCoordinator {
  constructor(
    private readonly db: DrizzleDB,
    private readonly firebase: FirebaseAdminService,
    private readonly lookups: IdentityReservationUserLookups,
  ) {}

  async lockIdentityReservationKeys(
    tx: Pick<DrizzleDB, 'execute'>,
    keys: string[],
  ): Promise<void> {
    for (const key of [...new Set(keys)].sort()) {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${`identity:${key}`}))`,
      );
    }
  }

  async reserveFirebaseIdentity(
    email: string,
    purpose: 'github-signin' | 'invitation',
  ): Promise<string> {
    const reservation = await this.reserveIdentity(email, purpose);

    if (reservation.state !== 'bound') {
      try {
        await this.firebase.createUnclaimedUser({
          uid: reservation.firebaseUid,
          email: reservation.normalizedEmail,
        });
      } catch (error) {
        if (
          error instanceof FirebaseAdminAuthError &&
          error.code === 'auth/email-already-exists'
        ) {
          throw createIdentityProofRequired();
        }
        throw createRegistrationUnavailable();
      }
      if (reservation.state === 'reserved') {
        await this.confirmIdentityReservation(reservation.id);
      }
    }
    return reservation.firebaseUid;
  }

  async reserveRegistrationIdentity(input: {
    email: string;
    displayName: string;
    workspaceName: string;
    ownerAcknowledgement: true;
  }): Promise<ReservationRow> {
    return this.db.transaction(async (tx) => {
      await this.lockIdentityReservationKeys(tx, [`email:${input.email}`]);
      if (await this.lookups.findUserByEmail(input.email, tx)) {
        throw createRegistrationConflict('duplicate_email');
      }
      const existing = await this.findReservationByEmail(input.email, tx);
      // A resolved registration is conclusively abandoned: its email is free again.
      if (existing && existing.state !== 'resolved') {
        if (existing.purpose === 'registration') {
          throw createRegistrationUnavailable();
        }
        throw createRegistrationConflict('duplicate_email');
      }
      return (
        await tx
          .insert(firebaseIdentityReservations)
          .values({
            normalizedEmail: input.email,
            firebaseUid: randomUUID(),
            purpose: 'registration',
            registrationDisplayName: input.displayName,
            registrationWorkspaceName: input.workspaceName,
            registrationOwnerAcknowledgement: input.ownerAcknowledgement,
          })
          .returning(firebaseIdentityReservationRowSelection)
      )[0]!;
    });
  }

  async reserveIdentity(
    email: string,
    purpose: 'github-signin' | 'invitation' | 'registration',
  ): Promise<ReservationRow> {
    return this.db.transaction(async (tx) => {
      await this.lockIdentityReservationKeys(tx, [`email:${email}`]);
      return this.reserveIdentityInTransaction(tx, email, purpose);
    });
  }

  async reserveIdentityInTransaction(
    tx: DbTransaction,
    email: string,
    purpose: 'github-signin' | 'invitation' | 'registration',
  ): Promise<ReservationRow> {
    const [existing] = await tx
      .select(firebaseIdentityReservationRowSelection)
      .from(firebaseIdentityReservations)
      .where(
        and(
          sql`lower(btrim(${firebaseIdentityReservations.normalizedEmail})) = ${email}`,
          ne(firebaseIdentityReservations.state, 'resolved'),
        ),
      )
      .limit(1);
    if (existing) {
      if (
        existing.purpose === 'registration' &&
        existing.state !== 'bound' &&
        existing.state !== 'resolved' &&
        purpose !== 'registration'
      ) {
        throw createIdentityProofRequired();
      }
      return existing;
    }

    const firebaseUid = randomUUID();
    return (
      await tx
        .insert(firebaseIdentityReservations)
        .values({ normalizedEmail: email, firebaseUid, purpose })
        .returning()
    )[0]!;
  }

  async findReservationByEmail(
    email: string,
    db: SelectableDb = this.db,
  ): Promise<ReservationRow | null> {
    const [reservation] = await db
      .select(firebaseIdentityReservationRowSelection)
      .from(firebaseIdentityReservations)
      .where(
        and(
          sql`lower(btrim(${firebaseIdentityReservations.normalizedEmail})) = ${email}`,
          ne(firebaseIdentityReservations.state, 'resolved'),
        ),
      )
      .limit(1);
    return reservation ?? null;
  }

  async findReservationByUid(
    firebaseUid: string,
    db: SelectableDb = this.db,
  ): Promise<ReservationRow | null> {
    const [reservation] = await db
      .select(firebaseIdentityReservationRowSelection)
      .from(firebaseIdentityReservations)
      .where(eq(firebaseIdentityReservations.firebaseUid, firebaseUid))
      .limit(1);
    return reservation ?? null;
  }

  async findReservationById(
    id: string,
    db: SelectableDb = this.db,
  ): Promise<ReservationRow | null> {
    const [reservation] = await db
      .select(firebaseIdentityReservationRowSelection)
      .from(firebaseIdentityReservations)
      .where(eq(firebaseIdentityReservations.id, id))
      .limit(1);
    return reservation ?? null;
  }

  /** Read-only observability signal; never mutates reservation state. */
  async findAgedUnboundRegistrationReservations(
    thresholdMs: number,
  ): Promise<AgedUnboundRegistrationReservation[]> {
    const cutoff = new Date(Date.now() - thresholdMs);
    return await this.db
      .select({
        id: firebaseIdentityReservations.id,
        normalizedEmail: firebaseIdentityReservations.normalizedEmail,
        firebaseUid: firebaseIdentityReservations.firebaseUid,
        purpose: firebaseIdentityReservations.purpose,
        state: firebaseIdentityReservations.state,
        createdAt: firebaseIdentityReservations.createdAt,
        registrationDisplayName:
          firebaseIdentityReservations.registrationDisplayName,
        registrationWorkspaceName:
          firebaseIdentityReservations.registrationWorkspaceName,
      })
      .from(firebaseIdentityReservations)
      .where(
        and(
          eq(firebaseIdentityReservations.purpose, 'registration'),
          eq(firebaseIdentityReservations.state, 'reserved'),
          lt(firebaseIdentityReservations.createdAt, cutoff),
        ),
      );
  }

  async confirmIdentityReservation(reservationId: string): Promise<void> {
    await this.db.transaction((tx) =>
      this.confirmIdentityReservationInTransaction(tx, reservationId),
    );
  }

  async confirmIdentityReservationInTransaction(
    tx: Pick<DrizzleDB, 'update'>,
    reservationId: string,
  ): Promise<void> {
    await tx
      .update(firebaseIdentityReservations)
      .set({ state: 'confirmed', updatedAt: new Date() })
      .where(
        and(
          eq(firebaseIdentityReservations.id, reservationId),
          eq(firebaseIdentityReservations.state, 'reserved'),
        ),
      );
  }

  /** A social flow must not adopt an unfinished manual-registration foundation. */
  async rejectPendingRegistrationReservation(
    tx: DbTransaction,
    email: string | null,
  ): Promise<void> {
    if (!email) return;
    const reservation = await this.findReservationByEmail(email, tx);
    if (
      reservation?.purpose === 'registration' &&
      reservation.state !== 'bound' &&
      reservation.state !== 'resolved'
    ) {
      throw createIdentityProofRequired();
    }
  }

  /** Only reservations created for social provisioning may become social bindings. */
  async bindSocialIdentityReservation(
    tx: Pick<DrizzleDB, 'update'>,
    firebaseUid: string,
    userId: string,
  ): Promise<void> {
    await tx
      .update(firebaseIdentityReservations)
      .set({ state: 'bound', userId, updatedAt: new Date() })
      .where(
        and(
          eq(firebaseIdentityReservations.firebaseUid, firebaseUid),
          inArray(firebaseIdentityReservations.purpose, [
            'github-signin',
            'invitation',
          ]),
        ),
      );
  }

  async deleteUnboundRegistrationReservation(reservation: {
    id: string;
    firebaseUid: string;
    normalizedEmail: string;
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.lockIdentityReservationKeys(tx, [
        `email:${reservation.normalizedEmail}`,
        `uid:${reservation.firebaseUid}`,
      ]);
      await tx
        .delete(firebaseIdentityReservations)
        .where(
          and(
            eq(firebaseIdentityReservations.id, reservation.id),
            eq(firebaseIdentityReservations.state, 'reserved'),
          ),
        );
    });
  }

  /**
   * A provider call succeeded but the SQL foundation did not. The Firebase
   * subject may only be deleted while the exact reservation remains unbound
   * and no local canonical or additional binding has adopted it.
   */
  async compensateKnownRegistrationFailure(
    reservation: {
      id: string;
      firebaseUid: string;
      normalizedEmail: string;
    },
    firebaseUid: string,
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      await this.lockIdentityReservationKeys(tx, [
        `email:${reservation.normalizedEmail}`,
        `uid:${firebaseUid}`,
      ]);
      const current = await this.findReservationByUid(firebaseUid, tx);
      if (
        !current ||
        current.id !== reservation.id ||
        current.purpose !== 'registration' ||
        current.state !== 'reserved'
      ) {
        return false;
      }
      if (await this.lookups.findUserByFirebaseSubject(firebaseUid, tx)) {
        return false;
      }
      await this.firebase.deleteUser(firebaseUid);
      await tx
        .delete(firebaseIdentityReservations)
        .where(
          and(
            eq(firebaseIdentityReservations.id, reservation.id),
            eq(firebaseIdentityReservations.state, 'reserved'),
          ),
        );
      return true;
    });
  }

  /**
   * Operator recovery for a conclusively abandoned registration. Reuses the
   * shared identity locks and adoption checks; resolves the reservation and
   * writes the audit row atomically. Never deletes the provider identity and
   * never authorizes arbitrary cleanup: any uncertain outcome stays retained.
   */
  async resolveConclusivelyAbandonedRegistration(
    input: ResolveRegistrationInput,
  ): Promise<void> {
    const candidate = await this.findReservationById(input.reservationId);
    if (!candidate) {
      throw new NotFoundException('Registration reservation not found');
    }
    await this.db.transaction(async (tx) => {
      await this.lockIdentityReservationKeys(tx, [
        `email:${candidate.normalizedEmail}`,
        `uid:${candidate.firebaseUid}`,
      ]);
      const reservation = await this.findReservationById(
        input.reservationId,
        tx,
      );
      if (!reservation) {
        throw new NotFoundException('Registration reservation not found');
      }
      if (
        reservation.purpose !== 'registration' ||
        reservation.state !== 'reserved'
      ) {
        throw new ConflictException(
          'Reservation is not a retained, resolvable registration reservation',
        );
      }
      if (Date.now() - reservation.createdAt.getTime() < input.minAgeMs) {
        throw new ConflictException(
          'Reservation is not old enough to be conclusively abandoned',
        );
      }
      const confirmation = await this.firebase.confirmUidAbsent(
        reservation.firebaseUid,
      );
      if (!confirmation.absent) {
        throw new ServiceUnavailableException(
          'Firebase UID existence is not conclusively confirmed absent',
        );
      }
      if (
        await this.lookups.findUserByFirebaseSubject(
          reservation.firebaseUid,
          tx,
        )
      ) {
        throw new ConflictException(
          'Firebase UID is already adopted by a local account',
        );
      }
      const [binding] = await tx
        .select({ id: firebaseSubjectBindings.id })
        .from(firebaseSubjectBindings)
        .where(eq(firebaseSubjectBindings.firebaseUid, reservation.firebaseUid))
        .limit(1);
      if (binding) {
        throw new ConflictException(
          'Firebase UID is already adopted by a local account',
        );
      }
      await tx
        .update(firebaseIdentityReservations)
        .set({ state: 'resolved', updatedAt: new Date() })
        .where(
          and(
            eq(firebaseIdentityReservations.id, reservation.id),
            eq(firebaseIdentityReservations.state, 'reserved'),
          ),
        );
      await tx.insert(identityRecoveryAudit).values({
        reservationId: reservation.id,
        normalizedEmail: reservation.normalizedEmail,
        firebaseUid: reservation.firebaseUid,
        purpose: reservation.purpose,
        registrationDisplayName: reservation.registrationDisplayName,
        registrationWorkspaceName: reservation.registrationWorkspaceName,
        operatorIdentity: input.operatorIdentity,
        operatorDecision: input.operatorDecision,
        providerAbsenceEvidence: confirmation.evidence,
      });
    });
  }
}

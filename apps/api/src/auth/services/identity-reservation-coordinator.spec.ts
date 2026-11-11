import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { DbTransaction, DrizzleDB } from '../../db/db.types';
import { firebaseIdentityReservations as reservationsTable } from '../schemas/firebase-identity-reservations.schema';
import { firebaseSubjectBindings as bindingsTable } from '../schemas/firebase-subject-bindings.schema';
import { FirebaseAdminAuthError } from './firebase-admin.interface';
import {
  IdentityReservationCoordinator,
  type IdentityReservationUserLookups,
} from './identity-reservation-coordinator';

const pgDialect = new PgDialect();

const reservationRow = {
  id: 'reservation-1',
  firebaseUid: 'uid-1',
  normalizedEmail: 'user@example.com',
  purpose: 'github-signin',
  state: 'reserved',
};

function createSelectMock(queue: unknown[][]) {
  const result = () => ({
    where: vi.fn(() => ({
      limit: vi.fn().mockImplementation(async () => queue.shift() ?? []),
    })),
  });
  return vi.fn(() => ({
    from: vi.fn(() => result()),
  }));
}

/**
 * Lock payloads embed the canonical key as a query parameter:
 * `SELECT pg_advisory_xact_lock(hashtext('identity:<key>'))`.
 */
function lockKeyOf(command: unknown): string | null {
  const chunks = (command as { queryChunks?: unknown[] }).queryChunks ?? [];
  for (const chunk of chunks) {
    if (typeof chunk === 'string') return chunk;
    const { value } = chunk as { value?: unknown };
    if (typeof value === 'string') return value;
  }
  return null;
}

function createInsertMock(returningRow: unknown) {
  return vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn().mockResolvedValue([returningRow]),
    })),
  }));
}

describe('IdentityReservationCoordinator', () => {
  let db: {
    select: ReturnType<typeof createSelectMock>;
    transaction: ReturnType<typeof vi.fn>;
  };
  let firebase: {
    confirmUidAbsent: ReturnType<typeof vi.fn>;
    createUnclaimedUser: ReturnType<typeof vi.fn>;
    deleteUser: ReturnType<typeof vi.fn>;
  };
  let lookups: {
    findUserByEmail: ReturnType<typeof vi.fn>;
    findUserByFirebaseSubject: ReturnType<typeof vi.fn>;
  };
  let coordinator: IdentityReservationCoordinator;

  beforeEach(() => {
    db = {
      select: createSelectMock([]),
      transaction: vi.fn(),
    };
    firebase = {
      confirmUidAbsent: vi
        .fn()
        .mockResolvedValue({ absent: true, evidence: 'auth/user-not-found' }),
      createUnclaimedUser: vi.fn().mockResolvedValue(undefined),
      deleteUser: vi.fn().mockResolvedValue(undefined),
    };
    lookups = {
      findUserByEmail: vi.fn().mockResolvedValue(null),
      findUserByFirebaseSubject: vi.fn().mockResolvedValue(null),
    };
    coordinator = new IdentityReservationCoordinator(
      db as unknown as DrizzleDB,
      firebase as never,
      lookups as unknown as IdentityReservationUserLookups,
    );
  });

  describe('lockIdentityReservationKeys', () => {
    it('executes deduplicated keys in sorted order under the identity prefix', async () => {
      const execute = vi.fn().mockResolvedValue(undefined);
      const tx = { execute } as unknown as Pick<DrizzleDB, 'execute'>;

      await coordinator.lockIdentityReservationKeys(tx, [
        'uid:b',
        'email:a',
        'uid:b',
      ]);

      expect(execute).toHaveBeenCalledTimes(2);
      expect(lockKeyOf(execute.mock.calls[0]![0])).toBe('identity:email:a');
      expect(lockKeyOf(execute.mock.calls[1]![0])).toBe('identity:uid:b');
    });
  });

  describe('reservation lookups', () => {
    it('resolves through the provided transaction, not the default db', async () => {
      const txSelect = createSelectMock([[reservationRow], [reservationRow]]);
      const tx = { select: txSelect } as unknown as Pick<DrizzleDB, 'select'>;

      await expect(
        coordinator.findReservationByEmail('user@example.com', tx),
      ).resolves.toEqual(reservationRow);
      await expect(
        coordinator.findReservationByUid('uid-1', tx),
      ).resolves.toEqual(reservationRow);

      expect(db.select).not.toHaveBeenCalled();
      expect(txSelect).toHaveBeenCalledTimes(2);
    });

    it('falls back to the default db when no handle is passed', async () => {
      db.select = createSelectMock([
        [{ ...reservationRow, state: 'bound' }],
        [],
      ]);

      await expect(
        coordinator.findReservationByUid('uid-1'),
      ).resolves.toMatchObject({ state: 'bound' });
      await expect(
        coordinator.findReservationByUid('uid-2'),
      ).resolves.toBeNull();
      expect(db.select).toHaveBeenCalledTimes(2);
    });
  });

  describe('reserveRegistrationIdentity', () => {
    it('refuses when the email already has a local user', async () => {
      lookups.findUserByEmail.mockResolvedValueOnce({ id: 'user-1' });
      db.transaction.mockImplementation(async (callback) =>
        callback({
          execute: vi.fn().mockResolvedValue(undefined),
        } as never),
      );

      await expect(
        coordinator.reserveRegistrationIdentity({
          email: 'user@example.com',
          displayName: 'User',
          workspaceName: 'Acme',
          ownerAcknowledgement: true,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(lookups.findUserByEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.anything(),
      );
    });

    it.each([{ state: 'reserved' }, { state: 'confirmed' }])(
      'refuses while the registration reservation is $state',
      async ({ state }) => {
        const tx = {
          execute: vi.fn().mockResolvedValue(undefined),
          select: createSelectMock([
            [{ ...reservationRow, purpose: 'registration', state }],
          ]),
        };
        db.transaction.mockImplementation(async (callback) =>
          callback(tx as never),
        );

        await expect(
          coordinator.reserveRegistrationIdentity({
            email: 'user@example.com',
            displayName: 'User',
            workspaceName: 'Acme',
            ownerAcknowledgement: true,
          }),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
      },
    );

    it('allows re-registration after the previous registration is resolved', async () => {
      const insert = createInsertMock({
        ...reservationRow,
        purpose: 'registration',
      });
      const tx = {
        execute: vi.fn().mockResolvedValue(undefined),
        select: createSelectMock([
          [{ ...reservationRow, purpose: 'registration', state: 'resolved' }],
        ]),
        insert,
      };
      db.transaction.mockImplementation(async (callback) =>
        callback(tx as never),
      );

      const created = await coordinator.reserveRegistrationIdentity({
        email: 'user@example.com',
        displayName: 'User',
        workspaceName: 'Acme',
        ownerAcknowledgement: true,
      });

      expect(created).toMatchObject({ purpose: 'registration' });
      expect(insert).toHaveBeenCalledTimes(1);
    });

    it('creates the registration foundation for a free email', async () => {
      const insert = createInsertMock({
        ...reservationRow,
        purpose: 'registration',
      });
      const tx = {
        execute: vi.fn().mockResolvedValue(undefined),
        select: createSelectMock([[]]),
        insert,
      };
      db.transaction.mockImplementation(async (callback) =>
        callback(tx as never),
      );

      const created = await coordinator.reserveRegistrationIdentity({
        email: 'user@example.com',
        displayName: 'User',
        workspaceName: 'Acme',
        ownerAcknowledgement: true,
      });

      expect(created).toMatchObject({ purpose: 'registration' });
      expect(lookups.findUserByEmail).toHaveBeenCalledWith(
        'user@example.com',
        tx,
      );
      expect(insert).toHaveBeenCalledTimes(1);
    });
  });

  describe('reserveIdentityInTransaction', () => {
    it.each([{ state: 'reserved' }, { state: 'confirmed' }])(
      'blocks social flows from adopting a $state registration reservation',
      async ({ state }) => {
        const tx = {
          select: createSelectMock([
            [{ ...reservationRow, purpose: 'registration', state }],
          ]),
        } as unknown as DbTransaction;

        const error = await coordinator
          .reserveIdentityInTransaction(tx, 'user@example.com', 'github-signin')
          .catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as UnauthorizedException).getResponse()).toMatchObject({
          code: 'identity_proof_required',
        });
      },
    );

    it('allows social flows past a resolved registration reservation', async () => {
      const tx = {
        select: createSelectMock([
          [{ ...reservationRow, purpose: 'registration', state: 'resolved' }],
        ]),
      } as unknown as DbTransaction;

      await expect(
        coordinator.reserveIdentityInTransaction(
          tx,
          'user@example.com',
          'github-signin',
        ),
      ).resolves.toMatchObject({ state: 'resolved' });
    });

    it('reuses an existing reservation that is not blocked for the purpose', async () => {
      const tx = {
        select: createSelectMock([
          [{ ...reservationRow, state: 'bound', purpose: 'invitation' }],
        ]),
      } as unknown as DbTransaction;

      await expect(
        coordinator.reserveIdentityInTransaction(
          tx,
          'user@example.com',
          'registration',
        ),
      ).resolves.toMatchObject({ state: 'bound' });
    });

    it('creates a reservation with a fresh random uid', async () => {
      const insert = createInsertMock(reservationRow);
      const tx = {
        select: createSelectMock([[]]),
        insert,
      } as unknown as DbTransaction;

      await expect(
        coordinator.reserveIdentityInTransaction(
          tx,
          'new@example.com',
          'invitation',
        ),
      ).resolves.toEqual(reservationRow);
    });
  });

  describe('reserveFirebaseIdentity', () => {
    it('creates the unclaimed Firebase subject and confirms a fresh reservation', async () => {
      db.select = createSelectMock([[]]);
      db.transaction
        .mockImplementationOnce(async (callback) =>
          callback({
            execute: vi.fn().mockResolvedValue(undefined),
            select: db.select,
            insert: createInsertMock(reservationRow),
          } as never),
        )
        .mockImplementationOnce(async (callback) =>
          callback({
            update: vi.fn(() => ({
              set: vi.fn(() => ({
                where: vi.fn().mockResolvedValue(undefined),
              })),
            })),
          } as never),
        );

      await expect(
        coordinator.reserveFirebaseIdentity('user@example.com', 'invitation'),
      ).resolves.toBe('uid-1');
      expect(firebase.createUnclaimedUser).toHaveBeenCalledWith({
        uid: 'uid-1',
        email: 'user@example.com',
      });
    });

    it('requires identity proof when the provider already holds the email', async () => {
      db.select = createSelectMock([[reservationRow]]);
      db.transaction.mockImplementation(async (callback) =>
        callback({
          execute: vi.fn().mockResolvedValue(undefined),
          select: db.select,
          insert: createInsertMock(reservationRow),
        } as never),
      );
      firebase.createUnclaimedUser.mockRejectedValueOnce(
        new FirebaseAdminAuthError('auth/email-already-exists', 'duplicate'),
      );

      const error = await coordinator
        .reserveFirebaseIdentity('user@example.com', 'invitation')
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toMatchObject({
        code: 'identity_proof_required',
      });
      expect(firebase.deleteUser).not.toHaveBeenCalled();
    });

    it('reports provider unavailability for unexpected failures', async () => {
      db.select = createSelectMock([[reservationRow]]);
      db.transaction.mockImplementation(async (callback) =>
        callback({
          execute: vi.fn().mockResolvedValue(undefined),
          select: db.select,
          insert: createInsertMock(reservationRow),
        } as never),
      );
      firebase.createUnclaimedUser.mockRejectedValueOnce(
        new Error('provider down'),
      );

      await expect(
        coordinator.reserveFirebaseIdentity('user@example.com', 'invitation'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('rejectPendingRegistrationReservation', () => {
    it('is a no-op without a claimed email', async () => {
      const txSelect = createSelectMock([]);
      const tx = { select: txSelect } as unknown as DbTransaction;

      await expect(
        coordinator.rejectPendingRegistrationReservation(tx, null),
      ).resolves.toBeUndefined();
      expect(txSelect).not.toHaveBeenCalled();
    });

    it.each([{ state: 'reserved' }, { state: 'confirmed' }])(
      'blocks social flows while a registration reservation is $state',
      async ({ state }) => {
        const txSelect = createSelectMock([
          [{ ...reservationRow, purpose: 'registration', state }],
        ]);
        const tx = { select: txSelect } as unknown as DbTransaction;

        const error = await coordinator
          .rejectPendingRegistrationReservation(tx, 'user@example.com')
          .catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as UnauthorizedException).getResponse()).toMatchObject({
          code: 'identity_proof_required',
        });
      },
    );

    it('allows social flows past a resolved registration reservation', async () => {
      const txSelect = createSelectMock([
        [{ ...reservationRow, purpose: 'registration', state: 'resolved' }],
      ]);
      const tx = { select: txSelect } as unknown as DbTransaction;

      await expect(
        coordinator.rejectPendingRegistrationReservation(
          tx,
          'user@example.com',
        ),
      ).resolves.toBeUndefined();
    });

    it('allows social flows past bound or non-registration reservations', async () => {
      const txSelect = createSelectMock([
        [{ ...reservationRow, state: 'bound', purpose: 'registration' }],
        [{ ...reservationRow, purpose: 'invitation' }],
      ]);
      const tx = { select: txSelect } as unknown as DbTransaction;

      await expect(
        coordinator.rejectPendingRegistrationReservation(
          tx,
          'user@example.com',
        ),
      ).resolves.toBeUndefined();
      await expect(
        coordinator.rejectPendingRegistrationReservation(
          tx,
          'user@example.com',
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe('commit transitions', () => {
    it('confirms a reservation in place', async () => {
      const set = vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      }));
      const update = vi.fn(() => ({ set }));
      const tx = { update } as unknown as Pick<DrizzleDB, 'update'>;

      await coordinator.confirmIdentityReservationInTransaction(
        tx,
        'reservation-1',
      );

      expect(set).toHaveBeenCalledWith({
        state: 'confirmed',
        updatedAt: expect.any(Date),
      });
    });

    it('binds only the reservation record for the social subject', async () => {
      const set = vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      }));
      const update = vi.fn(() => ({ set }));
      const tx = { update } as unknown as Pick<DrizzleDB, 'update'>;

      await coordinator.bindSocialIdentityReservation(tx, 'uid-1', 'user-1');

      expect(set).toHaveBeenCalledWith({
        state: 'bound',
        userId: 'user-1',
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('compensateKnownRegistrationFailure', () => {
    it('deletes an unbound reservation and the abandoned Firebase subject', async () => {
      const deleteRow = vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      }));
      db.transaction.mockImplementation(async (callback) =>
        callback({
          execute: vi.fn().mockResolvedValue(undefined),
          select: createSelectMock([
            [{ ...reservationRow, purpose: 'registration' }],
          ]),
          delete: deleteRow,
        } as never),
      );

      const compensated = await coordinator.compensateKnownRegistrationFailure(
        {
          id: 'reservation-1',
          firebaseUid: 'uid-1',
          normalizedEmail: 'user@example.com',
        },
        'uid-1',
      );

      expect(compensated).toBe(true);
      expect(firebase.deleteUser).toHaveBeenCalledWith('uid-1');
      expect(lookups.findUserByFirebaseSubject).toHaveBeenCalledWith(
        'uid-1',
        expect.anything(),
      );
      expect(deleteRow).toHaveBeenCalledTimes(1);
    });

    it('refuses to delete when the subject was already adopted', async () => {
      lookups.findUserByFirebaseSubject.mockResolvedValue({ id: 'user-1' });
      db.transaction.mockImplementation(async (callback) =>
        callback({
          execute: vi.fn().mockResolvedValue(undefined),
          select: createSelectMock([
            [{ ...reservationRow, purpose: 'registration' }],
          ]),
          delete: vi.fn(),
        } as never),
      );

      expect(
        await coordinator.compensateKnownRegistrationFailure(
          {
            id: 'reservation-1',
            firebaseUid: 'uid-1',
            normalizedEmail: 'user@example.com',
          },
          'uid-1',
        ),
      ).toBe(false);
      expect(firebase.deleteUser).not.toHaveBeenCalled();
    });
  });

  describe('findAgedUnboundRegistrationReservations', () => {
    it('selects only reserved registration rows older than the threshold and returns the redacted shape', async () => {
      const agedRow = {
        id: 'reservation-aged',
        normalizedEmail: 'aged@example.com',
        firebaseUid: 'uid-aged',
        purpose: 'registration',
        state: 'reserved',
        createdAt: new Date(Date.now() - 48 * 3_600_000),
        registrationDisplayName: 'Aged Owner',
        registrationWorkspaceName: 'Acme',
      };
      let projection: unknown;
      const wheres: unknown[] = [];
      db.select = vi.fn((fields: unknown) => {
        projection = fields;
        return {
          from: vi.fn(() => ({
            where: vi.fn((where: unknown) => {
              wheres.push(where);
              return Promise.resolve([agedRow]);
            }),
          })),
        };
      }) as unknown as typeof db.select;

      const aged = await coordinator.findAgedUnboundRegistrationReservations(
        24 * 3_600_000,
      );

      expect(aged).toEqual([agedRow]);
      expect(Object.keys(projection as Record<string, unknown>).sort()).toEqual(
        [
          'createdAt',
          'firebaseUid',
          'id',
          'normalizedEmail',
          'purpose',
          'registrationDisplayName',
          'registrationWorkspaceName',
          'state',
        ],
      );
      const rendered = pgDialect.sqlToQuery(wheres[0] as SQL);
      expect(rendered.params[0]).toBe('registration');
      expect(rendered.params[1]).toBe('reserved');
      const cutoffMs = new Date(rendered.params[2] as string).getTime();
      expect(Math.abs(cutoffMs - (Date.now() - 24 * 3_600_000))).toBeLessThan(
        5_000,
      );
      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  describe('resolveConclusivelyAbandonedRegistration', () => {
    const abandonedRow = {
      creationOutcomePending: false,
      id: 'reservation-1',
      firebaseUid: 'uid-1',
      normalizedEmail: 'user@example.com',
      purpose: 'registration',
      state: 'reserved',
      registrationDisplayName: 'User',
      registrationWorkspaceName: 'Acme',
      createdAt: new Date(Date.now() - 48 * 3_600_000),
    };

    interface RecoveryHarness {
      attemptedUpdates: unknown[];
      attemptedAuditValues: unknown[];
      committedUpdates: unknown[];
      committedAuditValues: unknown[];
      updateWheres: unknown[];
      lockKeys: (string | null)[];
      deleteCount(): number;
      isCommitted(): boolean;
    }

    /** Models a Postgres transaction: tx-local writes only persist on commit. */
    function stubRecoveryDb(options: {
      reservationRows?: unknown[][];
      bindingRows?: unknown[][];
      failAuditInsert?: boolean;
    }): RecoveryHarness {
      const attemptedUpdates: unknown[] = [];
      const attemptedAuditValues: unknown[] = [];
      const committedUpdates: unknown[] = [];
      const committedAuditValues: unknown[] = [];
      const updateWheres: unknown[] = [];
      const lockKeys: (string | null)[] = [];
      let deleteCalls = 0;
      let committed = false;

      db.transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const reservationQueue = [...(options.reservationRows ?? [])];
          const bindingQueue = [...(options.bindingRows ?? [])];
          const updateSets: unknown[] = [];
          const auditValues: unknown[] = [];
          await callback({
            execute: vi.fn(async (command: unknown) => {
              lockKeys.push(lockKeyOf(command));
            }),
            select: vi.fn(() => ({
              from: vi.fn((table: unknown) => {
                if (table === reservationsTable) {
                  return {
                    where: () => ({
                      limit: async () => reservationQueue.shift() ?? [],
                    }),
                  };
                }
                if (table === bindingsTable) {
                  return {
                    where: () => ({
                      limit: async () => bindingQueue.shift() ?? [],
                    }),
                  };
                }
                throw new Error(
                  `Unexpected table in recovery transaction: ${String(table)}`,
                );
              }),
            })),
            update: vi.fn(() => ({
              set: vi.fn((set: unknown) => ({
                where: vi.fn(async (where: unknown) => {
                  updateWheres.push(where);
                  attemptedUpdates.push(set);
                  updateSets.push(set);
                }),
              })),
            })),
            insert: vi.fn(() => ({
              values: vi.fn(async (values: unknown) => {
                attemptedAuditValues.push(values);
                auditValues.push(values);
                if (options.failAuditInsert) {
                  throw new Error('audit insert failed');
                }
              }),
            })),
            delete: vi.fn(() => {
              deleteCalls++;
              return { where: vi.fn(async () => undefined) };
            }),
          });
          committed = true;
          committedUpdates.push(...updateSets);
          committedAuditValues.push(...auditValues);
        },
      );

      return {
        attemptedUpdates,
        attemptedAuditValues,
        committedUpdates,
        committedAuditValues,
        updateWheres,
        lockKeys,
        deleteCount: () => deleteCalls,
        isCommitted: () => committed,
      };
    }

    function resolveInput() {
      return {
        reservationId: 'reservation-1',
        operatorDecision: 'resolve-abandoned',
        operatorIdentity: 'ops@example.com',
        minAgeMs: 24 * 3_600_000,
      };
    }

    it('resolves under email-then-uid locks and commits the audit atomically', async () => {
      db.select = createSelectMock([[abandonedRow]]);
      firebase.confirmUidAbsent.mockResolvedValue({
        absent: true,
        evidence: 'auth/user-not-found',
      });
      const harness = stubRecoveryDb({
        reservationRows: [[abandonedRow]],
        bindingRows: [[]],
      });

      await coordinator.resolveConclusivelyAbandonedRegistration(
        resolveInput(),
      );

      expect(harness.lockKeys).toEqual([
        'identity:email:user@example.com',
        'identity:uid:uid-1',
      ]);
      expect(harness.isCommitted()).toBe(true);
      expect(harness.attemptedUpdates).toEqual([
        { state: 'resolved', updatedAt: expect.any(Date) },
      ]);
      const rendered = pgDialect.sqlToQuery(harness.updateWheres[0] as SQL);
      expect(rendered.sql).toContain('"id" = $1');
      expect(rendered.params).toEqual(['reservation-1', 'reserved']);
      expect(harness.committedAuditValues).toEqual([
        {
          reservationId: 'reservation-1',
          normalizedEmail: 'user@example.com',
          firebaseUid: 'uid-1',
          purpose: 'registration',
          registrationDisplayName: 'User',
          registrationWorkspaceName: 'Acme',
          operatorIdentity: 'ops@example.com',
          operatorDecision: 'resolve-abandoned',
          providerAbsenceEvidence: 'auth/user-not-found',
        },
      ]);
      expect(
        Object.keys(harness.committedAuditValues[0] as object).sort(),
      ).toEqual([
        'firebaseUid',
        'normalizedEmail',
        'operatorDecision',
        'operatorIdentity',
        'providerAbsenceEvidence',
        'purpose',
        'registrationDisplayName',
        'registrationOwnerAcknowledgement',
        'registrationWorkspaceName',
        'reservationId',
      ]);
      expect(harness.deleteCount()).toBe(0);
      expect(firebase.confirmUidAbsent).toHaveBeenCalledWith('uid-1');
      expect(firebase.deleteUser).not.toHaveBeenCalled();
    });

    it.each([
      {
        label: 'the provider user exists after a lost response',
        confirmation: { absent: false, evidence: 'user-present' },
      },
      {
        label: 'the provider lookup is uncertain',
        confirmation: {
          absent: false,
          evidence: 'provider-lookup-failed:timeout',
        },
      },
    ])('retains the reservation when $label', async ({ confirmation }) => {
      db.select = createSelectMock([[abandonedRow]]);
      firebase.confirmUidAbsent.mockResolvedValue(confirmation);
      const harness = stubRecoveryDb({
        reservationRows: [[abandonedRow]],
        bindingRows: [[]],
      });

      await expect(
        coordinator.resolveConclusivelyAbandonedRegistration(resolveInput()),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(harness.isCommitted()).toBe(false);
      expect(harness.attemptedUpdates).toEqual([]);
      expect(harness.attemptedAuditValues).toEqual([]);
      expect(harness.deleteCount()).toBe(0);
    });

    it('retains the reservation when the provider absence check fails outright', async () => {
      db.select = createSelectMock([[abandonedRow]]);
      firebase.confirmUidAbsent.mockRejectedValue(
        new Error('network unreachable'),
      );
      const harness = stubRecoveryDb({
        reservationRows: [[abandonedRow]],
        bindingRows: [[]],
      });

      await expect(
        coordinator.resolveConclusivelyAbandonedRegistration(resolveInput()),
      ).rejects.toBeInstanceOf(Error);
      expect(harness.isCommitted()).toBe(false);
      expect(harness.attemptedUpdates).toEqual([]);
      expect(harness.attemptedAuditValues).toEqual([]);
      expect(harness.deleteCount()).toBe(0);
    });

    it('refuses to resolve when the uid was adopted by a committed local account', async () => {
      db.select = createSelectMock([[abandonedRow]]);
      lookups.findUserByFirebaseSubject.mockResolvedValue({ id: 'user-1' });
      firebase.confirmUidAbsent.mockResolvedValue({
        absent: false,
        evidence: 'user-present',
      });
      const harness = stubRecoveryDb({
        reservationRows: [[abandonedRow]],
        bindingRows: [[]],
      });

      await expect(
        coordinator.resolveConclusivelyAbandonedRegistration(resolveInput()),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(harness.isCommitted()).toBe(false);
      expect(harness.attemptedUpdates).toEqual([]);
      expect(harness.attemptedAuditValues).toEqual([]);
      expect(firebase.confirmUidAbsent).not.toHaveBeenCalled();
    });

    it('refuses to resolve when a social subject binding already exists', async () => {
      db.select = createSelectMock([[abandonedRow]]);
      firebase.confirmUidAbsent.mockResolvedValue({
        absent: false,
        evidence: 'user-present',
      });
      const harness = stubRecoveryDb({
        reservationRows: [[abandonedRow]],
        bindingRows: [[{ id: 'binding-1' }]],
      });

      await expect(
        coordinator.resolveConclusivelyAbandonedRegistration(resolveInput()),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(harness.isCommitted()).toBe(false);
      expect(harness.attemptedUpdates).toEqual([]);
      expect(harness.attemptedAuditValues).toEqual([]);
      expect(firebase.confirmUidAbsent).not.toHaveBeenCalled();
    });

    it('refuses to resolve a reservation that is no longer retained', async () => {
      db.select = createSelectMock([[abandonedRow]]);
      const harness = stubRecoveryDb({
        reservationRows: [[{ ...abandonedRow, state: 'bound' }]],
        bindingRows: [[]],
      });

      await expect(
        coordinator.resolveConclusivelyAbandonedRegistration(resolveInput()),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(harness.isCommitted()).toBe(false);
      expect(harness.attemptedUpdates).toEqual([]);
    });

    it.each([true, null, undefined])(
      'retains uncertain creation outcome %s',
      async (pending) => {
        db.select = createSelectMock([[abandonedRow]]);
        firebase.confirmUidAbsent.mockResolvedValue({
          absent: true,
          evidence: 'auth/user-not-found',
        });
        const harness = stubRecoveryDb({
          reservationRows: [
            [{ ...abandonedRow, creationOutcomePending: pending }],
          ],
          bindingRows: [[]],
        });

        await expect(
          coordinator.resolveConclusivelyAbandonedRegistration(resolveInput()),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
        expect(harness.isCommitted()).toBe(false);
        expect(harness.attemptedUpdates).toEqual([]);
        expect(harness.attemptedAuditValues).toEqual([]);
        expect(firebase.confirmUidAbsent).not.toHaveBeenCalled();
      },
    );

    it('keeps the reservation reserved when the audit write fails', async () => {
      db.select = createSelectMock([[abandonedRow]]);
      const harness = stubRecoveryDb({
        reservationRows: [[abandonedRow]],
        bindingRows: [[]],
        failAuditInsert: true,
      });

      await expect(
        coordinator.resolveConclusivelyAbandonedRegistration(resolveInput()),
      ).rejects.toThrow('audit insert failed');
      expect(harness.isCommitted()).toBe(false);
      expect(harness.committedUpdates).toEqual([]);
      expect(harness.committedAuditValues).toEqual([]);
    });

    it('fails before locking when the reservation does not exist', async () => {
      db.select = createSelectMock([[]]);

      await expect(
        coordinator.resolveConclusivelyAbandonedRegistration({
          reservationId: 'missing',
          operatorDecision: 'resolve-abandoned',
          operatorIdentity: 'ops@example.com',
          minAgeMs: 24 * 3_600_000,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('refuses to resolve a reservation that is not old enough', async () => {
      const youngRow = {
        ...abandonedRow,
        id: 'reservation-young',
        createdAt: new Date(Date.now() - 60_000),
      };
      db.select = createSelectMock([[youngRow]]);
      firebase.confirmUidAbsent.mockResolvedValue({
        absent: true,
        evidence: 'auth/user-not-found',
      });
      const harness = stubRecoveryDb({
        reservationRows: [[youngRow]],
        bindingRows: [[]],
      });

      await expect(
        coordinator.resolveConclusivelyAbandonedRegistration({
          ...resolveInput(),
          reservationId: 'reservation-young',
        }),
      ).rejects.toThrow('not old enough');
      expect(harness.isCommitted()).toBe(false);
      expect(harness.committedUpdates).toEqual([]);
      expect(harness.committedAuditValues).toEqual([]);
    });
  });
});

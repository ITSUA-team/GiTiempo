import {
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RegisterRequest } from '@gitiempo/shared';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { FirebaseAdminAuthError } from './firebase-admin.interface';
import { IdentityReservationCoordinator } from './identity-reservation-coordinator';
import {
  firebaseIdentityReservations as reservationsTable,
  firebaseSubjectBindings as bindingsTable,
  users as usersTable,
  workspaceMembers,
  workspaceSettings,
  workspaces,
} from '../../db/schema';

const envMap: Record<string, string> = {
  JWT_ACCESS_SECRET: 'x'.repeat(40),
  JWT_REFRESH_SECRET: 'y'.repeat(40),
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '7d',
  JWT_ISSUER: 'gitiempo-api',
  JWT_AUDIENCE: 'gitiempo-clients',
  AUTH_AGED_RESERVATION_THRESHOLD: '24h',
};

const fakeConfig = {
  get: (key: string) => envMap[key],
} as unknown as ConfigService;

const seedUserRow = {
  id: '11111111-1111-1111-1111-111111111111',
  firebaseUid: 'admin-uid',
  email: 'admin@example.com',
  displayName: 'Admin',
  avatarUrl: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const seedMembership = {
  id: '22222222-2222-2222-2222-222222222222',
  userId: seedUserRow.id,
  workspaceId: '33333333-3333-3333-3333-333333333333',
  role: 'admin' as const,
};

const registerInput: RegisterRequest = {
  email: 'owner@example.com',
  fullName: 'Owner Person',
  ownerAcknowledgement: true,
  password: 'password123',
  workspaceName: 'Acme Studio',
};

function createActiveRefreshTokenRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'refresh-row',
    userId: seedUserRow.id,
    workspaceMemberId: seedMembership.id,
    workspaceId: seedMembership.workspaceId,
    familyId: 'refresh-family',
    tokenHash: 'refresh-token-hash',
    replacedBy: null,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    ...overrides,
  };
}

function createSelectMock(queue: unknown[][]) {
  const consume = () => queue.shift() ?? [];
  const result = () => ({
    where: vi.fn(() => ({
      orderBy: vi.fn(() => ({
        limit: vi.fn().mockImplementation(async () => consume()),
        then: (
          resolve: (rows: unknown[]) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(consume()).then(resolve, reject),
      })),
      limit: vi.fn().mockImplementation(async () => consume()),
      then: (
        resolve: (rows: unknown[]) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => Promise.resolve(consume()).then(resolve, reject),
    })),
  });
  return vi.fn(() => ({
    from: vi.fn(() => ({
      ...result(),
      innerJoin: vi.fn(() => result()),
    })),
  }));
}

interface RecordedInsert {
  table: unknown;
  values: unknown;
}

function createTransactionInsertMock(
  returningQueue: unknown[] = [],
  recordedInserts: RecordedInsert[] = [],
) {
  return vi.fn((table: unknown) => ({
    values: vi.fn((values: unknown) => {
      recordedInserts.push({ table, values });
      return {
        returning: vi.fn().mockImplementation(async () => {
          const result = returningQueue.shift() ?? [];
          if (!Array.isArray(result)) throw result;
          return result;
        }),
        onConflictDoNothing: vi.fn(async () => undefined),
      };
    }),
  }));
}

interface RecordedUpdate {
  table: unknown;
  values: unknown;
}

function createTransactionUpdateMock(
  recordedUpdates: RecordedUpdate[] = [],
  returningQueue: unknown[][] = [],
) {
  return vi.fn((table: unknown) => ({
    set: vi.fn((values: unknown) => {
      recordedUpdates.push({ table, values });
      return {
        where: vi.fn(() => ({
          returning: vi
            .fn()
            .mockImplementation(async () => returningQueue.shift() ?? []),
        })),
      };
    }),
  }));
}

describe('AuthService', () => {
  let service: AuthService;
  let tokens: TokenService;
  let db: {
    select: ReturnType<typeof createSelectMock>;
    transaction: ReturnType<typeof vi.fn>;
  };
  let firebase: {
    verifyIdToken: ReturnType<typeof vi.fn>;
    assertActiveUserByUid: ReturnType<typeof vi.fn>;
    createEmailPasswordUser: ReturnType<typeof vi.fn>;
    createUnclaimedUser: ReturnType<typeof vi.fn>;
    getUserByUid: ReturnType<typeof vi.fn>;
    deleteUser: ReturnType<typeof vi.fn>;
    confirmUidAbsent: ReturnType<typeof vi.fn>;
  };
  let repo: {
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByHashIncludingRevoked: ReturnType<typeof vi.fn>;
    rotateIfActive: ReturnType<typeof vi.fn>;
    deleteFamily: ReturnType<typeof vi.fn>;
    deleteById: ReturnType<typeof vi.fn>;
  };
  let users: {
    findRowByFirebaseUid: ReturnType<typeof vi.fn>;
    updateFromFirebase: ReturnType<typeof vi.fn>;
    findRowById: ReturnType<typeof vi.fn>;
  };
  let members: {
    requireActiveMembershipById: ReturnType<typeof vi.fn>;
    requireActiveMembershipForUser: ReturnType<typeof vi.fn>;
    requireActiveMembership: ReturnType<typeof vi.fn>;
    resolveActiveMembership: ReturnType<typeof vi.fn>;
    resolveActiveMembershipForUser: ReturnType<typeof vi.fn>;
  };
  let githubAccounts: {
    invalidatePendingAuthorizations: ReturnType<typeof vi.fn>;
  };
  let googleIdTokens: { verify: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    tokens = new TokenService(fakeConfig as never);
    let transactionCount = 0;
    db = {
      select: createSelectMock([]),
      transaction: vi.fn(async (callback) => {
        const isReservationTransaction = transactionCount++ === 0;
        return callback({
          execute: vi.fn().mockResolvedValue(undefined),
          select: createSelectMock(
            isReservationTransaction
              ? [[], []]
              : [
                  [
                    {
                      id: 'reservation-1',
                      firebaseUid: 'firebase-register-1',
                      normalizedEmail: 'owner@example.com',
                      purpose: 'registration',
                      state: 'reserved',
                    },
                  ],
                  [],
                ],
          ),
          insert: vi.fn(() => ({
            values: vi.fn(() => ({
              returning: vi.fn().mockResolvedValue([
                {
                  id: 'reservation-1',
                  firebaseUid: 'firebase-register-1',
                  normalizedEmail: 'owner@example.com',
                  state: 'reserved',
                },
              ]),
            })),
          })),
          update: vi.fn(() => ({
            set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
          })),
          delete: vi.fn(() => ({
            where: vi.fn().mockResolvedValue(undefined),
          })),
        });
      }),
    };
    firebase = {
      verifyIdToken: vi.fn(),
      assertActiveUserByUid: vi.fn().mockResolvedValue(undefined),
      createEmailPasswordUser: vi.fn(),
      createUnclaimedUser: vi.fn().mockResolvedValue(undefined),
      getUserByUid: vi.fn(),
      deleteUser: vi.fn().mockResolvedValue(undefined),
      confirmUidAbsent: vi
        .fn()
        .mockResolvedValue({ absent: true, evidence: 'auth/user-not-found' }),
    };
    repo = {
      create: vi.fn(async (input) => ({
        id: 'rt-' + Math.random().toString(16).slice(2, 10),
        userId: input.userId,
        workspaceMemberId: input.workspaceMemberId,
        workspaceId: input.workspaceId,
        familyId: input.familyId,
        tokenHash: input.tokenHash,
        replacedBy: null,
        revokedAt: null,
        expiresAt: input.expiresAt,
        createdAt: new Date(),
      })),
      findById: vi.fn(),
      findByHashIncludingRevoked: vi.fn(),
      rotateIfActive: vi.fn(
        async (_oldId: string, input: Record<string, unknown>) => ({
          newRow: {
            id: 'rt-' + Math.random().toString(16).slice(2, 10),
            userId: input.userId,
            workspaceMemberId: input.workspaceMemberId,
            workspaceId: input.workspaceId,
            familyId: input.familyId,
            tokenHash: input.tokenHash,
            replacedBy: null,
            revokedAt: null,
            expiresAt: input.expiresAt,
            createdAt: new Date(),
          },
        }),
      ),
      deleteFamily: vi.fn().mockResolvedValue(undefined),
      deleteById: vi.fn().mockResolvedValue(undefined),
    };
    users = {
      findRowByFirebaseUid: vi.fn().mockResolvedValue(seedUserRow),
      updateFromFirebase: vi.fn().mockResolvedValue(seedUserRow),
      findRowById: vi.fn().mockResolvedValue(seedUserRow),
    };
    members = {
      requireActiveMembershipById: vi.fn().mockResolvedValue(seedMembership),
      requireActiveMembershipForUser: vi.fn().mockResolvedValue(seedMembership),
      requireActiveMembership: vi.fn().mockResolvedValue(seedMembership),
      resolveActiveMembership: vi.fn().mockResolvedValue(seedMembership),
      resolveActiveMembershipForUser: vi.fn().mockResolvedValue(seedMembership),
    };
    githubAccounts = {
      invalidatePendingAuthorizations: vi.fn().mockResolvedValue(undefined),
    };
    googleIdTokens = { verify: vi.fn() };

    service = new AuthService(
      fakeConfig as never,
      db as never,
      firebase as never,
      tokens,
      repo as never,
      users as never,
      members as never,
      githubAccounts as never,
      googleIdTokens as never,
    );
  });

  describe('login', () => {
    it('rejects a Google proof whose subject is absent from the signed Firebase identities before DB work', async () => {
      firebase.verifyIdToken.mockResolvedValueOnce({
        uid: 'google-uid',
        signInProvider: 'google.com',
        email_verified: false,
        googleSubjects: ['different-subject'],
      });
      googleIdTokens.verify.mockResolvedValueOnce({
        email: 'owner@example.com',
        subject: 'google-subject',
      });

      await expect(
        service.login('test:google-uid:owner@example.com', 'proof'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(firebase.assertActiveUserByUid).not.toHaveBeenCalled();
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('rejects an ambiguous signed Google subject list before DB work', async () => {
      firebase.verifyIdToken.mockResolvedValueOnce({
        uid: 'google-uid',
        signInProvider: 'google.com',
        email_verified: false,
        googleSubjects: ['google-subject', 'another-subject'],
      });
      googleIdTokens.verify.mockResolvedValueOnce({
        email: 'owner@example.com',
        subject: 'google-subject',
      });

      await expect(
        service.login('test:google-uid:owner@example.com', 'proof'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(firebase.assertActiveUserByUid).not.toHaveBeenCalled();
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('passes paired Google proof to pending-registration recovery before social provisioning', async () => {
      const recovered = {
        accessToken: 'access',
        refreshToken: 'refresh',
        accessTokenExpiresIn: 60,
      };
      firebase.verifyIdToken.mockResolvedValueOnce({
        uid: 'registration-uid',
        signInProvider: 'google.com',
        email_verified: false,
        googleSubjects: ['google-subject'],
      });
      googleIdTokens.verify.mockResolvedValueOnce({
        email: 'owner@example.com',
        subject: 'google-subject',
      });
      const recovery = vi
        .spyOn(
          service as unknown as {
            recoverPendingRegistration(
              decoded: Record<string, unknown>,
              googleSubject?: string,
            ): Promise<typeof recovered | null>;
          },
          'recoverPendingRegistration',
        )
        .mockResolvedValueOnce(recovered);

      await expect(
        service.login('firebase-token', 'google-proof'),
      ).resolves.toBe(recovered);

      expect(recovery).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'registration-uid',
          email: 'owner@example.com',
          email_verified: true,
        }),
        'google-subject',
      );
    });

    it('verifies Firebase, resolves membership, and issues a token pair', async () => {
      firebase.verifyIdToken.mockResolvedValueOnce({
        uid: 'admin-uid',
        email: 'admin@example.com',
      });

      const pair = await service.login('test:admin-uid:admin@example.com');

      expect(users.findRowByFirebaseUid).toHaveBeenCalledWith('admin-uid');
      expect(members.requireActiveMembershipForUser).toHaveBeenCalledWith(
        seedUserRow.id,
      );
      expect(users.updateFromFirebase).toHaveBeenCalledWith(seedUserRow.id, {
        firebaseUid: 'admin-uid',
        email: 'admin@example.com',
        displayName: null,
        avatarUrl: null,
      });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: seedMembership.workspaceId,
        }),
        undefined,
      );
      expect(repo.create).toHaveBeenCalledOnce();
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: seedUserRow.id,
          workspaceMemberId: seedMembership.id,
          workspaceId: seedMembership.workspaceId,
        }),
        undefined,
      );
      expect(pair.accessToken).toMatch(/^eyJ/);
      expect(pair.refreshToken.length).toBeGreaterThan(20);
      expect(pair.accessTokenExpiresIn).toBe(15 * 60);

      const payload = tokens.verifyAccess(pair.accessToken);
      expect(payload.sub).toBe(seedUserRow.id);
      expect(payload.firebaseUid).toBe('admin-uid');
      expect(payload.workspaceId).toBe(seedMembership.workspaceId);
      expect(payload.role).toBe(seedMembership.role);
    });

    it('rejects Firebase users without local membership', async () => {
      firebase.verifyIdToken.mockResolvedValueOnce({
        uid: 'outside',
        email: 'outside@example.com',
      });
      users.findRowByFirebaseUid.mockResolvedValueOnce(null);

      await expect(
        service.login('test:outside:outside@example.com'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('rejects invalid Firebase tokens with 401', async () => {
      firebase.verifyIdToken.mockRejectedValueOnce(
        new UnauthorizedException('Unauthorized'),
      );

      await expect(service.login('not-a-test-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(users.findRowByFirebaseUid).not.toHaveBeenCalled();
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('resolveActiveMemberIdsByEmails', () => {
    it('resolves every address, not only the first one that matches', async () => {
      db.select = createSelectMock([
        [{ id: seedUserRow.id }, { id: 'user-2' }],
      ]);

      await expect(
        service.resolveActiveMemberIdsByEmails([
          'personal@example.com',
          'admin@example.com',
        ]),
      ).resolves.toEqual([seedUserRow.id, 'user-2']);
    });

    it('drops a matched user that has no active membership', async () => {
      db.select = createSelectMock([
        [{ id: seedUserRow.id }, { id: 'user-2' }],
      ]);
      members.resolveActiveMembershipForUser
        .mockResolvedValueOnce(seedMembership)
        .mockResolvedValueOnce(null);

      await expect(
        service.resolveActiveMemberIdsByEmails([
          'admin@example.com',
          'former@example.com',
        ]),
      ).resolves.toEqual([seedUserRow.id]);
    });

    it('normalises and de-duplicates before querying', async () => {
      const select = createSelectMock([[{ id: seedUserRow.id }]]);
      db.select = select;

      await service.resolveActiveMemberIdsByEmails([
        ' Admin@Example.com ',
        'admin@example.com',
      ]);

      expect(select).toHaveBeenCalledTimes(1);
    });

    it('returns nothing without querying when no addresses are supplied', async () => {
      const select = createSelectMock([]);
      db.select = select;

      await expect(service.resolveActiveMemberIdsByEmails([])).resolves.toEqual(
        [],
      );
      expect(select).not.toHaveBeenCalled();
    });
  });

  /** Three transactions: reservation, confirmation, and the session commit. */
  function setupNewUserSocialProvision() {
    const socialReservationRow = {
      id: 'reservation-social-1',
      firebaseUid: 'uid-social-1',
      normalizedEmail: 'octo@example.com',
      purpose: 'github-signin',
      state: 'reserved',
    };
    const userRow = {
      id: 'user-social-1',
      firebaseUid: 'uid-social-1',
      email: 'octo@example.com',
      displayName: 'octocat',
      avatarUrl: 'https://avatars/123.png',
    };
    const workspaceRow = { id: 'workspace-social-1', name: 'Workspace' };
    const membershipRow = {
      id: 'membership-social-1',
      userId: 'user-social-1',
      workspaceId: 'workspace-social-1',
      role: 'admin',
    };
    const recordedInserts: RecordedInsert[] = [];
    const reserveTx = {
      execute: vi.fn().mockResolvedValue(undefined),
      select: createSelectMock([[]]),
      insert: createTransactionInsertMock(
        [[socialReservationRow]],
        recordedInserts,
      ),
    };
    const confirmTx = {
      execute: vi.fn().mockResolvedValue(undefined),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      })),
    };
    const tx = {
      execute: vi.fn().mockResolvedValue(undefined),
      select: createSelectMock([[], [], [], []]),
      insert: createTransactionInsertMock(
        [[userRow], [workspaceRow], [membershipRow]],
        recordedInserts,
      ),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      })),
      delete: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    };
    const transactions = [reserveTx, confirmTx, tx];
    db.select = createSelectMock([[], [], []]);
    db.transaction.mockImplementation(async (callback) =>
      callback(transactions.shift()!),
    );
    members.resolveActiveMembershipForUser.mockResolvedValueOnce(null);
    return { tx, recordedInserts, userRow, workspaceRow, membershipRow };
  }

  /** Register transactions: reservation, then the Firebase + session commit. */
  function setupRegisterHappyPath() {
    const reservationRow = {
      id: 'reservation-1',
      firebaseUid: 'firebase-register-1',
      normalizedEmail: 'owner@example.com',
      purpose: 'registration',
      state: 'reserved',
    };
    db.select = createSelectMock([[]]);
    const recordedInserts: RecordedInsert[] = [];
    const tx = {
      execute: vi.fn().mockResolvedValue(undefined),
      select: createSelectMock([[], [], [reservationRow], []]),
      insert: createTransactionInsertMock(
        [
          [reservationRow],
          [
            {
              id: 'user-register-1',
              firebaseUid: 'firebase-register-1',
              email: 'owner@example.com',
            },
          ],
          [
            {
              id: 'workspace-register-1',
              name: 'Acme Studio',
            },
          ],
          [
            {
              id: 'membership-register-1',
              role: 'admin',
              userId: 'user-register-1',
              workspaceId: 'workspace-register-1',
            },
          ],
        ],
        recordedInserts,
      ),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      })),
      delete: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    };
    db.transaction.mockImplementation(async (callback) => callback(tx));
    firebase.createEmailPasswordUser.mockResolvedValueOnce({
      uid: 'firebase-register-1',
      email: 'owner@example.com',
      displayName: 'Owner Person',
    });
    return { tx, recordedInserts };
  }

  describe('provisionSocialSession', () => {
    /** Single session transaction against an existing email-matched user. */
    function setupExistingUserSocialProvision(
      avatarSource: 'provider' | 'user',
    ) {
      const existingRow = {
        id: 'user-existing-1',
        firebaseUid: 'uid-existing-1',
        email: 'known@example.com',
        displayName: 'Old Name',
        avatarUrl: 'https://old/avatar.png',
        avatarSource,
      };
      const membershipRow = {
        id: 'membership-existing-1',
        workspaceId: 'workspace-existing-1',
        role: 'admin',
      };
      const recordedInserts: RecordedInsert[] = [];
      const recordedUpdates: RecordedUpdate[] = [];
      users.findRowById.mockResolvedValue(existingRow);
      const tx = {
        execute: vi.fn().mockResolvedValue(undefined),
        select: createSelectMock([
          [existingRow],
          [existingRow],
          [],
          [existingRow],
          [membershipRow],
        ]),
        insert: createTransactionInsertMock([], recordedInserts),
        update: createTransactionUpdateMock(recordedUpdates, [[existingRow]]),
      };
      db.select = createSelectMock([[existingRow]]);
      db.transaction.mockImplementation(async (callback) => callback(tx));
      firebase.getUserByUid.mockResolvedValue({
        disabled: false,
        emailVerified: true,
        email: 'known@example.com',
      });
      return { recordedInserts, recordedUpdates };
    }

    it('normalizes GitHub name/picture aliases into a new user profile', async () => {
      const { tx, recordedInserts } = setupNewUserSocialProvision();

      const pair = await service.provisionSocialSession({
        provider: 'github',
        email: 'octo@example.com',
        name: 'octocat',
        picture: 'https://avatars/123.png',
      });

      expect(firebase.createUnclaimedUser).toHaveBeenCalledWith({
        uid: 'uid-social-1',
        email: 'octo@example.com',
      });
      expect(firebase.assertActiveUserByUid).toHaveBeenCalledWith(
        'uid-social-1',
        'octo@example.com',
        undefined,
      );
      expect(recordedInserts.map(({ table }) => table)).toEqual([
        reservationsTable,
        usersTable,
        bindingsTable,
        workspaces,
        workspaceSettings,
        workspaceMembers,
      ]);
      expect(recordedInserts[1]?.values).toMatchObject({
        email: 'octo@example.com',
        firebaseUid: 'uid-social-1',
        displayName: 'octocat',
        avatarUrl: 'https://avatars/123.png',
      });
      expect(recordedInserts[2]?.values).toMatchObject({
        firebaseUid: 'uid-social-1',
        userId: 'user-social-1',
        providerId: 'github',
        verifiedEmail: 'octo@example.com',
      });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-social-1',
          workspaceMemberId: 'membership-social-1',
          workspaceId: 'workspace-social-1',
          familyId: expect.any(String),
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          expiresAt: expect.any(Date),
        }),
        tx,
      );
      expect(pair.refreshToken.length).toBeGreaterThan(20);

      const payload = tokens.verifyAccess(pair.accessToken);
      expect(payload.sub).toBe('user-social-1');
      expect(payload.firebaseUid).toBe('uid-social-1');
      expect(payload.workspaceId).toBe('workspace-social-1');
      expect(payload.role).toBe('admin');
    });

    it('passes canonical Google profile fields through without a reservation', async () => {
      const recordedInserts: RecordedInsert[] = [];
      const tx = {
        execute: vi.fn().mockResolvedValue(undefined),
        select: createSelectMock([[], [], [], []]),
        insert: createTransactionInsertMock(
          [
            [
              {
                id: 'user-google-1',
                firebaseUid: 'google-uid-1',
                email: 'gperson@example.com',
                displayName: 'G Person',
                avatarUrl: 'https://google/a.png',
              },
            ],
            [{ id: 'workspace-google-1', name: 'Workspace' }],
            [
              {
                id: 'membership-google-1',
                workspaceId: 'workspace-google-1',
                role: 'admin',
              },
            ],
          ],
          recordedInserts,
        ),
        update: vi.fn(() => ({
          set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
        })),
      };
      db.select = createSelectMock([[], []]);
      db.transaction.mockImplementation(async (callback) => callback(tx));

      await service.provisionSocialSession({
        provider: 'google',
        email: 'gperson@example.com',
        displayName: 'G Person',
        avatarUrl: 'https://google/a.png',
        firebaseUid: 'google-uid-1',
        googleSubject: 'google-subject-1',
      });

      expect(firebase.assertActiveUserByUid).toHaveBeenCalledWith(
        'google-uid-1',
        'gperson@example.com',
        'google-subject-1',
      );
      expect(firebase.createUnclaimedUser).not.toHaveBeenCalled();
      expect(recordedInserts[0]?.table).toBe(usersTable);
      expect(recordedInserts[0]?.values).toMatchObject({
        email: 'gperson@example.com',
        firebaseUid: 'google-uid-1',
        displayName: 'G Person',
        avatarUrl: 'https://google/a.png',
      });
    });

    it('keeps a provider-owned avatar when no picture is supplied', async () => {
      const { recordedUpdates } = setupExistingUserSocialProvision('provider');

      await service.provisionSocialSession({
        provider: 'github',
        userId: 'user-existing-1',
        verifiedEmails: ['known@example.com'],
        name: 'New Name',
      });

      expect(recordedUpdates[0]?.table).toBe(usersTable);
      expect(recordedUpdates[0]?.values).toMatchObject({
        email: 'known@example.com',
        displayName: 'New Name',
        avatarUrl: 'https://old/avatar.png',
        updatedAt: expect.any(Date),
      });
      expect(recordedUpdates[1]?.table).toBe(reservationsTable);
      expect(recordedUpdates[1]?.values).toMatchObject({
        state: 'bound',
        userId: 'user-existing-1',
      });
    });

    it('refreshes a provider-owned avatar from the social picture', async () => {
      const { recordedUpdates } = setupExistingUserSocialProvision('provider');

      await service.provisionSocialSession({
        provider: 'github',
        userId: 'user-existing-1',
        verifiedEmails: ['known@example.com'],
        picture: 'https://new/avatar.png',
      });

      expect(recordedUpdates[0]?.values).toMatchObject({
        displayName: 'Old Name',
        avatarUrl: 'https://new/avatar.png',
      });
    });

    it('preserves a user-owned avatar even when the provider supplies a picture', async () => {
      const { recordedUpdates } = setupExistingUserSocialProvision('user');

      await service.provisionSocialSession({
        provider: 'github',
        userId: 'user-existing-1',
        verifiedEmails: ['known@example.com'],
        name: 'New Name',
        picture: 'https://new/avatar.png',
      });

      expect(recordedUpdates[0]?.values).toMatchObject({
        displayName: 'New Name',
        avatarUrl: 'https://old/avatar.png',
      });
    });
  });

  describe('register', () => {
    it('creates the Firebase identity, workspace owner session, and token pair', async () => {
      const { tx, recordedInserts } = setupRegisterHappyPath();

      const pair = await service.register(registerInput);

      expect(firebase.createEmailPasswordUser).toHaveBeenCalledWith({
        displayName: 'Owner Person',
        email: 'owner@example.com',
        password: 'password123',
        uid: 'firebase-register-1',
      });
      expect(db.transaction).toHaveBeenCalledTimes(2);
      expect(tx.execute).toHaveBeenCalledTimes(3);
      expect(recordedInserts.map(({ table }) => table)).toEqual([
        expect.anything(),
        usersTable,
        workspaces,
        workspaceSettings,
        workspaceMembers,
      ]);
      expect(recordedInserts[1]?.values).toMatchObject({
        avatarUrl: null,
        displayName: 'Owner Person',
        email: 'owner@example.com',
        firebaseUid: 'firebase-register-1',
      });
      expect(recordedInserts[2]?.values).toMatchObject({
        name: 'Acme Studio',
      });
      expect(recordedInserts[3]?.values).toMatchObject({
        workspaceId: 'workspace-register-1',
      });
      expect(recordedInserts[4]?.values).toMatchObject({
        role: 'admin',
        userId: 'user-register-1',
        workspaceId: 'workspace-register-1',
      });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-register-1',
          workspaceMemberId: 'membership-register-1',
          workspaceId: 'workspace-register-1',
          familyId: expect.any(String),
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          expiresAt: expect.any(Date),
        }),
        tx,
      );
      expect(repo.create).toHaveBeenCalledOnce();
      expect(firebase.deleteUser).not.toHaveBeenCalled();
      expect(pair.refreshToken.length).toBeGreaterThan(20);

      const payload = tokens.verifyAccess(pair.accessToken);
      expect(payload.sub).toBe('user-register-1');
      expect(payload.workspaceId).toBe('workspace-register-1');
      expect(payload.role).toBe('admin');
      expect(payload.firebaseUid).toBe('firebase-register-1');
      expect(payload.email).toBe('owner@example.com');
    });

    it('rejects duplicate local emails before Firebase provisioning', async () => {
      db.transaction.mockImplementation(async (callback) =>
        callback({
          execute: vi.fn(),
          select: createSelectMock([[seedUserRow]]),
        }),
      );

      await expect(service.register(registerInput)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(firebase.createEmailPasswordUser).not.toHaveBeenCalled();
      expect(db.transaction).toHaveBeenCalledOnce();
    });

    it('maps Firebase duplicate-email failures to a stable conflict', async () => {
      db.select = createSelectMock([[]]);
      firebase.createEmailPasswordUser.mockRejectedValueOnce(
        new FirebaseAdminAuthError(
          'auth/email-already-exists',
          'duplicate email',
        ),
      );

      await expect(service.register(registerInput)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(db.transaction).toHaveBeenCalledTimes(3);
    });

    it.each([['users_email_lookup_unique', 'duplicate_email']] as const)(
      'maps database unique violations for %s back to the shared registration conflict',
      async (constraint, code) => {
        const tx = {
          execute: vi.fn().mockResolvedValue(undefined),
          select: createSelectMock([
            [],
            [],
            [
              {
                id: 'reservation-1',
                firebaseUid: 'firebase-register-1',
                normalizedEmail: 'owner@example.com',
                purpose: 'registration',
                state: 'reserved',
              },
            ],
            [],
            [
              {
                id: 'reservation-1',
                firebaseUid: 'firebase-register-1',
                normalizedEmail: 'owner@example.com',
                purpose: 'registration',
                state: 'reserved',
              },
            ],
            [],
            [],
          ]),
          insert: createTransactionInsertMock([
            [
              {
                id: 'reservation-1',
                firebaseUid: 'firebase-register-1',
                normalizedEmail: 'owner@example.com',
                state: 'reserved',
              },
            ],
            { code: '23505', constraint },
          ]),
          update: vi.fn(() => ({
            set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
          })),
          delete: vi.fn(() => ({
            where: vi.fn().mockResolvedValue(undefined),
          })),
        };
        db.transaction.mockImplementation(async (callback) => callback(tx));
        firebase.createEmailPasswordUser.mockResolvedValueOnce({
          uid: 'firebase-register-1',
          email: 'owner@example.com',
          displayName: 'Owner Person',
        });

        const error = await service
          .register(registerInput)
          .catch((caught) => caught);

        expect(error).toBeInstanceOf(ConflictException);
        expect(error.getResponse()).toMatchObject({ code });
        expect(firebase.deleteUser).toHaveBeenCalledWith('firebase-register-1');
      },
    );

    it('returns service unavailable when Firebase provisioning fails unexpectedly', async () => {
      db.select = createSelectMock([[]]);
      firebase.createEmailPasswordUser.mockRejectedValueOnce(
        new Error('firebase unavailable'),
      );

      await expect(service.register(registerInput)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(db.transaction).toHaveBeenCalledTimes(2);
    });

    it('retains a registration reservation after an indeterminate Firebase error', async () => {
      db.select = createSelectMock([[]]);
      firebase.createEmailPasswordUser.mockRejectedValueOnce(
        new FirebaseAdminAuthError('auth/internal-error', 'provider failed'),
      );

      await expect(service.register(registerInput)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(firebase.deleteUser).not.toHaveBeenCalled();
      expect(db.transaction).toHaveBeenCalledTimes(2);
    });

    it('cleans up Firebase users after persistence failures', async () => {
      const tx = {
        execute: vi.fn().mockResolvedValue(undefined),
        select: createSelectMock([
          [],
          [],
          [
            {
              id: 'reservation-1',
              firebaseUid: 'firebase-register-1',
              normalizedEmail: 'owner@example.com',
              purpose: 'registration',
              state: 'reserved',
            },
          ],
          [],
          [
            {
              id: 'reservation-1',
              firebaseUid: 'firebase-register-1',
              normalizedEmail: 'owner@example.com',
              purpose: 'registration',
              state: 'reserved',
            },
          ],
          [],
          [],
        ]),
        insert: createTransactionInsertMock([
          [
            {
              id: 'reservation-1',
              firebaseUid: 'firebase-register-1',
              normalizedEmail: 'owner@example.com',
              state: 'reserved',
            },
          ],
          new Error('db failed'),
        ]),
        update: vi.fn(() => ({
          set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
        })),
        delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      };
      db.transaction.mockImplementation(async (callback) => callback(tx));
      firebase.createEmailPasswordUser.mockResolvedValueOnce({
        uid: 'firebase-register-1',
        email: 'owner@example.com',
        displayName: 'Owner Person',
      });

      await expect(service.register(registerInput)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(firebase.deleteUser).toHaveBeenCalledWith('firebase-register-1');
    });

    it('treats access-token signing failures as transactional registration failures', async () => {
      db.select = createSelectMock([[]]);
      const txSelect = createSelectMock([
        [],
        [],
        [
          {
            id: 'reservation-1',
            firebaseUid: 'firebase-register-1',
            normalizedEmail: 'owner@example.com',
            purpose: 'registration',
            state: 'reserved',
          },
        ],
        [],
        [
          {
            id: 'reservation-1',
            firebaseUid: 'firebase-register-1',
            normalizedEmail: 'owner@example.com',
            purpose: 'registration',
            state: 'reserved',
          },
        ],
        [],
        [],
      ]);
      const txInsert = createTransactionInsertMock([
        [
          {
            id: 'reservation-1',
            firebaseUid: 'firebase-register-1',
            normalizedEmail: 'owner@example.com',
            purpose: 'registration',
            state: 'reserved',
          },
        ],
        [
          {
            id: 'user-register-1',
            firebaseUid: 'firebase-register-1',
            email: 'owner@example.com',
          },
        ],
        [
          {
            id: 'workspace-register-1',
            name: 'Acme Studio',
          },
        ],
        [
          {
            id: 'membership-register-1',
            role: 'admin',
            userId: 'user-register-1',
            workspaceId: 'workspace-register-1',
          },
        ],
      ]);
      const tx = {
        execute: vi.fn().mockResolvedValue(undefined),
        insert: txInsert,
        select: txSelect,
        update: vi.fn(() => ({
          set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
        })),
        delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      };
      let committed = false;
      db.transaction.mockImplementation(async (callback) => {
        const result = await callback(tx);
        committed = true;
        return result;
      });
      firebase.createEmailPasswordUser.mockResolvedValueOnce({
        uid: 'firebase-register-1',
        email: 'owner@example.com',
        displayName: 'Owner Person',
      });
      vi.spyOn(tokens, 'signAccess').mockImplementation(() => {
        throw new Error('signing failed');
      });

      await expect(service.register(registerInput)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(committed).toBe(true);
      expect(firebase.deleteUser).toHaveBeenCalledWith('firebase-register-1');
    });

    it('returns service unavailable when cleanup after persistence failure also fails', async () => {
      const tx = {
        execute: vi.fn().mockResolvedValue(undefined),
        select: createSelectMock([
          [],
          [],
          [
            {
              id: 'reservation-1',
              firebaseUid: 'firebase-register-1',
              normalizedEmail: 'owner@example.com',
              purpose: 'registration',
              state: 'reserved',
            },
          ],
          [],
        ]),
        insert: createTransactionInsertMock([
          [
            {
              id: 'reservation-1',
              firebaseUid: 'firebase-register-1',
              normalizedEmail: 'owner@example.com',
              state: 'reserved',
            },
          ],
          new Error('db failed'),
        ]),
        update: vi.fn(() => ({
          set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
        })),
      };
      db.transaction.mockImplementation(async (callback) => callback(tx));
      firebase.createEmailPasswordUser.mockResolvedValueOnce({
        uid: 'firebase-register-1',
        email: 'owner@example.com',
        displayName: 'Owner Person',
      });
      firebase.deleteUser.mockRejectedValueOnce(new Error('cleanup failed'));

      await expect(service.register(registerInput)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('never deletes a Firebase UID that was adopted before guarded compensation', async () => {
      const reservation = {
        id: 'reservation-1',
        firebaseUid: 'firebase-register-1',
        normalizedEmail: 'owner@example.com',
        purpose: 'registration',
        state: 'reserved',
      };
      db.transaction.mockImplementation(async (callback) =>
        callback({
          execute: vi.fn().mockResolvedValue(undefined),
          select: createSelectMock([[reservation], [seedUserRow]]),
          delete: vi.fn(),
        }),
      );
      const { reservations } = service as unknown as {
        reservations: IdentityReservationCoordinator;
      };

      const compensated = await reservations.compensateKnownRegistrationFailure(
        reservation,
        reservation.firebaseUid,
      );

      expect(compensated).toBe(false);
      expect(firebase.deleteUser).not.toHaveBeenCalled();
    });

    it('never deletes when a guarded registration reservation became bound', async () => {
      const reservation = {
        id: 'reservation-1',
        firebaseUid: 'firebase-register-1',
        normalizedEmail: 'owner@example.com',
        purpose: 'registration',
        state: 'reserved',
      };
      db.transaction.mockImplementation(async (callback) =>
        callback({
          execute: vi.fn().mockResolvedValue(undefined),
          select: createSelectMock([[{ ...reservation, state: 'bound' }]]),
          delete: vi.fn(),
        }),
      );
      const { reservations } = service as unknown as {
        reservations: IdentityReservationCoordinator;
      };

      const compensated = await reservations.compensateKnownRegistrationFailure(
        reservation,
        reservation.firebaseUid,
      );

      expect(compensated).toBe(false);
      expect(firebase.deleteUser).not.toHaveBeenCalled();
    });

    it('does not recover a pending registration after the locked Firebase recheck fails', async () => {
      const reservation = {
        id: 'reservation-1',
        firebaseUid: 'firebase-register-1',
        normalizedEmail: 'owner@example.com',
        purpose: 'registration',
        state: 'confirmed',
        registrationDisplayName: 'Owner Person',
        registrationWorkspaceName: 'Acme Studio',
        registrationOwnerAcknowledgement: true,
      };
      db.select = createSelectMock([[reservation]]);
      const txInsert = vi.fn();
      db.transaction.mockImplementation(async (callback) =>
        callback({
          execute: vi.fn().mockResolvedValue(undefined),
          select: createSelectMock([[reservation]]),
          insert: txInsert,
          update: vi.fn(),
        }),
      );
      firebase.assertActiveUserByUid
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('disabled'));

      await expect(
        (
          service as unknown as {
            recoverPendingRegistration(input: {
              uid: string;
              email: string;
            }): Promise<unknown>;
          }
        ).recoverPendingRegistration({
          uid: reservation.firebaseUid,
          email: reservation.normalizedEmail,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(txInsert).not.toHaveBeenCalled();
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('does not recover a resolved registration', async () => {
      const reservation = {
        id: 'reservation-1',
        firebaseUid: 'firebase-register-1',
        normalizedEmail: 'owner@example.com',
        purpose: 'registration',
        state: 'resolved',
        registrationDisplayName: 'Owner Person',
        registrationWorkspaceName: 'Acme Studio',
        registrationOwnerAcknowledgement: true,
      };
      db.select = createSelectMock([[reservation]]);

      const result = await (
        service as unknown as {
          recoverPendingRegistration(input: {
            uid: string;
            email: string;
          }): Promise<unknown>;
        }
      ).recoverPendingRegistration({
        uid: reservation.firebaseUid,
        email: reservation.normalizedEmail,
      });

      expect(result).toBeNull();
      expect(firebase.assertActiveUserByUid).not.toHaveBeenCalled();
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('identity reservation coordination', () => {
    function reservations() {
      return (
        service as unknown as {
          reservations: IdentityReservationCoordinator;
        }
      ).reservations;
    }

    it('locks register transactions with email before uid keys on the caller tx', async () => {
      setupRegisterHappyPath();
      const locking = vi.spyOn(reservations(), 'lockIdentityReservationKeys');
      const findByUid = vi.spyOn(reservations(), 'findReservationByUid');

      await service.register(registerInput);

      expect(locking.mock.calls.map(([, keys]) => keys)).toEqual([
        ['email:owner@example.com'],
        ['email:owner@example.com', 'uid:firebase-register-1'],
      ]);
      const mainTx = locking.mock.calls[1]![0];
      expect(findByUid).toHaveBeenCalledWith('firebase-register-1', mainTx);
    });

    it('locks recovery with email before uid and passes the caller tx through', async () => {
      const reservationRow = {
        id: 'reservation-1',
        firebaseUid: 'firebase-register-1',
        normalizedEmail: 'owner@example.com',
        purpose: 'registration',
        state: 'confirmed',
        registrationDisplayName: 'Owner Person',
        registrationWorkspaceName: 'Acme Studio',
        registrationOwnerAcknowledgement: true,
      };
      db.select = createSelectMock([[reservationRow]]);
      const tx = {
        execute: vi.fn().mockResolvedValue(undefined),
        select: createSelectMock([[reservationRow], []]),
        insert: createTransactionInsertMock([
          [
            {
              id: 'user-recovered-1',
              firebaseUid: 'firebase-register-1',
              email: 'owner@example.com',
            },
          ],
          [{ id: 'workspace-recovered-1', name: 'Acme Studio' }],
          [
            {
              id: 'membership-recovered-1',
              workspaceId: 'workspace-recovered-1',
              role: 'admin',
            },
          ],
        ]),
        update: vi.fn(() => ({
          set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
        })),
      };
      db.transaction.mockImplementation(async (callback) => callback(tx));
      firebase.assertActiveUserByUid.mockResolvedValue(undefined);
      const locking = vi.spyOn(reservations(), 'lockIdentityReservationKeys');
      const findByUid = vi.spyOn(reservations(), 'findReservationByUid');

      await (
        service as unknown as {
          recoverPendingRegistration(input: {
            uid: string;
            email: string;
          }): Promise<unknown>;
        }
      ).recoverPendingRegistration({
        uid: 'firebase-register-1',
        email: 'owner@example.com',
      });

      expect(locking).toHaveBeenCalledTimes(1);
      expect(locking.mock.calls[0]![1]).toEqual([
        'email:owner@example.com',
        'uid:firebase-register-1',
      ]);
      const lockedTx = locking.mock.calls[0]![0];
      expect(findByUid).toHaveBeenNthCalledWith(1, 'firebase-register-1');
      expect(findByUid).toHaveBeenNthCalledWith(
        2,
        'firebase-register-1',
        lockedTx,
      );
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-recovered-1' }),
        lockedTx,
      );
    });

    it('provisions social sessions with email before uid keys on the caller tx', async () => {
      const { tx } = setupNewUserSocialProvision();
      const locking = vi.spyOn(reservations(), 'lockIdentityReservationKeys');
      const rejectPending = vi.spyOn(
        reservations(),
        'rejectPendingRegistrationReservation',
      );

      await service.provisionSocialSession({
        provider: 'github',
        email: 'octo@example.com',
        name: 'octocat',
        picture: 'https://avatars/123.png',
      });

      expect(locking.mock.calls.map(([, keys]) => keys)).toEqual([
        ['email:octo@example.com'],
        ['email:octo@example.com', 'uid:uid-social-1'],
      ]);
      expect(rejectPending).toHaveBeenCalledTimes(1);
      expect(rejectPending.mock.calls[0]![0]).toBe(tx);
      expect(locking.mock.calls[1]![0]).toBe(tx);
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token and returns a new pair', async () => {
      firebase.verifyIdToken.mockResolvedValueOnce({
        uid: 'admin-uid',
        email: 'admin@example.com',
      });
      const first = await service.login('test:admin-uid:admin@example.com');
      const firstCreateCall = repo.create.mock.calls[0]![0] as {
        tokenHash: string;
        familyId: string;
      };
      const existingRow = {
        id: 'old-row',
        userId: seedUserRow.id,
        workspaceMemberId: seedMembership.id,
        workspaceId: seedMembership.workspaceId,
        familyId: firstCreateCall.familyId,
        tokenHash: firstCreateCall.tokenHash,
        replacedBy: null,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      };
      repo.findByHashIncludingRevoked.mockResolvedValueOnce(existingRow);

      const pair = await service.refresh(first.refreshToken);

      expect(pair.accessToken).toMatch(/^eyJ/);
      expect(pair.refreshToken).not.toBe(first.refreshToken);
      expect(members.requireActiveMembershipById).toHaveBeenCalledWith(
        seedUserRow.id,
        seedMembership.id,
      );
      expect(repo.rotateIfActive).toHaveBeenCalledOnce();
      const rotateCall = repo.rotateIfActive.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(rotateCall[0]).toBe('old-row');
      expect(rotateCall[1].familyId).toBe(existingRow.familyId);
      expect(rotateCall[1].workspaceMemberId).toBe(seedMembership.id);
      expect(rotateCall[1].workspaceId).toBe(seedMembership.workspaceId);

      const payload = tokens.verifyAccess(pair.accessToken);
      expect(payload.sub).toBe(seedUserRow.id);
      expect(payload.firebaseUid).toBe(seedUserRow.firebaseUid);
      expect(payload.workspaceId).toBe(seedMembership.workspaceId);
      expect(payload.role).toBe(seedMembership.role);
    });

    it('reflects current role after role change', async () => {
      firebase.verifyIdToken.mockResolvedValueOnce({
        uid: 'admin-uid',
        email: 'admin@example.com',
      });
      const first = await service.login('test:admin-uid:admin@example.com');
      const firstCreateCall = repo.create.mock.calls[0]![0] as {
        tokenHash: string;
        familyId: string;
      };
      const existingRow = {
        id: 'old-row-role',
        userId: seedUserRow.id,
        workspaceMemberId: seedMembership.id,
        workspaceId: seedMembership.workspaceId,
        familyId: firstCreateCall.familyId,
        tokenHash: firstCreateCall.tokenHash,
        replacedBy: null,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      };
      repo.findByHashIncludingRevoked.mockResolvedValueOnce(existingRow);

      members.requireActiveMembershipById.mockResolvedValueOnce({
        ...seedMembership,
        role: 'pm',
      });

      const pair = await service.refresh(first.refreshToken);

      const payload = tokens.verifyAccess(pair.accessToken);
      expect(payload.sub).toBe(seedUserRow.id);
      expect(payload.role).toBe('pm');
    });

    it('rejects refresh when the stored workspace membership no longer exists', async () => {
      repo.findByHashIncludingRevoked.mockResolvedValueOnce({
        id: 'workspace-bound-row',
        userId: seedUserRow.id,
        workspaceMemberId: seedMembership.id,
        workspaceId: seedMembership.workspaceId,
        familyId: 'family-workspace-bound',
        tokenHash: 'abc',
        replacedBy: null,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      });
      members.requireActiveMembershipById.mockRejectedValueOnce(
        new UnauthorizedException('Unauthorized'),
      );

      await expect(service.refresh('some-raw-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repo.rotateIfActive).not.toHaveBeenCalled();
    });

    it('rejects a parallel loser that sees a revoked token with an active replacement', async () => {
      const revokedRow = {
        id: 'revoked-row',
        userId: seedUserRow.id,
        workspaceMemberId: seedMembership.id,
        workspaceId: seedMembership.workspaceId,
        familyId: 'family-parallel',
        tokenHash: 'abc',
        replacedBy: 'next-row',
        revokedAt: new Date(Date.now() - 1_000),
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      };
      repo.findByHashIncludingRevoked.mockResolvedValueOnce(revokedRow);
      repo.findById.mockResolvedValueOnce({
        id: 'next-row',
        userId: seedUserRow.id,
        workspaceMemberId: seedMembership.id,
        workspaceId: seedMembership.workspaceId,
        familyId: 'family-parallel',
        tokenHash: 'next-hash',
        replacedBy: null,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      });

      await expect(service.refresh('some-raw-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repo.deleteFamily).not.toHaveBeenCalled();
    });

    it('detects reuse of a revoked token and destroys the family', async () => {
      const revokedRow = {
        id: 'revoked-row',
        userId: seedUserRow.id,
        workspaceMemberId: seedMembership.id,
        workspaceId: seedMembership.workspaceId,
        familyId: 'family-xyz',
        tokenHash: 'abc',
        replacedBy: 'next-row',
        revokedAt: new Date(Date.now() - 1_000),
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      };
      repo.findByHashIncludingRevoked.mockResolvedValueOnce(revokedRow);
      repo.findById.mockResolvedValueOnce({
        id: 'next-row',
        userId: seedUserRow.id,
        workspaceMemberId: seedMembership.id,
        workspaceId: seedMembership.workspaceId,
        familyId: 'family-xyz',
        tokenHash: 'next-hash',
        replacedBy: 'later-row',
        revokedAt: new Date(Date.now() - 500),
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      });

      await expect(service.refresh('some-raw-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repo.deleteFamily).toHaveBeenCalledWith('family-xyz');
    });

    it('destroys the family when a revoked token has no replacement row', async () => {
      const revokedRow = {
        id: 'revoked-row-no-replacement',
        userId: seedUserRow.id,
        workspaceMemberId: seedMembership.id,
        workspaceId: seedMembership.workspaceId,
        familyId: 'family-missing-successor',
        tokenHash: 'abc',
        replacedBy: 'missing-row',
        revokedAt: new Date(Date.now() - 1_000),
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      };
      repo.findByHashIncludingRevoked.mockResolvedValueOnce(revokedRow);
      repo.findById.mockResolvedValueOnce(null);

      await expect(service.refresh('some-raw-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repo.deleteFamily).toHaveBeenCalledWith(
        'family-missing-successor',
      );
    });

    it('rejects unknown refresh tokens with 401', async () => {
      repo.findByHashIncludingRevoked.mockResolvedValueOnce(null);
      await expect(service.refresh('whatever')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repo.deleteFamily).not.toHaveBeenCalled();
    });

    it('rejects expired refresh tokens', async () => {
      repo.findByHashIncludingRevoked.mockResolvedValueOnce({
        id: 'r',
        userId: seedUserRow.id,
        workspaceMemberId: seedMembership.id,
        workspaceId: seedMembership.workspaceId,
        familyId: 'f',
        tokenHash: 'h',
        replacedBy: null,
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1_000),
        createdAt: new Date(),
      });
      await expect(service.refresh('whatever')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects atomic rotation loss without destroying the family', async () => {
      const existingRow = {
        id: 'old-row',
        userId: seedUserRow.id,
        workspaceMemberId: seedMembership.id,
        workspaceId: seedMembership.workspaceId,
        familyId: 'family-race',
        tokenHash: 'abc',
        replacedBy: null,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      };
      repo.findByHashIncludingRevoked.mockResolvedValueOnce(existingRow);
      repo.rotateIfActive.mockResolvedValueOnce(null);

      await expect(service.refresh('some-raw-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repo.deleteFamily).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('deletes a matching row owned by the subject', async () => {
      repo.findByHashIncludingRevoked.mockResolvedValueOnce({
        id: 'row-1',
        userId: seedUserRow.id,
        workspaceMemberId: seedMembership.id,
        workspaceId: seedMembership.workspaceId,
        familyId: 'f1',
        tokenHash: 'h',
        replacedBy: null,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      });
      await service.logout('raw', seedUserRow.id);
      expect(repo.deleteById).toHaveBeenCalledWith('row-1');
      expect(
        githubAccounts.invalidatePendingAuthorizations,
      ).toHaveBeenCalledWith(seedUserRow.id);
    });

    it('is a no-op when the row does not belong to the subject', async () => {
      repo.findByHashIncludingRevoked.mockResolvedValueOnce({
        id: 'row-1',
        userId: 'someone-else',
        workspaceMemberId: seedMembership.id,
        workspaceId: seedMembership.workspaceId,
        familyId: 'f1',
        tokenHash: 'h',
        replacedBy: null,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      });
      await service.logout('raw', seedUserRow.id);
      expect(repo.deleteById).not.toHaveBeenCalled();
      expect(
        githubAccounts.invalidatePendingAuthorizations,
      ).toHaveBeenCalledWith(seedUserRow.id);
    });

    it('is silent when the token is unknown', async () => {
      repo.findByHashIncludingRevoked.mockResolvedValueOnce(null);
      await expect(
        service.logout('raw', seedUserRow.id),
      ).resolves.toBeUndefined();
      expect(repo.deleteById).not.toHaveBeenCalled();
      expect(
        githubAccounts.invalidatePendingAuthorizations,
      ).toHaveBeenCalledWith(seedUserRow.id);
    });
  });

  describe('switchWorkspace', () => {
    it('issues a fresh token pair for another active membership', async () => {
      repo.findByHashIncludingRevoked.mockResolvedValueOnce(
        createActiveRefreshTokenRow({
          id: 'switch-row',
          familyId: 'switch-family',
        }),
      );
      members.resolveActiveMembership.mockResolvedValueOnce({
        ...seedMembership,
        workspaceId: '44444444-4444-4444-4444-444444444444',
        role: 'pm',
      });

      const pair = await service.switchWorkspace(
        {
          sub: seedUserRow.id,
          email: seedUserRow.email,
          firebaseUid: seedUserRow.firebaseUid,
          workspaceId: seedMembership.workspaceId,
          role: seedMembership.role,
        },
        '44444444-4444-4444-4444-444444444444',
        'current-refresh-token',
      );

      expect(repo.rotateIfActive).toHaveBeenCalledWith(
        'switch-row',
        expect.objectContaining({
          familyId: 'switch-family',
          userId: seedUserRow.id,
          workspaceMemberId: seedMembership.id,
          workspaceId: '44444444-4444-4444-4444-444444444444',
        }),
      );
      expect(repo.create).not.toHaveBeenCalled();
      expect(tokens.verifyAccess(pair.accessToken)).toMatchObject({
        sub: seedUserRow.id,
        workspaceId: '44444444-4444-4444-4444-444444444444',
        role: 'pm',
      });
    });

    it('supports idempotent switching to the current workspace', async () => {
      repo.findByHashIncludingRevoked.mockResolvedValueOnce(
        createActiveRefreshTokenRow(),
      );
      const pair = await service.switchWorkspace(
        {
          sub: seedUserRow.id,
          email: seedUserRow.email,
          firebaseUid: seedUserRow.firebaseUid,
          workspaceId: seedMembership.workspaceId,
          role: seedMembership.role,
        },
        seedMembership.workspaceId,
        'current-refresh-token',
      );

      expect(pair.refreshToken.length).toBeGreaterThan(20);
      expect(repo.rotateIfActive).toHaveBeenCalledWith(
        'refresh-row',
        expect.objectContaining({
          workspaceMemberId: seedMembership.id,
          workspaceId: seedMembership.workspaceId,
        }),
      );
      expect(tokens.verifyAccess(pair.accessToken)).toMatchObject({
        workspaceId: seedMembership.workspaceId,
        role: seedMembership.role,
      });
    });

    it('rejects target workspaces without a membership', async () => {
      members.resolveActiveMembership.mockResolvedValueOnce(null);

      await expect(
        service.switchWorkspace(
          {
            sub: seedUserRow.id,
            email: seedUserRow.email,
            firebaseUid: seedUserRow.firebaseUid,
            workspaceId: seedMembership.workspaceId,
            role: seedMembership.role,
          },
          '55555555-5555-5555-5555-555555555555',
          'current-refresh-token',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects switch requests with a refresh token owned by another user', async () => {
      repo.findByHashIncludingRevoked.mockResolvedValueOnce(
        createActiveRefreshTokenRow({
          userId: '99999999-9999-9999-9999-999999999999',
        }),
      );

      await expect(
        service.switchWorkspace(
          {
            sub: seedUserRow.id,
            email: seedUserRow.email,
            firebaseUid: seedUserRow.firebaseUid,
            workspaceId: seedMembership.workspaceId,
            role: seedMembership.role,
          },
          seedMembership.workspaceId,
          'other-user-refresh-token',
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(repo.rotateIfActive).not.toHaveBeenCalled();
    });

    it('rejects switch requests with a refresh token from another workspace session', async () => {
      repo.findByHashIncludingRevoked.mockResolvedValueOnce(
        createActiveRefreshTokenRow({
          workspaceId: '66666666-6666-6666-6666-666666666666',
        }),
      );

      await expect(
        service.switchWorkspace(
          {
            sub: seedUserRow.id,
            email: seedUserRow.email,
            firebaseUid: seedUserRow.firebaseUid,
            workspaceId: seedMembership.workspaceId,
            role: seedMembership.role,
          },
          seedMembership.workspaceId,
          'other-workspace-session-refresh-token',
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(repo.rotateIfActive).not.toHaveBeenCalled();
    });
  });

  describe('aged unbound registration reservations', () => {
    const agedRow = {
      id: 'reservation-aged',
      normalizedEmail: 'stranded@example.com',
      firebaseUid: 'firebase-aged-1',
      purpose: 'registration',
      state: 'reserved',
      createdAt: new Date(Date.now() - 30 * 3_600_000),
      registrationDisplayName: 'Stranded Owner',
      registrationWorkspaceName: 'Acme',
    };

    it('surfaces aged reservations through a read-only query', async () => {
      db.select = createSelectMock([[agedRow]]);

      const aged = await service.listAgedUnboundRegistrationReservations();

      expect(aged).toEqual([agedRow]);
      expect(db.select).toHaveBeenCalledTimes(1);
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('warns with a redacted payload per aged reservation without mutating state', async () => {
      db.select = createSelectMock([[agedRow]]);
      const loggerWarn = vi.spyOn(service['logger'], 'warn');

      service.reportAgedUnboundRegistrationReservations(
        await service.listAgedUnboundRegistrationReservations(),
      );

      expect(loggerWarn).toHaveBeenCalledTimes(1);
      const payload = loggerWarn.mock.calls[0]![0] as Record<string, unknown>;
      expect(Object.keys(payload).sort()).toEqual([
        'ageMs',
        'event',
        'firebaseUid',
        'normalizedEmail',
        'reservationId',
      ]);
      expect(payload).toMatchObject({
        event: 'auth.identity.aged_unbound_reservation',
        reservationId: 'reservation-aged',
        normalizedEmail: 'stranded@example.com',
        firebaseUid: 'firebase-aged-1',
        ageMs: expect.any(Number),
      });
      const expectedAgeMs = Date.now() - agedRow.createdAt.getTime();
      expect(payload.ageMs as number).toBeGreaterThanOrEqual(
        expectedAgeMs - 1_000,
      );
      expect(payload.ageMs as number).toBeLessThanOrEqual(
        expectedAgeMs + 5_000,
      );
      expect(db.transaction).not.toHaveBeenCalled();
      loggerWarn.mockRestore();
    });
  });

  describe('operator recovery', () => {
    function reservationsCoordinator() {
      return (
        service as unknown as {
          reservations: IdentityReservationCoordinator;
        }
      ).reservations;
    }

    it('delegates operator resolution to the coordinator with the operator input', async () => {
      const resolve = vi
        .spyOn(
          reservationsCoordinator(),
          'resolveConclusivelyAbandonedRegistration',
        )
        .mockResolvedValue(undefined);
      const input = {
        reservationId: 'reservation-1',
        operatorDecision: 'resolve-abandoned',
        operatorIdentity: 'ops@example.com',
      };

      await service.resolveConclusivelyAbandonedRegistration(input);

      expect(resolve).toHaveBeenCalledWith({
        ...input,
        minAgeMs: expect.any(Number),
      });
    });

    it('still completes automated exact-UID recovery on the original foundation', async () => {
      const reservationRow = {
        id: 'reservation-1',
        firebaseUid: 'firebase-register-1',
        normalizedEmail: 'owner@example.com',
        purpose: 'registration',
        state: 'reserved',
        registrationDisplayName: 'Owner Person',
        registrationWorkspaceName: 'Acme Studio',
        registrationOwnerAcknowledgement: true,
      };
      db.select = createSelectMock([[reservationRow]]);
      const recordedUpdates: RecordedUpdate[] = [];
      const tx = {
        execute: vi.fn().mockResolvedValue(undefined),
        select: createSelectMock([[reservationRow], []]),
        insert: createTransactionInsertMock([
          [
            {
              id: 'user-recovered-1',
              firebaseUid: 'firebase-register-1',
              email: 'owner@example.com',
            },
          ],
          [{ id: 'workspace-recovered-1', name: 'Acme Studio' }],
          [
            {
              id: 'membership-recovered-1',
              workspaceId: 'workspace-recovered-1',
              role: 'admin',
            },
          ],
        ]),
        update: createTransactionUpdateMock(recordedUpdates),
      };
      db.transaction.mockImplementation(async (callback) => callback(tx));
      firebase.assertActiveUserByUid.mockResolvedValue(undefined);

      const pair = (await (
        service as unknown as {
          recoverPendingRegistration(input: {
            uid: string;
            email: string;
          }): Promise<unknown>;
        }
      ).recoverPendingRegistration({
        uid: 'firebase-register-1',
        email: 'owner@example.com',
      })) as { accessToken: string; refreshToken: string };

      expect(pair).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        }),
      );
      expect(
        recordedUpdates.map((u) => (u.values as { state?: string }).state),
      ).toEqual(['confirmed', 'bound']);
      expect(recordedUpdates[1]!.values).toMatchObject({
        state: 'bound',
        userId: 'user-recovered-1',
      });
      expect(firebase.confirmUidAbsent).not.toHaveBeenCalled();
    });
  });
});

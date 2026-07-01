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
import {
  refreshTokens,
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
  return vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn().mockImplementation(async () => queue.shift() ?? []),
      })),
    })),
  }));
}

interface RecordedInsert {
  table: unknown;
  values: unknown;
}

function createTransactionInsertMock(
  returningQueue: unknown[][] = [],
  recordedInserts: RecordedInsert[] = [],
) {
  return vi.fn((table: unknown) => ({
    values: vi.fn((values: unknown) => {
      recordedInserts.push({ table, values });
      return {
        returning: vi
          .fn()
          .mockImplementation(async () => returningQueue.shift() ?? []),
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
    createEmailPasswordUser: ReturnType<typeof vi.fn>;
    deleteUser: ReturnType<typeof vi.fn>;
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
    requireActiveMembershipForUser: ReturnType<typeof vi.fn>;
    requireActiveMembership: ReturnType<typeof vi.fn>;
    resolveActiveMembership: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    tokens = new TokenService(fakeConfig as never);
    db = {
      select: createSelectMock([]),
      transaction: vi.fn(),
    };
    firebase = {
      verifyIdToken: vi.fn(),
      createEmailPasswordUser: vi.fn(),
      deleteUser: vi.fn().mockResolvedValue(undefined),
    };
    repo = {
      create: vi.fn(async (input) => ({
        id: 'rt-' + Math.random().toString(16).slice(2, 10),
        userId: input.userId,
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
      requireActiveMembershipForUser: vi.fn().mockResolvedValue(seedMembership),
      requireActiveMembership: vi.fn().mockResolvedValue(seedMembership),
      resolveActiveMembership: vi.fn().mockResolvedValue(seedMembership),
    };

    service = new AuthService(
      fakeConfig as never,
      db as never,
      firebase as never,
      tokens,
      repo as never,
      users as never,
      members as never,
    );
  });

  describe('login', () => {
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
      );
      expect(repo.create).toHaveBeenCalledOnce();
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

  describe('register', () => {
    it('creates the Firebase identity, workspace owner session, and token pair', async () => {
      db.select = createSelectMock([[]]);
      const txSelect = createSelectMock([[], []]);
      const recordedInserts: RecordedInsert[] = [];
      const txInsert = createTransactionInsertMock(
        [
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
        ],
        recordedInserts,
      );
      const tx = {
        execute: vi.fn().mockResolvedValue(undefined),
        insert: txInsert,
        select: txSelect,
      };
      db.transaction.mockImplementation(async (callback) => callback(tx));
      firebase.createEmailPasswordUser.mockResolvedValueOnce({
        uid: 'firebase-register-1',
        email: 'owner@example.com',
        displayName: 'Owner Person',
      });

      const pair = await service.register(registerInput);

      expect(firebase.createEmailPasswordUser).toHaveBeenCalledWith({
        displayName: 'Owner Person',
        email: 'owner@example.com',
        password: 'password123',
      });
      expect(db.transaction).toHaveBeenCalledOnce();
      expect(tx.execute).toHaveBeenCalledTimes(2);
      expect(recordedInserts.map(({ table }) => table)).toEqual([
        usersTable,
        workspaces,
        workspaceSettings,
        workspaceMembers,
        refreshTokens,
      ]);
      expect(recordedInserts[0]?.values).toMatchObject({
        avatarUrl: null,
        displayName: 'Owner Person',
        email: 'owner@example.com',
        firebaseUid: 'firebase-register-1',
      });
      expect(recordedInserts[1]?.values).toMatchObject({
        name: 'Acme Studio',
      });
      expect(recordedInserts[2]?.values).toMatchObject({
        workspaceId: 'workspace-register-1',
      });
      expect(recordedInserts[3]?.values).toMatchObject({
        role: 'admin',
        userId: 'user-register-1',
        workspaceId: 'workspace-register-1',
      });
      expect(recordedInserts[4]?.values).toMatchObject({
        expiresAt: expect.any(Date),
        familyId: expect.any(String),
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        userId: 'user-register-1',
      });
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
      db.select = createSelectMock([[seedUserRow]]);

      await expect(service.register(registerInput)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(firebase.createEmailPasswordUser).not.toHaveBeenCalled();
      expect(db.transaction).not.toHaveBeenCalled();
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
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('maps workspace-name conflicts and cleans up the Firebase user', async () => {
      db.select = createSelectMock([[]]);
      const tx = {
        execute: vi.fn().mockResolvedValue(undefined),
        insert: createTransactionInsertMock([]),
        select: createSelectMock([[], [{ id: 'workspace-existing-1' }]]),
      };
      db.transaction.mockImplementation(async (callback) => callback(tx));
      firebase.createEmailPasswordUser.mockResolvedValueOnce({
        uid: 'firebase-register-1',
        email: 'owner@example.com',
        displayName: 'Owner Person',
      });

      await expect(service.register(registerInput)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(firebase.deleteUser).toHaveBeenCalledWith('firebase-register-1');
    });

    it.each([
      ['users_email_lookup_unique', 'duplicate_email'],
      ['workspaces_name_lookup_unique', 'workspace_name_unavailable'],
    ] as const)(
      'maps database unique violations for %s back to the shared registration conflict',
      async (constraint, code) => {
        db.select = createSelectMock([[]]);
        db.transaction.mockRejectedValueOnce({
          code: '23505',
          constraint,
        });
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
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('cleans up Firebase users after persistence failures', async () => {
      db.select = createSelectMock([[]]);
      db.transaction.mockRejectedValueOnce(new Error('db failed'));
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
      const txSelect = createSelectMock([[], []]);
      const txInsert = createTransactionInsertMock([
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
      ]);
      const tx = {
        execute: vi.fn().mockResolvedValue(undefined),
        insert: txInsert,
        select: txSelect,
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
      expect(committed).toBe(false);
      expect(firebase.deleteUser).toHaveBeenCalledWith('firebase-register-1');
    });

    it('returns service unavailable when cleanup after persistence failure also fails', async () => {
      db.select = createSelectMock([[]]);
      db.transaction.mockRejectedValueOnce(new Error('db failed'));
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
      expect(repo.rotateIfActive).toHaveBeenCalledOnce();
      const rotateCall = repo.rotateIfActive.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(rotateCall[0]).toBe('old-row');
      expect(rotateCall[1].familyId).toBe(existingRow.familyId);
      expect(rotateCall[1].workspaceId).toBe(existingRow.workspaceId);

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
        workspaceId: seedMembership.workspaceId,
        familyId: firstCreateCall.familyId,
        tokenHash: firstCreateCall.tokenHash,
        replacedBy: null,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      };
      repo.findByHashIncludingRevoked.mockResolvedValueOnce(existingRow);

      members.requireActiveMembership.mockResolvedValueOnce({
        ...seedMembership,
        role: 'pm',
      });

      const pair = await service.refresh(first.refreshToken);

      const payload = tokens.verifyAccess(pair.accessToken);
      expect(payload.sub).toBe(seedUserRow.id);
      expect(payload.role).toBe('pm');
    });

    it('rejects a parallel loser that sees a revoked token with an active replacement', async () => {
      const revokedRow = {
        id: 'revoked-row',
        userId: seedUserRow.id,
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
    });

    it('is a no-op when the row does not belong to the subject', async () => {
      repo.findByHashIncludingRevoked.mockResolvedValueOnce({
        id: 'row-1',
        userId: 'someone-else',
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
    });

    it('is silent when the token is unknown', async () => {
      repo.findByHashIncludingRevoked.mockResolvedValueOnce(null);
      await expect(
        service.logout('raw', seedUserRow.id),
      ).resolves.toBeUndefined();
      expect(repo.deleteById).not.toHaveBeenCalled();
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
});

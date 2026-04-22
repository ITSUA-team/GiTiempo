import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { FakeFirebaseAdminService } from './firebase-admin.fake';
import { FIREBASE_ADMIN } from './firebase-admin.interface';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { UsersService } from '../../users/services/users.service';

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

describe('AuthService', () => {
  let service: AuthService;
  let tokens: TokenService;
  let repo: {
    create: ReturnType<typeof vi.fn>;
    findByHashIncludingRevoked: ReturnType<typeof vi.fn>;
    markRevoked: ReturnType<typeof vi.fn>;
    deleteFamily: ReturnType<typeof vi.fn>;
    deleteById: ReturnType<typeof vi.fn>;
  };
  let users: {
    upsertFromFirebase: ReturnType<typeof vi.fn>;
    findRowById: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repo = {
      create: vi.fn(async (input) => ({
        id: 'rt-' + Math.random().toString(16).slice(2, 10),
        userId: input.userId,
        familyId: input.familyId,
        tokenHash: input.tokenHash,
        replacedBy: null,
        revokedAt: null,
        expiresAt: input.expiresAt,
        createdAt: new Date(),
      })),
      findByHashIncludingRevoked: vi.fn(),
      markRevoked: vi.fn().mockResolvedValue(undefined),
      deleteFamily: vi.fn().mockResolvedValue(undefined),
      deleteById: vi.fn().mockResolvedValue(undefined),
    };
    users = {
      upsertFromFirebase: vi.fn().mockResolvedValue(seedUserRow),
      findRowById: vi.fn().mockResolvedValue(seedUserRow),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        TokenService,
        { provide: ConfigService, useValue: fakeConfig },
        { provide: FIREBASE_ADMIN, useClass: FakeFirebaseAdminService },
        { provide: RefreshTokenRepository, useValue: repo },
        { provide: UsersService, useValue: users },
      ],
    }).compile();
    service = module.get(AuthService);
    tokens = module.get(TokenService);
  });

  describe('login', () => {
    it('verifies Firebase, upserts user, and issues a token pair', async () => {
      const pair = await service.login('test:admin-uid:admin@example.com');

      expect(users.upsertFromFirebase).toHaveBeenCalledWith({
        firebaseUid: 'admin-uid',
        email: 'admin@example.com',
        displayName: null,
        avatarUrl: null,
      });
      expect(repo.create).toHaveBeenCalledOnce();
      expect(pair.accessToken).toMatch(/^eyJ/);
      expect(pair.refreshToken.length).toBeGreaterThan(20);
      expect(pair.accessTokenExpiresIn).toBe(15 * 60);

      const payload = tokens.verifyAccess(pair.accessToken);
      expect(payload.sub).toBe(seedUserRow.id);
      expect(payload.firebaseUid).toBe('admin-uid');
    });

    it('rejects invalid Firebase tokens with 401', async () => {
      await expect(service.login('not-a-test-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(users.upsertFromFirebase).not.toHaveBeenCalled();
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token and returns a new pair', async () => {
      const first = await service.login('test:admin-uid:admin@example.com');
      const firstCreateCall = repo.create.mock.calls[0]![0] as {
        tokenHash: string;
        familyId: string;
      };
      const existingRow = {
        id: 'old-row',
        userId: seedUserRow.id,
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
      expect(repo.markRevoked).toHaveBeenCalledOnce();
      // Family id preserved across rotation.
      const secondCreateCall = repo.create.mock.calls.at(-1)![0] as {
        familyId: string;
      };
      expect(secondCreateCall.familyId).toBe(existingRow.familyId);
    });

    it('detects reuse of a revoked token and destroys the family', async () => {
      const revokedRow = {
        id: 'revoked-row',
        userId: seedUserRow.id,
        familyId: 'family-xyz',
        tokenHash: 'abc',
        replacedBy: 'next-row',
        revokedAt: new Date(Date.now() - 1_000),
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      };
      repo.findByHashIncludingRevoked.mockResolvedValueOnce(revokedRow);

      await expect(service.refresh('some-raw-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repo.deleteFamily).toHaveBeenCalledWith('family-xyz');
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
  });

  describe('logout', () => {
    it('deletes a matching row owned by the subject', async () => {
      repo.findByHashIncludingRevoked.mockResolvedValueOnce({
        id: 'row-1',
        userId: seedUserRow.id,
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
});

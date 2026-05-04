import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { GithubConnectionsService } from './github-connections.service';

const baseRow = {
  id: 'conn-1',
  userId: 'user-1',
  githubUserId: '123',
  login: 'octo',
  avatarUrl: null,
  accessTokenEncrypted: 'enc-access',
  refreshTokenEncrypted: 'enc-refresh',
  tokenExpiresAt: new Date(Date.now() + 120_000),
  refreshTokenExpiresAt: new Date(Date.now() + 600_000),
  connected: true,
  connectedAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function dbWithSelectRows(rows: unknown[][]) {
  const limit = vi.fn();
  for (const row of rows) limit.mockResolvedValueOnce(row);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });
  return { select, from, where, limit };
}

function dbWithUpdateReturning(rows: unknown[][]) {
  const returning = vi.fn();
  for (const row of rows) returning.mockResolvedValueOnce(row);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  const update = vi.fn().mockReturnValue({ set });
  return { update, set, where, returning };
}

function dbWithInsertReturning(rows: unknown[][]) {
  const returning = vi.fn();
  for (const row of rows) returning.mockResolvedValueOnce(row);
  const onConflictDoUpdate = vi.fn().mockReturnValue({ returning });
  const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
  const insert = vi.fn().mockReturnValue({ values });
  return { insert, values, onConflictDoUpdate, returning };
}

function buildService(db: Record<string, unknown>, overrides = {}) {
  const encryption = {
    encrypt: vi.fn((value: string) => `encrypted:${value}`),
    decrypt: vi.fn((value: string) =>
      value.replace('enc-', '').replace('encrypted:', ''),
    ),
  };
  const oauth = {
    refresh: vi.fn(),
  };
  return {
    service: new GithubConnectionsService(
      db as never,
      encryption as never,
      { ...oauth, ...overrides } as never,
    ),
    encryption,
    oauth,
  };
}

describe('GithubConnectionsService', () => {
  it('maps missing connection to disconnected status', async () => {
    const db = dbWithSelectRows([[]]);
    const { service } = buildService(db);

    await expect(service.status('user-1')).resolves.toEqual({
      status: 'disconnected',
      account: null,
    });
  });

  it('maps connected row to public account metadata only', async () => {
    const db = dbWithSelectRows([[baseRow]]);
    const { service } = buildService(db);

    await expect(service.status('user-1')).resolves.toEqual({
      status: 'connected',
      account: {
        githubUserId: '123',
        login: 'octo',
        avatarUrl: null,
        connectedAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });
  });

  it('returns decrypted valid access token without refreshing', async () => {
    const db = dbWithSelectRows([[baseRow]]);
    const { service } = buildService(db);

    await expect(service.getValidAccessToken('user-1')).resolves.toBe('access');
  });

  it('upserts connected rows with encrypted token values', async () => {
    const insertDb = dbWithInsertReturning([[baseRow]]);
    const { service, encryption } = buildService(insertDb);

    await expect(
      service.upsertConnected(
        'user-1',
        { githubUserId: '123', login: 'octo', avatarUrl: null },
        {
          accessToken: 'ghu_access',
          refreshToken: 'ghr_refresh',
          tokenExpiresAt: new Date(Date.now() + 120_000),
          refreshTokenExpiresAt: new Date(Date.now() + 600_000),
        },
      ),
    ).resolves.toBe(baseRow);
    expect(encryption.encrypt).toHaveBeenCalledWith('ghu_access');
    expect(encryption.encrypt).toHaveBeenCalledWith('ghr_refresh');
    expect(insertDb.onConflictDoUpdate).toHaveBeenCalled();
  });

  it('disconnect clears token material', async () => {
    const selectDb = dbWithSelectRows([[baseRow]]);
    const updateDb = dbWithUpdateReturning([[]]);
    const { service } = buildService({ ...selectDb, ...updateDb });

    await service.disconnect('user-1');

    expect(updateDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        connected: false,
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
      }),
    );
  });

  it('throws when a user has no usable connection', async () => {
    const db = dbWithSelectRows([[]]);
    const { service } = buildService(db);

    await expect(service.getValidAccessToken('user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rereads newer token state when optimistic refresh loses the race', async () => {
    const expiredRow = {
      ...baseRow,
      tokenExpiresAt: new Date(Date.now() - 1_000),
    };
    const newerRow = {
      ...baseRow,
      accessTokenEncrypted: 'enc-new-access',
      tokenExpiresAt: new Date(Date.now() + 120_000),
      updatedAt: new Date('2026-01-01T00:00:01.000Z'),
    };
    const selectDb = dbWithSelectRows([[expiredRow], [newerRow]]);
    const updateDb = dbWithUpdateReturning([[]]);
    const oauth = {
      refresh: vi.fn().mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        tokenExpiresAt: new Date(Date.now() + 120_000),
        refreshTokenExpiresAt: new Date(Date.now() + 600_000),
      }),
    };
    const { service } = buildService({ ...selectDb, ...updateDb }, oauth);

    await expect(service.getValidAccessToken('user-1')).resolves.toBe(
      'new-access',
    );
    expect(oauth.refresh).toHaveBeenCalledWith('refresh');
  });
});

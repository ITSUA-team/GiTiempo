import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JiraConnectionsService } from './jira-connections.service';
import { JiraRefreshRejectedError } from './jira-oauth-client.service';

const encryption = {
  decrypt: (value: string) => value.replace('enc:', ''),
  encrypt: (value: string) => `enc:${value}`,
} as never;

function connectionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'connection-1',
    userId: 'user-1',
    atlassianAccountId: 'acc-1',
    displayName: 'Alexey',
    email: 'alexey@example.com',
    avatarUrl: null,
    sites: [{ cloudId: 'cloud-1', name: 'ITSUA', url: 'https://itsua.net' }],
    accessTokenEncrypted: 'enc:stale-access',
    refreshTokenEncrypted: 'enc:refresh-1',
    tokenExpiresAt: new Date(Date.now() - 60_000),
    connected: true,
    reauthorizationRequired: false,
    connectedAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createDb(rows: unknown[]) {
  const updates: Array<Record<string, unknown>> = [];

  return {
    updates,
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn(async () => rows) })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((values: Record<string, unknown>) => {
        updates.push(values);
        return { where: vi.fn(async () => undefined) };
      }),
    })),
  };
}

describe('JiraConnectionsService', () => {
  let refresh: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    refresh = vi.fn(async () => ({
      accessToken: 'fresh-access',
      refreshToken: 'rotated-refresh',
      tokenExpiresAt: new Date(Date.now() + 3_600_000),
    }));
  });

  function createService(db: ReturnType<typeof createDb>) {
    return new JiraConnectionsService(db as never, encryption, {
      refresh,
    } as never);
  }

  it('refreshes once when several callers need the token at the same time', async () => {
    const db = createDb([connectionRow()]);
    const service = createService(db);

    const tokens = await Promise.all([
      service.getValidAccessToken('user-1'),
      service.getValidAccessToken('user-1'),
      service.getValidAccessToken('user-1'),
    ]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(tokens).toEqual(['fresh-access', 'fresh-access', 'fresh-access']);
  });

  it('stores the rotated refresh token, not the one it sent', async () => {
    const db = createDb([connectionRow()]);

    await createService(db).getValidAccessToken('user-1');

    expect(db.updates[0]).toMatchObject({
      accessTokenEncrypted: 'enc:fresh-access',
      refreshTokenEncrypted: 'enc:rotated-refresh',
      reauthorizationRequired: false,
    });
  });

  it('marks reauthorization instead of deleting when Atlassian rejects the refresh', async () => {
    refresh.mockRejectedValue(new JiraRefreshRejectedError());
    const db = createDb([connectionRow()]);
    const service = createService(db);

    await expect(service.getValidAccessToken('user-1')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(db.updates[0]).toEqual(
      expect.objectContaining({ reauthorizationRequired: true }),
    );
    expect(db.updates[0]).not.toHaveProperty('connected', false);
  });

  it('lets a later caller retry after a failed refresh', async () => {
    refresh.mockRejectedValueOnce(new JiraRefreshRejectedError());
    const db = createDb([connectionRow()]);
    const service = createService(db);

    await expect(service.getValidAccessToken('user-1')).rejects.toThrow();
    await expect(service.getValidAccessToken('user-1')).resolves.toBe(
      'fresh-access',
    );
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('reports a connection needing reauthorization as its own status', async () => {
    const db = createDb([connectionRow({ reauthorizationRequired: true })]);

    await expect(createService(db).status('user-1')).resolves.toMatchObject({
      status: 'reauthorization-required',
    });
  });

  it('refuses to hand out a token while reauthorization is required', async () => {
    const db = createDb([connectionRow({ reauthorizationRequired: true })]);

    await expect(
      createService(db).getValidAccessToken('user-1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('reuses a still-valid access token without refreshing', async () => {
    const db = createDb([
      connectionRow({ tokenExpiresAt: new Date(Date.now() + 3_600_000) }),
    ]);

    await expect(createService(db).getValidAccessToken('user-1')).resolves.toBe(
      'stale-access',
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it('reports a disconnected account without an account payload', async () => {
    const db = createDb([
      connectionRow({ accessTokenEncrypted: null, connected: false }),
    ]);

    await expect(createService(db).status('user-1')).resolves.toEqual({
      status: 'disconnected',
      account: null,
    });
  });
});

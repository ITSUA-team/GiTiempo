import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { GithubAccountService } from './github-account.service';

describe('GithubAccountService OAuth authorization recovery', () => {
  it.each([
    { refreshTokenEncrypted: null, refreshTokenExpiresAt: null },
    {
      refreshTokenEncrypted: 'expired-refresh',
      refreshTokenExpiresAt: new Date(0),
    },
  ])(
    'identifies expired OAuth access as a provider failure: %j',
    async (refresh) => {
      const query = {
        from: () => query,
        innerJoin: () => query,
        where: () => query,
        limit: async () => [
          {
            link: { id: 'link-1' },
            grant: {
              scopes: ['read:org'],
              accessTokenEncrypted: 'expired-access',
              tokenExpiresAt: new Date(0),
              ...refresh,
            },
          },
        ],
      };
      const oauthClient = { refresh: vi.fn() };
      const service = new GithubAccountService(
        { select: () => query } as never,
        {} as never,
        oauthClient as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );

      await expect(service.getValidAccessToken('user-1')).rejects.toMatchObject(
        {
          response: {
            code: 'github_authorization_required',
            message: 'GitHub OAuth authorization requires reconnection',
          },
        },
      );
      expect(oauthClient.refresh).not.toHaveBeenCalled();
    },
  );

  it.each(['revoked refresh token', 'disconnect during refresh'] as const)(
    'preserves the provider error contract after %s',
    async (scenario) => {
      const query = {
        from: () => query,
        innerJoin: () => query,
        where: () => query,
        limit: async () => [
          {
            link: { id: 'link-1', userId: 'user-1' },
            grant: {
              id: 'grant-1',
              scopes: ['read:org'],
              accessTokenEncrypted: 'expired-access',
              tokenExpiresAt: new Date(0),
              refreshTokenEncrypted: 'refresh-token',
              refreshTokenExpiresAt: null,
            },
          },
        ],
      };
      const deleteWhere = vi.fn().mockResolvedValue(undefined);
      const tx = {
        insert: () => ({
          values: () => ({ onConflictDoNothing: async () => undefined }),
        }),
        execute: async () => ({
          rows: [
            {
              generation: scenario === 'disconnect during refresh' ? 1 : 0,
              disconnected_at: null,
            },
          ],
        }),
        delete: vi.fn(() => ({ where: deleteWhere })),
        update: vi.fn(),
      };
      const providerError = new UnauthorizedException({
        code: 'github_authorization_required',
        message: 'GitHub OAuth authorization requires reconnection',
      });
      const oauthClient = {
        refresh:
          scenario === 'revoked refresh token'
            ? vi.fn().mockRejectedValue(providerError)
            : vi.fn().mockResolvedValue({
                accessToken: 'new-access',
                refreshToken: 'new-refresh',
                scopes: ['read:org'],
                tokenExpiresAt: null,
                refreshTokenExpiresAt: null,
              }),
      };
      const service = new GithubAccountService(
        {
          select: () => query,
          transaction: (run: (transaction: typeof tx) => Promise<unknown>) =>
            run(tx),
        } as never,
        { decrypt: (value: string) => value } as never,
        oauthClient as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );
      vi.spyOn(service, 'getVersion').mockResolvedValue({
        generation: 0,
        disconnectedAt: null,
      });

      await expect(service.getValidAccessToken('user-1')).rejects.toMatchObject(
        {
          response: { code: 'github_authorization_required' },
        },
      );
      expect(oauthClient.refresh).toHaveBeenCalledWith('refresh-token');
      expect(tx.update).not.toHaveBeenCalled();
      expect(deleteWhere).toHaveBeenCalledTimes(
        scenario === 'revoked refresh token' ? 1 : 0,
      );
    },
  );
});

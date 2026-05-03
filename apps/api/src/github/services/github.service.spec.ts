import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../config/env.validation';
import { GithubService } from './github.service';

describe('GithubService', () => {
  const states = {
    create: vi.fn(),
    claim: vi.fn(),
  };
  const oauthClient = {
    buildAuthorizationUrl: vi.fn(),
    exchangeCode: vi.fn(),
    getCurrentUser: vi.fn(),
  };
  const connections = {
    status: vi.fn(),
    disconnect: vi.fn(),
    upsertConnected: vi.fn(),
  };
  const user = {
    sub: 'user-1',
    email: 'user@example.com',
    firebaseUid: 'firebase-1',
    workspaceId: 'workspace-1',
    role: 'admin' as const,
  };

  function service() {
    return new GithubService(
      {
        get: (key: string) =>
          key === 'USER_SPA_URL' ? 'http://localhost:5173' : undefined,
      } as unknown as ConfigService<Env, true>,
      states as never,
      oauthClient as never,
      connections as never,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an auth URL from opaque state and PKCE challenge', async () => {
    states.create.mockResolvedValue({ state: 'opaque', codeChallenge: 'pkce' });
    oauthClient.buildAuthorizationUrl.mockReturnValue('https://github/auth');

    await expect(service().authUrl(user)).resolves.toEqual({
      authorizationUrl: 'https://github/auth',
    });
    expect(states.create).toHaveBeenCalledWith('user-1');
    expect(oauthClient.buildAuthorizationUrl).toHaveBeenCalledWith({
      state: 'opaque',
      codeChallenge: 'pkce',
    });
  });

  it('redirects successful callbacks to USER_SPA_URL/profile', async () => {
    states.claim.mockResolvedValue({
      userId: 'user-1',
      codeVerifier: 'verifier',
    });
    oauthClient.exchangeCode.mockResolvedValue({ accessToken: 'ghu_access' });
    oauthClient.getCurrentUser.mockResolvedValue({
      githubUserId: '123',
      login: 'octo',
      avatarUrl: null,
    });
    connections.upsertConnected.mockResolvedValue(undefined);

    await expect(
      service().completeCallback({ code: 'code', state: 'opaque' }),
    ).resolves.toBe('http://localhost:5173/profile?github=connected');
  });

  it('does not exchange code when state cannot be claimed', async () => {
    states.claim.mockResolvedValue(null);

    await expect(
      service().completeCallback({ code: 'code', state: 'replayed' }),
    ).resolves.toBe(
      'http://localhost:5173/profile?github=error&code=invalid_state',
    );
    expect(oauthClient.exchangeCode).not.toHaveBeenCalled();
  });

  it('redirects provider failures with safe error codes only', async () => {
    states.claim.mockResolvedValue({
      userId: 'user-1',
      codeVerifier: 'verifier',
    });
    oauthClient.exchangeCode.mockRejectedValue(
      new Error('raw provider detail'),
    );

    await expect(
      service().completeCallback({ code: 'bad', state: 'opaque' }),
    ).resolves.toBe(
      'http://localhost:5173/profile?github=error&code=github_exchange_failed',
    );
  });
});

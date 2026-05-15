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
    getValidAccessToken: vi.fn(),
  };
  const apiClient = {
    listOwners: vi.fn(),
    listRepositories: vi.fn(),
    listProjects: vi.fn(),
    listRepositoryIssues: vi.fn(),
    listProjectIssues: vi.fn(),
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
      apiClient as never,
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

  it('derives personal owner from connected GitHub account', async () => {
    connections.status.mockResolvedValue({
      status: 'connected',
      account: {
        githubUserId: '123',
        login: 'octocat',
        avatarUrl: null,
        connectedAt: '2026-05-14T12:00:00.000Z',
        updatedAt: '2026-05-14T12:00:00.000Z',
      },
    });
    connections.getValidAccessToken.mockResolvedValue('ghu_token');
    apiClient.listRepositories.mockResolvedValue({
      items: [],
      pagination: { limit: 30, hasNextPage: false, nextPageToken: null },
    });

    await service().listRepositories(user, {
      ownerType: 'personal',
      limit: 30,
    });

    expect(apiClient.listRepositories).toHaveBeenCalledWith({
      accessToken: 'ghu_token',
      ownerType: 'personal',
      owner: 'octocat',
      limit: 30,
      pageToken: undefined,
    });
  });

  it('does not call GitHub API client when connection is disconnected', async () => {
    connections.status.mockResolvedValue({
      status: 'disconnected',
      account: null,
    });

    await expect(service().listOwners(user, { type: 'all' })).rejects.toThrow(
      'GitHub connection not found',
    );
    expect(apiClient.listOwners).not.toHaveBeenCalled();
  });

  it('uses valid token path for repository issue browsing', async () => {
    connections.getValidAccessToken.mockResolvedValue('ghu_token');
    apiClient.listRepositoryIssues.mockResolvedValue({
      items: [],
      pagination: { limit: 30, hasNextPage: false, nextPageToken: null },
    });

    await service().listRepositoryIssues(user, 'octo', 'repo', {
      state: 'all',
      limit: 30,
      q: 'timer',
    });

    expect(apiClient.listRepositoryIssues).toHaveBeenCalledWith({
      accessToken: 'ghu_token',
      owner: 'octo',
      repo: 'repo',
      state: 'all',
      q: 'timer',
      limit: 30,
      pageToken: undefined,
    });
  });
});

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
    getProjectOwner: vi.fn(),
    getRepositoryIssue: vi.fn(),
    listRepositoryIssues: vi.fn(),
    listProjectIssues: vi.fn(),
  };
  const workspaceGitHubOrganizations = {
    listAllowedOrganizationLogins: vi.fn(),
    assertOrganizationAllowed: vi.fn(),
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
      workspaceGitHubOrganizations as never,
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

  it('loads a single repository issue through the connected github account', async () => {
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
    apiClient.getRepositoryIssue.mockResolvedValue({
      id: 'issue-184',
      nodeId: 'issue-184',
      repository: {
        owner: 'octocat',
        name: 'repo',
        fullName: 'octocat/repo',
      },
      number: 184,
      title: 'Timer bug',
      state: 'open',
      url: 'https://github.com/octocat/repo/issues/184',
      updatedAt: '2026-05-14T12:00:00.000Z',
    });

    const issue = await service().getRepositoryIssue(
      user,
      'octocat',
      'repo',
      184,
    );

    expect(issue.title).toBe('Timer bug');
    expect(apiClient.getRepositoryIssue).toHaveBeenCalledWith({
      accessToken: 'ghu_token',
      owner: 'octocat',
      repo: 'repo',
      issueNumber: 184,
    });
  });

  it('filters owner lists through the workspace allow-list while preserving personal scope', async () => {
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
    apiClient.listOwners.mockResolvedValue({
      items: [
        {
          login: 'octocat',
          label: 'octocat',
          type: 'personal',
          avatarUrl: null,
          url: 'https://github.com/octocat',
        },
        {
          login: 'Octo-Org',
          label: 'Octo-Org',
          type: 'organization',
          avatarUrl: null,
          url: 'https://github.com/Octo-Org',
        },
        {
          login: 'Other-Org',
          label: 'Other-Org',
          type: 'organization',
          avatarUrl: null,
          url: 'https://github.com/Other-Org',
        },
      ],
    });
    workspaceGitHubOrganizations.listAllowedOrganizationLogins.mockResolvedValue(
      ['octo-org'],
    );

    const result = await service().listOwners(user, { type: 'all' });

    expect(result.items.map((owner) => owner.login)).toEqual([
      'octocat',
      'Octo-Org',
    ]);
  });

  it('lists available organizations for setup without workspace allow-list filtering', async () => {
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
    apiClient.listOwners.mockResolvedValue({
      items: [
        {
          login: 'Octo-Org',
          label: 'Octo-Org',
          type: 'organization',
          avatarUrl: null,
          url: 'https://github.com/Octo-Org',
        },
        {
          login: 'Other-Org',
          label: 'Other-Org',
          type: 'organization',
          avatarUrl: null,
          url: 'https://github.com/Other-Org',
        },
      ],
    });
    workspaceGitHubOrganizations.listAllowedOrganizationLogins.mockResolvedValue(
      ['octo-org'],
    );

    const result = await service().listAvailableOrganizations(user);

    expect(result.items.map((owner) => owner.login)).toEqual([
      'Octo-Org',
      'Other-Org',
    ]);
    expect(apiClient.listOwners).toHaveBeenCalledWith(
      'ghu_token',
      { login: 'octocat', avatarUrl: null },
      'organization',
    );
    expect(
      workspaceGitHubOrganizations.listAllowedOrganizationLogins,
    ).not.toHaveBeenCalled();
  });

  it('rejects organization-scoped repository browsing when the owner is not allowed', async () => {
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
    workspaceGitHubOrganizations.assertOrganizationAllowed.mockRejectedValue(
      new Error('blocked'),
    );

    await expect(
      service().listRepositories(user, {
        ownerType: 'organization',
        owner: 'octo-org',
        limit: 30,
      }),
    ).rejects.toThrow('blocked');
    expect(apiClient.listRepositories).not.toHaveBeenCalled();
  });

  it('rejects organization-scoped project browsing when the owner is not allowed', async () => {
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
    workspaceGitHubOrganizations.assertOrganizationAllowed.mockRejectedValue(
      new Error('blocked'),
    );

    await expect(
      service().listProjects(user, {
        ownerType: 'organization',
        owner: 'octo-org',
        limit: 30,
      }),
    ).rejects.toThrow('blocked');
    expect(apiClient.listProjects).not.toHaveBeenCalled();
  });

  it('rejects organization repository issues when the owner is not allowed', async () => {
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
    workspaceGitHubOrganizations.assertOrganizationAllowed.mockRejectedValue(
      new Error('blocked'),
    );

    await expect(
      service().listRepositoryIssues(user, 'octo-org', 'repo', {
        state: 'all',
        limit: 30,
      }),
    ).rejects.toThrow('blocked');
    expect(apiClient.listRepositoryIssues).not.toHaveBeenCalled();
  });

  it('allows personal repository issues without checking the workspace organization policy', async () => {
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
    apiClient.listRepositoryIssues.mockResolvedValue({
      items: [],
      pagination: { limit: 30, hasNextPage: false, nextPageToken: null },
    });

    await service().listRepositoryIssues(user, 'octocat', 'repo', {
      state: 'all',
      limit: 30,
    });

    expect(
      workspaceGitHubOrganizations.assertOrganizationAllowed,
    ).not.toHaveBeenCalled();
    expect(apiClient.listRepositoryIssues).toHaveBeenCalled();
  });

  it('fails closed for project issue browsing when project ownership cannot be verified as allowed', async () => {
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
    apiClient.getProjectOwner.mockResolvedValue({
      type: 'organization',
      login: null,
    });

    await expect(
      service().listProjectIssues(user, 'PVT_kwDO', {
        state: 'open',
        limit: 30,
      }),
    ).rejects.toThrow('could not be verified');
    expect(apiClient.listProjectIssues).not.toHaveBeenCalled();
  });

  it('filters Project V2 issue items whose repository owners are outside the workspace allow-list', async () => {
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
    apiClient.getProjectOwner.mockResolvedValue({
      type: 'personal',
      login: 'octocat',
    });
    apiClient.listProjectIssues.mockResolvedValue({
      items: [
        {
          projectItemId: 'item-1',
          isArchived: false,
          issue: {
            id: 'issue-1',
            nodeId: 'issue-1',
            repository: {
              owner: 'octocat',
              name: 'personal-repo',
              fullName: 'octocat/personal-repo',
            },
            number: 1,
            title: 'Personal issue',
            state: 'open',
            url: 'https://github.com/octocat/personal-repo/issues/1',
            updatedAt: '2026-05-14T12:00:00.000Z',
          },
        },
        {
          projectItemId: 'item-2',
          isArchived: false,
          issue: {
            id: 'issue-2',
            nodeId: 'issue-2',
            repository: {
              owner: 'Octo-Org',
              name: 'allowed-repo',
              fullName: 'Octo-Org/allowed-repo',
            },
            number: 2,
            title: 'Allowed org issue',
            state: 'open',
            url: 'https://github.com/Octo-Org/allowed-repo/issues/2',
            updatedAt: '2026-05-14T12:00:00.000Z',
          },
        },
        {
          projectItemId: 'item-3',
          isArchived: false,
          issue: {
            id: 'issue-3',
            nodeId: 'issue-3',
            repository: {
              owner: 'Other-Org',
              name: 'blocked-repo',
              fullName: 'Other-Org/blocked-repo',
            },
            number: 3,
            title: 'Blocked org issue',
            state: 'open',
            url: 'https://github.com/Other-Org/blocked-repo/issues/3',
            updatedAt: '2026-05-14T12:00:00.000Z',
          },
        },
      ],
      pagination: { limit: 30, hasNextPage: false, nextPageToken: null },
      skipped: {
        pullRequests: 0,
        draftIssues: 0,
        redacted: 0,
        unknown: 0,
      },
    });
    workspaceGitHubOrganizations.listAllowedOrganizationLogins.mockResolvedValue(
      ['octo-org'],
    );

    const result = await service().listProjectIssues(user, 'PVT_kwDO', {
      state: 'all',
      limit: 30,
    });

    expect(result.items.map((item) => item.projectItemId)).toEqual([
      'item-1',
      'item-2',
    ]);
  });
});

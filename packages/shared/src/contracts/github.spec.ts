import { describe, expect, it } from 'vitest';

import {
  githubConnectionStatusResponseSchema,
  githubDisconnectResponseSchema,
  githubIssueListQuerySchema,
  githubOwnerListQuerySchema,
  githubOwnerListResponseSchema,
  githubProjectIssueListResponseSchema,
  githubProjectListQuerySchema,
  githubProjectListResponseSchema,
  githubRepositoryIssueListResponseSchema,
  githubRepositoryListQuerySchema,
  githubRepositoryListResponseSchema,
} from './github.js';

describe('GitHub account capability contracts', () => {
  const account = {
    githubUserId: '123',
    login: 'octocat',
    avatarUrl: null,
    connectedAt: '2026-10-08T09:00:00.000Z',
    updatedAt: '2026-10-08T09:00:00.000Z',
  };
  const connected = {
    status: 'connected',
    account,
    oauth: { status: 'authorized', missingScopes: [] },
    capabilities: { organizationDiscovery: 'ready', personalData: 'ready' },
    disconnect: 'allowed',
  };

  it.each([
    connected,
    {
      ...connected,
      oauth: { status: 'not_authorized', missingScopes: [] },
      capabilities: {
        organizationDiscovery: 'authorization_required',
        personalData: 'ready',
      },
    },
    {
      ...connected,
      oauth: {
        status: 'authorized',
        missingScopes: ['read:org', 'read:project'],
      },
      capabilities: {
        organizationDiscovery: 'permission_required',
        personalData: 'ready',
      },
      disconnect: 'alternative_signin_required',
    },
    {
      ...connected,
      oauth: { status: 'reauthorization_required', missingScopes: [] },
      capabilities: {
        organizationDiscovery: 'authorization_required',
        personalData: 'authorization_required',
      },
      disconnect: 'verification_unavailable',
    },
    {
      status: 'disconnected',
      account: null,
      oauth: { status: 'not_authorized', missingScopes: [] },
      capabilities: {
        organizationDiscovery: 'authorization_required',
        personalData: 'authorization_required',
      },
      disconnect: 'allowed',
    },
  ])(
    'accepts coordinated linked, legacy, partial, expired and disconnected states %#',
    (payload) => {
      expect(githubConnectionStatusResponseSchema.parse(payload)).toEqual(
        payload,
      );
    },
  );

  it.each([
    { ...connected, accessToken: 'secret' },
    { ...connected, account: { ...account, refreshTokenEncrypted: 'secret' } },
    { ...connected, oauth: { ...connected.oauth, accessToken: 'secret' } },
    {
      ...connected,
      capabilities: { ...connected.capabilities, token: 'secret' },
    },
    { ...connected, account: null },
    { ...connected, disconnect: 'client_verified' },
    { ...connected, oauth: { status: 'authorized', missingScopes: ['repo'] } },
    { status: 'connected', account },
  ])('rejects secret-bearing or incomplete account payloads %#', (payload) => {
    expect(
      githubConnectionStatusResponseSchema.safeParse(payload).success,
    ).toBe(false);
  });

  it.each(['confirmed', 'unconfirmed', 'not_required'])(
    'accepts full unlink revocation outcome %s',
    (providerRevocation) => {
      const result = { disconnected: true, providerRevocation };
      expect(githubDisconnectResponseSchema.parse(result)).toEqual(result);
    },
  );

  it('rejects incomplete, unsuccessful and secret-bearing unlink responses', () => {
    for (const payload of [
      { disconnected: true },
      { disconnected: false, providerRevocation: 'confirmed' },
      { disconnected: true, providerRevocation: 'queued' },
      {
        disconnected: true,
        providerRevocation: 'confirmed',
        accessToken: 'secret',
      },
    ])
      expect(githubDisconnectResponseSchema.safeParse(payload).success).toBe(
        false,
      );
  });
});

const pagination = {
  limit: 30,
  hasNextPage: true,
  nextPageToken: 'opaque-token',
};

const issue = {
  id: '123',
  nodeId: 'I_kwDO',
  repository: {
    owner: 'octo-org',
    name: 'repo',
    fullName: 'octo-org/repo',
  },
  number: 42,
  title: 'Track project work',
  state: 'open',
  url: 'https://github.com/octo-org/repo/issues/42',
  updatedAt: '2026-05-14T12:00:00.000Z',
};

describe('GitHub browsing contracts', () => {
  it('accepts owner list responses without token material', () => {
    const result = githubOwnerListResponseSchema.parse({
      items: [
        {
          login: 'octocat',
          label: 'octocat',
          type: 'personal',
          avatarUrl: 'https://github.com/images/error/octocat_happy.gif',
          url: 'https://github.com/octocat',
        },
      ],
    });

    expect(result.items[0]).not.toHaveProperty('accessToken');
    expect(result.items[0]?.type).toBe('personal');
  });

  it('rejects invalid owner filters', () => {
    const result = githubOwnerListQuerySchema.safeParse({ type: 'team' });

    expect(result.success).toBe(false);
  });

  it('accepts repository responses with page-token pagination', () => {
    const result = githubRepositoryListResponseSchema.parse({
      items: [
        {
          id: '1',
          nodeId: 'R_kwDO',
          owner: 'octo-org',
          name: 'repo',
          fullName: 'octo-org/repo',
          visibility: 'private',
          isArchived: false,
          description: null,
          url: 'https://github.com/octo-org/repo',
          updatedAt: '2026-05-14T12:00:00.000Z',
        },
      ],
      pagination,
    });

    expect(result.pagination.nextPageToken).toBe('opaque-token');
  });

  it('requires organization owner only for organization-scoped queries', () => {
    expect(
      githubRepositoryListQuerySchema.safeParse({ ownerType: 'organization' })
        .success,
    ).toBe(false);
    expect(
      githubRepositoryListQuerySchema.safeParse({
        ownerType: 'personal',
        owner: 'octo-org',
      }).success,
    ).toBe(false);
    expect(
      githubRepositoryListQuerySchema.parse({ ownerType: 'personal' })
        .ownerType,
    ).toBe('personal');
  });

  it('bounds limit and accepts opaque page tokens', () => {
    const result = githubProjectListQuerySchema.safeParse({
      ownerType: 'personal',
      limit: '101',
      pageToken: 'opaque-token',
    });

    expect(result.success).toBe(false);
    expect(
      githubProjectListQuerySchema.parse({
        ownerType: 'personal',
        limit: '100',
        pageToken: 'opaque-token',
      }).pageToken,
    ).toBe('opaque-token');
  });

  it('accepts project responses with page-token pagination', () => {
    const result = githubProjectListResponseSchema.parse({
      items: [
        {
          id: 'PVT_kwDO',
          number: 7,
          title: 'Roadmap',
          owner: 'octo-org',
          state: 'open',
          description: null,
          url: 'https://github.com/orgs/octo-org/projects/7',
          updatedAt: '2026-05-14T12:00:00.000Z',
        },
      ],
      pagination,
    });

    expect(result.items[0]?.id).toBe('PVT_kwDO');
  });

  it('defaults issue state to all and trims empty search', () => {
    const result = githubIssueListQuerySchema.parse({ q: '   ' });

    expect(result.state).toBe('all');
    expect(result.q).toBeUndefined();
  });

  it('rejects invalid issue states', () => {
    const result = githubIssueListQuerySchema.safeParse({ state: 'merged' });

    expect(result.success).toBe(false);
  });

  it('accepts repository issue responses', () => {
    const result = githubRepositoryIssueListResponseSchema.parse({
      items: [issue],
      pagination,
    });

    expect(result.items[0]?.repository.fullName).toBe('octo-org/repo');
  });

  it('accepts project issue responses with skipped counts', () => {
    const result = githubProjectIssueListResponseSchema.parse({
      items: [
        {
          projectItemId: 'PVTI_kwDO',
          isArchived: false,
          issue,
        },
      ],
      pagination,
      skipped: {
        pullRequests: 1,
        draftIssues: 1,
        redacted: 1,
        unknown: 1,
      },
    });

    expect(result.skipped.pullRequests).toBe(1);
  });
});

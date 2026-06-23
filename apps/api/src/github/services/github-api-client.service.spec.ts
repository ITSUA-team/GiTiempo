import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GithubApiClientService } from './github-api-client.service';

const accessToken = 'ghu_secret_token';

function jsonResponse(
  body: unknown,
  init: ResponseInit & { link?: string } = {},
): Response {
  const headers = new Headers(init.headers);
  if (init.link) headers.set('link', init.link);
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers,
  });
}

describe('GithubApiClientService', () => {
  let service: GithubApiClientService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new GithubApiClientService();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists owners with personal account and organizations', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        {
          login: 'octo-org',
          avatar_url: 'https://avatars.githubusercontent.com/u/1',
          html_url: 'https://github.com/octo-org',
        },
      ]),
    );

    const result = await service.listOwners(
      accessToken,
      { login: 'octocat', avatarUrl: null },
      'all',
    );

    expect(result.items.map((owner) => owner.login)).toEqual([
      'octocat',
      'octo-org',
    ]);
    expect(JSON.stringify(result)).not.toContain(accessToken);
  });

  it('lists active organization memberships for authenticated users', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        {
          state: 'active',
          organization: {
            login: 'My-test-org-for-clock',
            avatar_url: 'https://avatars.githubusercontent.com/u/2',
            html_url: 'https://github.com/My-test-org-for-clock',
          },
        },
        {
          state: 'pending',
          organization: {
            login: 'Pending-Org',
            avatar_url: null,
            html_url: 'https://github.com/Pending-Org',
          },
        },
      ]),
    );

    const result = await service.listActiveOrganizationMemberships(accessToken);

    const requestUrl = new URL(fetchMock.mock.calls[0]![0] as URL);
    expect(requestUrl.pathname).toBe('/user/memberships/orgs');
    expect(requestUrl.searchParams.get('state')).toBe('active');
    expect(result.items.map((owner) => owner.login)).toEqual([
      'My-test-org-for-clock',
    ]);
  });

  it('gets the authenticated user membership for a single organization', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        state: 'active',
        organization: {
          login: 'My-test-org-for-clock',
          avatar_url: 'https://avatars.githubusercontent.com/u/2',
          html_url: 'https://github.com/My-test-org-for-clock',
        },
      }),
    );

    const result = await service.getAuthenticatedUserOrganizationMembership(
      accessToken,
      'My-test-org-for-clock',
    );

    const requestUrl = new URL(fetchMock.mock.calls[0]![0] as URL);
    expect(requestUrl.pathname).toBe(
      '/user/memberships/orgs/My-test-org-for-clock',
    );
    expect(result).toEqual({
      login: 'My-test-org-for-clock',
      avatarUrl: 'https://avatars.githubusercontent.com/u/2',
      url: 'https://github.com/My-test-org-for-clock',
      state: 'active',
    });
  });

  it('returns null when the authenticated user is not affiliated with the organization', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: 'Not Found' }, { status: 404 }),
    );

    await expect(
      service.getAuthenticatedUserOrganizationMembership(
        accessToken,
        'missing-org',
      ),
    ).resolves.toBeNull();
  });

  it('surfaces blocked organizations for authenticated user membership checks', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: 'Forbidden' }, { status: 403 }),
    );

    await expect(
      service.getAuthenticatedUserOrganizationMembership(
        accessToken,
        'blocked-org',
      ),
    ).rejects.toMatchObject({
      message: 'GitHub organization blocks this GitHub App',
      response: expect.objectContaining({
        code: 'github_app_access_blocked',
      }),
    });
  });

  it('normalizes repositories and returns opaque next page token', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        [
          {
            id: 1,
            node_id: 'R_kwDO',
            name: 'repo',
            full_name: 'octocat/repo',
            owner: { login: 'octocat' },
            private: false,
            archived: false,
            description: null,
            html_url: 'https://github.com/octocat/repo',
            updated_at: '2026-05-14T12:00:00Z',
          },
        ],
        {
          link: '<https://api.github.com/user/repos?page=2>; rel="next"',
        },
      ),
    );

    const result = await service.listRepositories({
      accessToken,
      ownerType: 'personal',
      owner: 'octocat',
      limit: 30,
    });

    expect(result.items[0]?.fullName).toBe('octocat/repo');
    expect(result.pagination.hasNextPage).toBe(true);
    expect(result.pagination.nextPageToken).toEqual(expect.any(String));
    expect(result.pagination.nextPageToken).not.toContain('page=2');
  });

  it('normalizes project responses with cursor page tokens', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        [
          {
            node_id: 'PVT_kwDO',
            number: 7,
            title: 'Roadmap',
            owner: { login: 'octo-org' },
            state: 'open',
            description: null,
            html_url: 'https://github.com/orgs/octo-org/projects/7',
            updated_at: '2026-05-14T12:00:00Z',
          },
        ],
        {
          link: '<https://api.github.com/orgs/octo-org/projectsV2?after=abc>; rel="next"',
        },
      ),
    );

    const result = await service.listProjects({
      accessToken,
      ownerType: 'organization',
      owner: 'octo-org',
      limit: 30,
    });

    expect(result.items[0]?.id).toBe('PVT_kwDO');
    expect(result.pagination.nextPageToken).toEqual(expect.any(String));
  });

  it('filters pull requests from repository issue responses', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        {
          id: 1,
          node_id: 'I_kwDO',
          number: 1,
          title: 'Issue',
          state: 'open',
          html_url: 'https://github.com/octo/repo/issues/1',
          updated_at: '2026-05-14T12:00:00Z',
        },
        {
          id: 2,
          node_id: 'PR_kwDO',
          number: 2,
          title: 'Pull request',
          state: 'open',
          html_url: 'https://github.com/octo/repo/pull/2',
          updated_at: '2026-05-14T12:00:00Z',
          pull_request: {},
        },
      ]),
    );

    const result = await service.listRepositoryIssues({
      accessToken,
      owner: 'octo',
      repo: 'repo',
      state: 'all',
      limit: 30,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.number).toBe(1);
  });

  it('uses search API for repository issue search', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        items: [
          {
            id: 1,
            node_id: 'I_kwDO',
            number: 1,
            title: 'Timer issue',
            state: 'closed',
            html_url: 'https://github.com/octo/repo/issues/1',
            updated_at: '2026-05-14T12:00:00Z',
          },
        ],
      }),
    );

    const result = await service.listRepositoryIssues({
      accessToken,
      owner: 'octo',
      repo: 'repo',
      state: 'all',
      q: 'timer',
      limit: 30,
    });

    const requestUrl = new URL(fetchMock.mock.calls[0]![0] as URL);
    expect(requestUrl.pathname).toBe('/search/issues');
    expect(requestUrl.searchParams.get('q')).toContain('repo:octo/repo');
    expect(result.items[0]?.state).toBe('closed');
  });

  it('normalizes Project V2 issue items and skipped counts', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: {
          node: {
            items: {
              nodes: [
                {
                  id: 'PVTI_issue',
                  type: 'ISSUE',
                  isArchived: false,
                  content: {
                    __typename: 'Issue',
                    id: 'I_kwDO',
                    repository: {
                      nameWithOwner: 'octo/repo',
                      name: 'repo',
                      owner: { login: 'octo' },
                    },
                    number: 1,
                    title: 'Project issue',
                    state: 'OPEN',
                    url: 'https://github.com/octo/repo/issues/1',
                    updatedAt: '2026-05-14T12:00:00Z',
                  },
                },
                { id: 'PVTI_pr', type: 'PULL_REQUEST', isArchived: false },
                { id: 'PVTI_draft', type: 'DRAFT_ISSUE', isArchived: false },
                { id: 'PVTI_redacted', type: 'REDACTED', isArchived: false },
              ],
              pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
            },
          },
        },
      }),
    );

    const result = await service.listProjectIssues({
      accessToken,
      projectId: 'PVT_kwDO',
      state: 'all',
      q: 'project',
      limit: 30,
    });

    const requestBody = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(requestBody.variables.query).toBe('project');
    expect(result.items[0]?.projectItemId).toBe('PVTI_issue');
    expect(result.skipped).toEqual({
      pullRequests: 1,
      draftIssues: 1,
      redacted: 1,
      unknown: 0,
    });
    expect(result.pagination.nextPageToken).toEqual(expect.any(String));
  });

  it('treats GraphQL errors as safe provider failures', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ errors: [{ message: `token ${accessToken}` }] }),
    );

    await expect(
      service.listProjectIssues({
        accessToken,
        projectId: 'PVT_kwDO',
        state: 'all',
        limit: 30,
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('rejects invalid page tokens', async () => {
    await expect(
      service.listRepositories({
        accessToken,
        ownerType: 'personal',
        owner: 'octocat',
        limit: 30,
        pageToken: 'not-a-token',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps REST provider errors without exposing token details', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: `bad token ${accessToken}` }, { status: 403 }),
    );

    await expect(
      service.listRepositories({
        accessToken,
        ownerType: 'personal',
        owner: 'octocat',
        limit: 30,
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});

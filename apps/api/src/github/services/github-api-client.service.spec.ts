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

  it('lists owners with personal account and member organizations', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          installations: [
            {
              id: 42,
              account: {
                login: 'octo-org',
                avatar_url: 'https://avatars.githubusercontent.com/u/1',
                html_url: 'https://github.com/octo-org',
                type: 'Organization',
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            login: 'octo-org',
            avatar_url: 'https://avatars.githubusercontent.com/u/1',
            html_url: 'https://github.com/octo-org',
          },
          {
            login: 'legacy-org',
            avatar_url: 'https://avatars.githubusercontent.com/u/2',
            html_url: 'https://github.com/legacy-org',
          },
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            state: 'active',
            organization: {
              login: 'itsua',
              avatar_url: 'https://avatars.githubusercontent.com/u/3',
            },
          },
          {
            state: 'pending',
            organization: {
              login: 'pending-org',
              avatar_url: 'https://avatars.githubusercontent.com/u/4',
            },
          },
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 3,
            node_id: 'R_repo_org',
            name: 'repo',
            full_name: 'repo-org/repo',
            owner: {
              login: 'repo-org',
              avatar_url: 'https://avatars.githubusercontent.com/u/5',
              html_url: 'https://github.com/repo-org',
              type: 'Organization',
            },
            private: true,
            archived: false,
            description: null,
            html_url: 'https://github.com/repo-org/repo',
            updated_at: '2026-05-14T12:00:00Z',
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
      'legacy-org',
      'itsua',
      'repo-org',
    ]);
    expect(
      fetchMock.mock.calls.map((call) => new URL(call[0] as URL).pathname),
    ).toEqual([
      '/user/installations',
      '/user/orgs',
      '/user/memberships/orgs',
      '/user/repos',
    ]);
    expect(JSON.stringify(result)).not.toContain(accessToken);
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
    const requestUrl = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(requestUrl.searchParams.get('affiliation')).toBe(
      'owner,collaborator,organization_member',
    );
  });

  it('merges matching app installation repositories with user-accessible repositories', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          installations: [
            {
              id: 42,
              account: { login: 'octo-org', type: 'Organization' },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 1,
            node_id: 'R_private',
            name: 'private-repo',
            full_name: 'octo-org/private-repo',
            owner: { login: 'octo-org', type: 'Organization' },
            private: true,
            archived: false,
            description: null,
            html_url: 'https://github.com/octo-org/private-repo',
            updated_at: '2026-05-14T12:00:00Z',
          },
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            repositories: [
              {
                id: 1,
                node_id: 'R_kwDO',
                name: 'public-repo',
                full_name: 'octo-org/public-repo',
                owner: { login: 'octo-org', type: 'Organization' },
                private: false,
                archived: false,
                description: null,
                html_url: 'https://github.com/octo-org/public-repo',
                updated_at: '2026-05-14T12:00:00Z',
              },
            ],
          },
          {
            link: '<https://api.github.com/user/installations/42/repositories?page=2>; rel="next"',
          },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 3,
            node_id: 'R_duplicate',
            name: 'public-repo',
            full_name: 'octo-org/public-repo',
            owner: { login: 'octo-org', type: 'Organization' },
            private: false,
            archived: false,
            description: null,
            html_url: 'https://github.com/octo-org/public-repo',
            updated_at: '2026-05-14T12:00:00Z',
          },
        ]),
      );

    const result = await service.listRepositories({
      accessToken,
      ownerType: 'organization',
      owner: 'octo-org',
      limit: 30,
    });

    const requestPaths = fetchMock.mock.calls.map(
      (call) => new URL(call[0] as URL).pathname,
    );
    expect(requestPaths).toEqual([
      '/user/installations',
      '/user/repos',
      '/user/installations/42/repositories',
      '/orgs/octo-org/repos',
    ]);
    expect(result.items.map((repo) => repo.fullName)).toEqual([
      'octo-org/private-repo',
      'octo-org/public-repo',
    ]);
    expect(result.items.map((repo) => repo.visibility)).toEqual([
      'private',
      'public',
    ]);
  });

  it('lists organization repositories through user repo membership fallback', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          installations: [
            {
              id: 42,
              account: { login: 'other-org', type: 'Organization' },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 1,
            node_id: 'R_kwDO',
            name: 'repo',
            full_name: 'itsua/repo',
            owner: { login: 'itsua', type: 'Organization' },
            private: true,
            archived: false,
            description: null,
            html_url: 'https://github.com/itsua/repo',
            updated_at: '2026-05-14T12:00:00Z',
          },
          {
            id: 2,
            node_id: 'R_other',
            name: 'other',
            full_name: 'other-org/other',
            owner: { login: 'other-org', type: 'Organization' },
            private: true,
            archived: false,
            description: null,
            html_url: 'https://github.com/other-org/other',
            updated_at: '2026-05-14T12:00:00Z',
          },
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse({ message: 'Not Found' }, { status: 404 }),
      );

    const result = await service.listRepositories({
      accessToken,
      ownerType: 'organization',
      owner: 'itsua',
      limit: 30,
    });

    const requestUrls = fetchMock.mock.calls.map(
      (call) => new URL(call[0] as URL),
    );
    expect(requestUrls.map((url) => url.pathname)).toEqual([
      '/user/installations',
      '/user/repos',
      '/orgs/itsua/repos',
    ]);
    expect(requestUrls[1]?.searchParams.get('affiliation')).toBe(
      'owner,collaborator,organization_member',
    );
    expect(requestUrls[1]?.searchParams.get('visibility')).toBe('all');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      fullName: 'itsua/repo',
      owner: 'itsua',
    });
  });

  it('lists organization repositories through the organization endpoint fallback', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ installations: [] }))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 1,
            node_id: 'R_kwDO',
            name: 'repo',
            full_name: 'itsua/repo',
            owner: { login: 'itsua', type: 'Organization' },
            private: true,
            archived: false,
            description: null,
            html_url: 'https://github.com/itsua/repo',
            updated_at: '2026-05-14T12:00:00Z',
          },
        ]),
      );

    const result = await service.listRepositories({
      accessToken,
      ownerType: 'organization',
      owner: 'itsua',
      limit: 30,
    });

    const requestUrls = fetchMock.mock.calls.map(
      (call) => new URL(call[0] as URL),
    );
    expect(requestUrls.map((url) => url.pathname)).toEqual([
      '/user/installations',
      '/user/repos',
      '/orgs/itsua/repos',
    ]);
    expect(requestUrls[2]?.searchParams.get('type')).toBe('all');
    expect(result.items[0]).toMatchObject({ fullName: 'itsua/repo' });
  });

  it('merges private user-accessible repos with public organization repos', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ installations: [] }))
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 1,
            node_id: 'R_private',
            name: 'private-repo',
            full_name: 'itsua/private-repo',
            owner: { login: 'itsua', type: 'Organization' },
            private: true,
            archived: false,
            description: null,
            html_url: 'https://github.com/itsua/private-repo',
            updated_at: '2026-05-14T12:00:00Z',
          },
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 2,
            node_id: 'R_public',
            name: 'public-repo',
            full_name: 'itsua/public-repo',
            owner: { login: 'itsua', type: 'Organization' },
            private: false,
            archived: false,
            description: null,
            html_url: 'https://github.com/itsua/public-repo',
            updated_at: '2026-05-15T12:00:00Z',
          },
        ]),
      );

    const result = await service.listRepositories({
      accessToken,
      ownerType: 'organization',
      owner: 'itsua',
      limit: 30,
    });

    expect(result.items.map((repo) => repo.fullName)).toEqual([
      'itsua/private-repo',
      'itsua/public-repo',
    ]);
    expect(result.items.map((repo) => repo.visibility)).toEqual([
      'private',
      'public',
    ]);
  });

  it('falls back to user repo membership when installation lookup fails', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ message: 'Not Found' }, { status: 404 }),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 1,
            node_id: 'R_kwDO',
            name: 'repo',
            full_name: 'itsua/repo',
            owner: { login: 'itsua', type: 'Organization' },
            private: true,
            archived: false,
            description: null,
            html_url: 'https://github.com/itsua/repo',
            updated_at: '2026-05-14T12:00:00Z',
          },
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse({ message: 'Not Found' }, { status: 404 }),
      );

    const result = await service.listRepositories({
      accessToken,
      ownerType: 'organization',
      owner: 'itsua',
      limit: 30,
    });

    const requestUrls = fetchMock.mock.calls.map(
      (call) => new URL(call[0] as URL),
    );
    expect(requestUrls.map((url) => url.pathname)).toEqual([
      '/user/installations',
      '/user/repos',
      '/orgs/itsua/repos',
    ]);
    expect(result.items[0]).toMatchObject({ fullName: 'itsua/repo' });
  });

  it('normalizes Project V2 responses with GraphQL cursor page tokens', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: {
          owner: {
            projectsV2: {
              nodes: [
                {
                  id: 'PVT_kwDO',
                  number: 7,
                  title: 'Roadmap',
                  closed: false,
                  shortDescription: null,
                  url: 'https://github.com/orgs/octo-org/projects/7',
                  updatedAt: '2026-05-14T12:00:00Z',
                },
              ],
              pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
            },
          },
        },
      }),
    );

    const result = await service.listProjects({
      accessToken,
      ownerType: 'organization',
      owner: 'octo-org',
      limit: 30,
    });

    const requestUrl = new URL(fetchMock.mock.calls[0]![0] as string);
    const requestBody = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(requestUrl.pathname).toBe('/graphql');
    expect(fetchMock.mock.calls[0]![1].method).toBe('POST');
    expect(requestBody.query).toContain('organization(login: $owner)');
    expect(requestBody.variables).toEqual({
      owner: 'octo-org',
      first: 30,
      after: null,
    });
    expect(result.items[0]?.id).toBe('PVT_kwDO');
    expect(result.items[0]?.state).toBe('open');
    expect(result.pagination.nextPageToken).toEqual(expect.any(String));
  });

  it('uses the GraphQL user scope for personal Project V2 responses', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: {
          owner: {
            projectsV2: {
              nodes: [
                {
                  id: 'PVT_personal',
                  number: 3,
                  title: 'Personal board',
                  closed: true,
                  shortDescription: 'Personal work',
                  url: 'https://github.com/users/octocat/projects/3',
                  updatedAt: '2026-05-15T12:00:00Z',
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      }),
    );

    const result = await service.listProjects({
      accessToken,
      ownerType: 'personal',
      owner: 'octocat',
      limit: 100,
    });

    const requestBody = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(requestBody.query).toContain('user(login: $owner)');
    expect(requestBody.variables.owner).toBe('octocat');
    expect(result.items[0]).toMatchObject({
      id: 'PVT_personal',
      owner: 'octocat',
      state: 'closed',
      description: 'Personal work',
    });
    expect(result.pagination.nextPageToken).toBeNull();
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

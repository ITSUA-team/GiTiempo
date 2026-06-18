import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  GitHubBrowsingPagination,
  GitHubIssue,
  GitHubIssueState,
  GitHubOwner,
  GitHubOwnerListResponse,
  GitHubOwnerScope,
  GitHubProject,
  GitHubProjectIssueListResponse,
  GitHubProjectIssueSkippedCounts,
  GitHubProjectListResponse,
  GitHubRepository,
  GitHubRepositoryIssueListResponse,
  GitHubRepositoryListResponse,
} from '@gitiempo/shared';

const GITHUB_API = 'https://api.github.com';
const GITHUB_GRAPHQL = 'https://api.github.com/graphql';

type RestPageToken = { kind: 'rest-page'; page: number };
type RestCursorToken = { kind: 'rest-cursor'; after: string };
type GraphqlCursorToken = { kind: 'graphql-cursor'; cursor: string };
type PageToken = RestPageToken | RestCursorToken | GraphqlCursorToken;

type RestResult<T> = {
  body: T;
  pagination: GitHubBrowsingPagination;
};

type GitHubOrgRest = {
  login?: string;
  avatar_url?: string | null;
  html_url?: string | null;
};

type GitHubOrgMembershipRest = {
  state?: string;
  organization?: GitHubOrgRest | null;
};

type GitHubRepoRest = {
  id?: number | string;
  node_id?: string | null;
  name?: string;
  full_name?: string;
  owner?: {
    login?: string;
    avatar_url?: string | null;
    html_url?: string | null;
    type?: string;
  };
  private?: boolean;
  visibility?: string;
  archived?: boolean;
  description?: string | null;
  html_url?: string;
  updated_at?: string;
};

type GitHubInstallationRest = {
  id?: number | string;
  account?: {
    login?: string;
    avatar_url?: string | null;
    html_url?: string | null;
    type?: string;
  } | null;
};

type GitHubInstallationListRest = {
  installations?: GitHubInstallationRest[];
};

type GitHubInstallationRepositoryListRest = {
  repositories?: GitHubRepoRest[];
};

type GitHubProjectGraphql = {
  id?: string;
  number?: number;
  title?: string;
  closed?: boolean;
  owner?: { __typename?: string; login?: string } | null;
  shortDescription?: string | null;
  url?: string | null;
  updatedAt?: string;
};

type GitHubIssueRest = {
  id?: number | string;
  node_id?: string | null;
  repository_url?: string;
  number?: number;
  title?: string;
  state?: string;
  html_url?: string;
  updated_at?: string;
  pull_request?: unknown;
};

type GitHubSearchIssuesRest = {
  items?: GitHubIssueRest[];
};

type ProjectItemContent = {
  __typename?: string;
  id?: string;
  repository?: {
    nameWithOwner?: string;
    name?: string;
    owner?: { login?: string };
  };
  number?: number;
  title?: string;
  state?: string;
  url?: string;
  updatedAt?: string;
};

type ProjectIssueGraphqlResponse = {
  data?: {
    node?: {
      id?: string;
      items?: {
        nodes?: Array<{
          id?: string;
          type?: string;
          isArchived?: boolean;
          content?: ProjectItemContent | null;
        } | null>;
        pageInfo?: {
          hasNextPage?: boolean;
          endCursor?: string | null;
        };
      };
    } | null;
  };
  errors?: unknown[];
};

type ProjectIssueItemGraphqlResponse = {
  data?: {
    node?: {
      id?: string;
      type?: string;
      isArchived?: boolean;
      project?: { id?: string } | null;
      content?: ProjectItemContent | null;
    } | null;
  };
  errors?: unknown[];
};

type ProjectListGraphqlResponse = {
  data?: {
    owner?: {
      projectsV2?: {
        nodes?: Array<GitHubProjectGraphql | null>;
        pageInfo?: {
          hasNextPage?: boolean;
          endCursor?: string | null;
        };
      } | null;
    } | null;
  };
  errors?: unknown[];
};

type ProjectNodeGraphqlResponse = {
  data?: {
    node?: GitHubProjectGraphql | null;
  };
  errors?: unknown[];
};

export type GitHubProjectIssueItemLookup = {
  item: GitHubProjectIssueListResponse['items'][number];
  projectId: string;
};

@Injectable()
export class GithubApiClientService {
  private readonly logger = new Logger(GithubApiClientService.name);

  async listOwners(
    accessToken: string,
    personal: { login: string; avatarUrl: string | null },
    type: 'all' | 'personal' | 'organization',
  ): Promise<GitHubOwnerListResponse> {
    const items = new Map<string, GitHubOwner>();
    const addOwner = (owner: GitHubOwner): void => {
      items.set(`${owner.type}:${owner.login.toLowerCase()}`, owner);
    };

    if (type === 'all' || type === 'personal') {
      addOwner({
        login: personal.login,
        label: personal.login,
        type: 'personal',
        avatarUrl: personal.avatarUrl,
        url: `https://github.com/${personal.login}`,
      });
    }
    if (type === 'all' || type === 'organization') {
      try {
        for (const installation of await this.listInstallations(accessToken)) {
          const owner = this.toInstallationOwner(installation);
          if (owner) addOwner(owner);
        }
      } catch (error) {
        this.logOwnerSourceFailure('installations', error);
      }

      try {
        for (const org of await this.listUserOrganizations(accessToken)) {
          const owner = this.toOrganizationOwner(org);
          if (owner) addOwner(owner);
        }
      } catch (error) {
        this.logOwnerSourceFailure('organizations', error);
      }

      try {
        const memberships = await this.listOrganizationMemberships(accessToken);
        for (const membership of memberships) {
          if (membership.state !== 'active') continue;
          const owner = this.toOrganizationOwner(
            membership.organization ?? null,
          );
          if (owner) addOwner(owner);
        }
      } catch (error) {
        this.logOwnerSourceFailure('memberships', error);
      }

      try {
        const repos =
          await this.listOrganizationMemberRepositories(accessToken);
        for (const repo of repos) {
          const owner = this.toRepositoryOrganizationOwner(repo);
          if (owner) addOwner(owner);
        }
      } catch (error) {
        this.logOwnerSourceFailure('repository_memberships', error);
      }
    }
    return { items: [...items.values()] };
  }

  async listRepositories(input: {
    accessToken: string;
    ownerType: GitHubOwnerScope;
    owner: string;
    limit: number;
    pageToken?: string;
  }): Promise<GitHubRepositoryListResponse> {
    const page = this.decodePage(input.pageToken, 'rest-page') ?? 1;
    if (input.ownerType === 'organization') {
      let installation: GitHubInstallationRest | null = null;
      try {
        installation = await this.findInstallationForOwner(
          input.accessToken,
          input.owner,
        );
      } catch (error) {
        this.logger.warn({
          event: 'github.repositories.installation_lookup_failed',
          reason: error instanceof Error ? error.message : String(error),
        });
      }

      const responses: GitHubRepositoryListResponse[] = [];

      try {
        this.addRepositorySourceResponse(
          responses,
          'user_organization_repositories',
          input.owner,
          await this.listUserOrganizationRepositories(
            input.accessToken,
            input.owner,
            input.limit,
          ),
        );
      } catch (error) {
        this.logRepositorySourceFailure(
          'user_organization_repositories',
          error,
        );
      }

      if (installation?.id !== undefined) {
        try {
          this.addRepositorySourceResponse(
            responses,
            'installation_repositories',
            input.owner,
            await this.listInstallationRepositories(
              input.accessToken,
              installation.id,
              input.limit,
              page,
            ),
          );
        } catch (error) {
          this.logRepositorySourceFailure('installation_repositories', error);
        }
      }

      try {
        this.addRepositorySourceResponse(
          responses,
          'organization_repositories',
          input.owner,
          await this.listOrganizationRepositories(
            input.accessToken,
            input.owner,
            input.limit,
            page,
          ),
        );
      } catch (error) {
        this.logRepositorySourceFailure('organization_repositories', error);
      }

      if (responses.length > 0) {
        return this.mergeRepositoryResponses(responses, input.limit);
      }

      throw new ServiceUnavailableException('GitHub API request failed');
    }

    const path = '/user/repos';
    const query: Record<string, string> = {
      per_page: String(input.limit),
      page: String(page),
      sort: 'updated',
      affiliation: 'owner,collaborator,organization_member',
    };

    const result = await this.rest<GitHubRepoRest[]>(
      input.accessToken,
      path,
      query,
      'rest-page',
    );
    return {
      items: result.body.map((repo) => this.toRepository(repo)),
      pagination: result.pagination,
    };
  }

  async getRepository(input: {
    accessToken: string;
    owner: string;
    repo: string;
  }): Promise<GitHubRepository> {
    const result = await this.rest<GitHubRepoRest>(
      input.accessToken,
      `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}`,
      {},
      null,
    );

    return this.toRepository(result.body);
  }

  private async listInstallationRepositories(
    accessToken: string,
    installationId: number | string,
    limit: number,
    page: number,
  ): Promise<GitHubRepositoryListResponse> {
    const result = await this.rest<GitHubInstallationRepositoryListRest>(
      accessToken,
      `/user/installations/${encodeURIComponent(String(installationId))}/repositories`,
      {
        per_page: String(limit),
        page: String(page),
      },
      'rest-page',
    );
    if (!Array.isArray(result.body.repositories)) {
      throw new ServiceUnavailableException('GitHub API returned invalid data');
    }
    return {
      items: result.body.repositories.map((repo) => this.toRepository(repo)),
      pagination: result.pagination,
    };
  }

  private async listOrganizationRepositories(
    accessToken: string,
    owner: string,
    limit: number,
    page: number,
  ): Promise<GitHubRepositoryListResponse> {
    const result = await this.rest<GitHubRepoRest[]>(
      accessToken,
      `/orgs/${encodeURIComponent(owner)}/repos`,
      {
        per_page: String(limit),
        page: String(page),
        sort: 'updated',
        type: 'all',
      },
      'rest-page',
    );

    if (!Array.isArray(result.body)) {
      throw new ServiceUnavailableException('GitHub API returned invalid data');
    }

    return {
      items: result.body.map((repo) => this.toRepository(repo)),
      pagination: result.pagination,
    };
  }

  async listProjects(input: {
    accessToken: string;
    ownerType: GitHubOwnerScope;
    owner: string;
    limit: number;
    pageToken?: string;
  }): Promise<GitHubProjectListResponse> {
    const after = this.decodePage(input.pageToken, 'graphql-cursor');
    const ownerSelection =
      input.ownerType === 'personal'
        ? 'user(login: $owner)'
        : 'organization(login: $owner)';
    const query = `
      query($owner: String!, $first: Int!, $after: String) {
        owner: ${ownerSelection} {
          projectsV2(
            first: $first,
            after: $after,
            orderBy: { field: UPDATED_AT, direction: DESC }
          ) {
            nodes {
              id
              number
              title
              closed
              shortDescription
              url
              updatedAt
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    `;
    const body = await this.graphql<ProjectListGraphqlResponse>(
      input.accessToken,
      query,
      {
        owner: input.owner,
        first: input.limit,
        after,
      },
    );
    const projects = body.data?.owner?.projectsV2;
    if (!projects?.nodes || !projects.pageInfo) {
      throw new ServiceUnavailableException('GitHub API returned invalid data');
    }

    return {
      items: projects.nodes.flatMap((project) =>
        project ? [this.toProject(project, input.owner, input.ownerType)] : [],
      ),
      pagination: {
        limit: input.limit,
        hasNextPage: projects.pageInfo.hasNextPage === true,
        nextPageToken:
          projects.pageInfo.hasNextPage && projects.pageInfo.endCursor
            ? this.encodePage({
                kind: 'graphql-cursor',
                cursor: projects.pageInfo.endCursor,
              })
            : null,
      },
    };
  }

  async getProject(input: {
    accessToken: string;
    projectId: string;
  }): Promise<GitHubProject> {
    const query = `
      query($id: ID!) {
        node(id: $id) {
          ... on ProjectV2 {
            id
            number
            title
            closed
            owner {
              __typename
              ... on User { login }
              ... on Organization { login }
            }
            shortDescription
            url
            updatedAt
          }
        }
      }
    `;
    const body = await this.graphql<ProjectNodeGraphqlResponse>(
      input.accessToken,
      query,
      { id: input.projectId },
    );
    const project = body.data?.node;
    if (!project?.owner?.login) {
      throw new ServiceUnavailableException('GitHub API returned invalid data');
    }

    return this.toProject(
      project,
      project.owner.login,
      project.owner.__typename === 'User' ? 'personal' : 'organization',
    );
  }

  async listRepositoryIssues(input: {
    accessToken: string;
    owner: string;
    repo: string;
    state: GitHubIssueState;
    q?: string;
    limit: number;
    pageToken?: string;
  }): Promise<GitHubRepositoryIssueListResponse> {
    const page = this.decodePage(input.pageToken, 'rest-page') ?? 1;
    if (input.q) {
      return this.searchRepositoryIssues({
        accessToken: input.accessToken,
        owner: input.owner,
        repo: input.repo,
        state: input.state,
        q: input.q,
        limit: input.limit,
        page,
      });
    }

    const result = await this.rest<GitHubIssueRest[]>(
      input.accessToken,
      `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues`,
      {
        state: input.state,
        per_page: String(input.limit),
        page: String(page),
      },
      'rest-page',
    );
    return {
      items: result.body
        .filter((issue) => issue.pull_request === undefined)
        .map((issue) => this.toIssue(issue, input.owner, input.repo)),
      pagination: result.pagination,
    };
  }

  async getRepositoryIssue(input: {
    accessToken: string;
    owner: string;
    repo: string;
    issueNumber: number;
  }): Promise<GitHubIssue> {
    const result = await this.rest<GitHubIssueRest>(
      input.accessToken,
      `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues/${input.issueNumber}`,
      {},
      null,
    );
    if (result.body.pull_request !== undefined) {
      throw new ServiceUnavailableException('GitHub API returned invalid data');
    }

    return this.toIssue(result.body, input.owner, input.repo);
  }

  async listProjectIssues(input: {
    accessToken: string;
    projectId: string;
    state: GitHubIssueState;
    q?: string;
    limit: number;
    pageToken?: string;
  }): Promise<GitHubProjectIssueListResponse> {
    const after = this.decodePage(input.pageToken, 'graphql-cursor');
    const query = `
      query($id: ID!, $first: Int!, $after: String, $query: String) {
        node(id: $id) {
          ... on ProjectV2 {
            items(first: $first, after: $after, query: $query) {
              nodes {
                id
                type
                isArchived
                content {
                  __typename
                  ... on Issue {
                    id
                    repository {
                      nameWithOwner
                      name
                      owner { login }
                    }
                    number
                    title
                    state
                    url
                    updatedAt
                  }
                }
              }
              pageInfo { hasNextPage endCursor }
            }
          }
        }
      }
    `;
    const body = await this.graphql<ProjectIssueGraphqlResponse>(
      input.accessToken,
      query,
      {
        id: input.projectId,
        first: input.limit,
        after,
        query: input.q ?? null,
      },
    );
    const items = body.data?.node?.items;
    if (!items?.nodes || !items.pageInfo) {
      throw new ServiceUnavailableException('GitHub API returned invalid data');
    }
    const skipped: GitHubProjectIssueSkippedCounts = {
      pullRequests: 0,
      draftIssues: 0,
      redacted: 0,
      unknown: 0,
    };
    const normalized: GitHubProjectIssueListResponse['items'] = [];
    for (const node of items.nodes) {
      const item = this.toProjectIssueItem(node, input.state, skipped);
      if (item) normalized.push(item);
    }
    return {
      items: normalized,
      pagination: {
        limit: input.limit,
        hasNextPage: items.pageInfo.hasNextPage === true,
        nextPageToken:
          items.pageInfo.hasNextPage && items.pageInfo.endCursor
            ? this.encodePage({
                kind: 'graphql-cursor',
                cursor: items.pageInfo.endCursor,
              })
            : null,
      },
      skipped,
    };
  }

  async getProjectIssueItem(input: {
    accessToken: string;
    projectItemId: string;
  }): Promise<GitHubProjectIssueItemLookup> {
    const query = `
      query($id: ID!) {
        node(id: $id) {
          ... on ProjectV2Item {
            id
            type
            isArchived
            project { id }
            content {
              __typename
              ... on Issue {
                id
                repository {
                  nameWithOwner
                  name
                  owner { login }
                }
                number
                title
                state
                url
                updatedAt
              }
            }
          }
        }
      }
    `;
    const body = await this.graphql<ProjectIssueItemGraphqlResponse>(
      input.accessToken,
      query,
      { id: input.projectItemId },
    );
    const node = body.data?.node;
    if (!node?.project?.id) {
      throw new ServiceUnavailableException('GitHub API returned invalid data');
    }
    const skipped: GitHubProjectIssueSkippedCounts = {
      draftIssues: 0,
      pullRequests: 0,
      redacted: 0,
      unknown: 0,
    };
    const item = this.toProjectIssueItem(node, 'all', skipped);
    if (!item) {
      throw new ServiceUnavailableException('GitHub API returned invalid data');
    }

    return { item, projectId: node.project.id };
  }

  private async searchRepositoryIssues(input: {
    accessToken: string;
    owner: string;
    repo: string;
    state: GitHubIssueState;
    q: string;
    limit: number;
    page: number;
  }): Promise<GitHubRepositoryIssueListResponse> {
    const terms = [input.q, `repo:${input.owner}/${input.repo}`, 'is:issue'];
    if (input.state !== 'all') terms.push(`state:${input.state}`);
    const result = await this.rest<GitHubSearchIssuesRest>(
      input.accessToken,
      '/search/issues',
      {
        q: terms.join(' '),
        per_page: String(input.limit),
        page: String(input.page),
      },
      'rest-page',
    );
    return {
      items: (result.body.items ?? []).map((issue) =>
        this.toIssue(issue, input.owner, input.repo),
      ),
      pagination: result.pagination,
    };
  }

  private async listInstallations(
    accessToken: string,
  ): Promise<GitHubInstallationRest[]> {
    const result = await this.rest<GitHubInstallationListRest>(
      accessToken,
      '/user/installations',
      { per_page: '100' },
      null,
    );
    if (!Array.isArray(result.body.installations)) {
      throw new ServiceUnavailableException('GitHub API returned invalid data');
    }

    return result.body.installations;
  }

  private async listUserOrganizations(
    accessToken: string,
  ): Promise<GitHubOrgRest[]> {
    const result = await this.rest<GitHubOrgRest[]>(
      accessToken,
      '/user/orgs',
      { per_page: '100' },
      null,
    );

    if (!Array.isArray(result.body)) {
      throw new ServiceUnavailableException('GitHub API returned invalid data');
    }

    return result.body;
  }

  private async listOrganizationMemberships(
    accessToken: string,
  ): Promise<GitHubOrgMembershipRest[]> {
    const result = await this.rest<GitHubOrgMembershipRest[]>(
      accessToken,
      '/user/memberships/orgs',
      { per_page: '100', state: 'active' },
      null,
    );

    if (!Array.isArray(result.body)) {
      throw new ServiceUnavailableException('GitHub API returned invalid data');
    }

    return result.body;
  }

  private async listOrganizationMemberRepositories(
    accessToken: string,
    owner?: string,
  ): Promise<GitHubRepoRest[]> {
    const repositories: GitHubRepoRest[] = [];
    const normalizedOwner = owner?.toLowerCase();
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage && page <= 10) {
      const result = await this.rest<GitHubRepoRest[]>(
        accessToken,
        '/user/repos',
        {
          affiliation: 'owner,collaborator,organization_member',
          page: String(page),
          per_page: '100',
          sort: 'updated',
          visibility: 'all',
        },
        'rest-page',
      );

      if (!Array.isArray(result.body)) {
        throw new ServiceUnavailableException(
          'GitHub API returned invalid data',
        );
      }

      repositories.push(
        ...result.body.filter((repo) => {
          if (!normalizedOwner) return true;
          return (
            this.repositoryOwnerLogin(repo)?.toLowerCase() === normalizedOwner
          );
        }),
      );
      hasNextPage = result.pagination.hasNextPage;
      page += 1;
    }

    return repositories;
  }

  private async listUserOrganizationRepositories(
    accessToken: string,
    owner: string,
    limit: number,
  ): Promise<GitHubRepositoryListResponse> {
    const repositories = await this.listOrganizationMemberRepositories(
      accessToken,
      owner,
    );

    return {
      items: repositories
        .slice(0, limit)
        .map((repo) => this.toRepository(repo)),
      pagination: {
        hasNextPage: repositories.length > limit,
        limit,
        nextPageToken: null,
      },
    };
  }

  private mergeRepositoryResponses(
    responses: GitHubRepositoryListResponse[],
    limit: number,
  ): GitHubRepositoryListResponse {
    if (responses.length === 1) return responses[0]!;

    const repositories = new Map<string, GitHubRepository>();
    for (const response of responses) {
      for (const repository of response.items) {
        repositories.set(repository.fullName.toLowerCase(), repository);
      }
    }

    const items = [...repositories.values()];

    return {
      items: items.slice(0, limit),
      pagination: {
        hasNextPage: false,
        limit,
        nextPageToken: null,
      },
    };
  }

  private addRepositorySourceResponse(
    responses: GitHubRepositoryListResponse[],
    source: string,
    owner: string,
    response: GitHubRepositoryListResponse,
  ): void {
    this.logger.log({
      event: 'github.repositories.source_result',
      owner,
      privateCount: response.items.filter(
        (repository) => repository.visibility === 'private',
      ).length,
      publicCount: response.items.filter(
        (repository) => repository.visibility === 'public',
      ).length,
      source,
      totalCount: response.items.length,
    });
    responses.push(response);
  }

  private async findInstallationForOwner(
    accessToken: string,
    owner: string,
  ): Promise<GitHubInstallationRest | null> {
    const normalizedOwner = owner.toLowerCase();
    const installations = await this.listInstallations(accessToken);

    return (
      installations.find(
        (installation) =>
          installation.account?.login?.toLowerCase() === normalizedOwner,
      ) ?? null
    );
  }

  private async rest<T>(
    accessToken: string,
    path: string,
    query: Record<string, string>,
    paginationKind: 'rest-page' | 'rest-cursor' | null,
  ): Promise<RestResult<T>> {
    const url = new URL(path, GITHUB_API);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
    const response = await fetch(url, {
      headers: this.headers(accessToken),
    });
    const body = (await this.readJson(response)) as T;
    if (!response.ok) {
      this.logger.warn({
        event: 'github.api.request_failed',
        status: response.status,
        path,
      });
      throw new ServiceUnavailableException('GitHub API request failed');
    }
    return {
      body,
      pagination: this.toRestPagination(
        response.headers.get('link'),
        Number(query.per_page ?? 30),
        paginationKind,
      ),
    };
  }

  private async graphql<T>(
    accessToken: string,
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(GITHUB_GRAPHQL, {
      method: 'POST',
      headers: {
        ...this.headers(accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
    const body = (await this.readJson(response)) as T & { errors?: unknown[] };
    if (
      !response.ok ||
      (Array.isArray(body.errors) && body.errors.length > 0)
    ) {
      this.logger.warn({
        event: 'github.graphql.request_failed',
        status: response.status,
        hasErrors: Array.isArray(body.errors) && body.errors.length > 0,
      });
      throw new ServiceUnavailableException('GitHub API request failed');
    }
    return body;
  }

  private async readJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw new ServiceUnavailableException('GitHub API returned invalid JSON');
    }
  }

  private headers(accessToken: string): HeadersInit {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'gitiempo-api',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  private toRestPagination(
    link: string | null,
    limit: number,
    kind: 'rest-page' | 'rest-cursor' | null,
  ): GitHubBrowsingPagination {
    const next = kind ? this.nextLink(link) : null;
    return {
      limit,
      hasNextPage: next !== null,
      nextPageToken: next ? this.encodeRestNext(next, kind!) : null,
    };
  }

  private nextLink(link: string | null): URL | null {
    if (!link) return null;
    for (const part of link.split(',')) {
      const [rawUrl, rawRel] = part
        .trim()
        .split(';')
        .map((value) => value.trim());
      if (rawRel !== 'rel="next"' || !rawUrl) continue;
      const match = rawUrl.match(/^<(.+)>$/);
      return match ? new URL(match[1]!) : null;
    }
    return null;
  }

  private encodeRestNext(
    url: URL,
    kind: 'rest-page' | 'rest-cursor',
  ): string | null {
    if (kind === 'rest-page') {
      const page = Number(url.searchParams.get('page'));
      return Number.isInteger(page) && page > 0
        ? this.encodePage({ kind, page })
        : null;
    }
    const after = url.searchParams.get('after');
    return after ? this.encodePage({ kind, after }) : null;
  }

  private encodePage(token: PageToken): string {
    return Buffer.from(JSON.stringify(token), 'utf8').toString('base64url');
  }

  private decodePage(
    value: string | undefined,
    kind: 'rest-page',
  ): number | null;
  private decodePage(
    value: string | undefined,
    kind: 'rest-cursor' | 'graphql-cursor',
  ): string | null;
  private decodePage(
    value: string | undefined,
    kind: PageToken['kind'],
  ): number | string | null {
    if (!value) return null;
    try {
      const parsed = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      ) as PageToken;
      if (parsed.kind !== kind) throw new Error('token kind mismatch');
      if (kind === 'rest-page' && 'page' in parsed) return parsed.page;
      if (kind === 'rest-cursor' && 'after' in parsed) return parsed.after;
      if (kind === 'graphql-cursor' && 'cursor' in parsed) {
        return parsed.cursor;
      }
    } catch {
      throw new BadRequestException('Invalid pageToken');
    }
    throw new BadRequestException('Invalid pageToken');
  }

  private toRepository(repo: GitHubRepoRest): GitHubRepository {
    if (!repo.id || !repo.name || !repo.full_name || !repo.html_url) {
      throw new ServiceUnavailableException('GitHub API returned invalid data');
    }
    return {
      id: String(repo.id),
      nodeId: repo.node_id ?? null,
      owner: repo.owner?.login ?? repo.full_name.split('/')[0]!,
      name: repo.name,
      fullName: repo.full_name,
      visibility: this.toRepoVisibility(repo),
      isArchived: repo.archived === true,
      description: repo.description ?? null,
      url: repo.html_url,
      updatedAt: this.requireDate(repo.updated_at),
    };
  }

  private toInstallationOwner(
    installation: GitHubInstallationRest,
  ): GitHubOwner | null {
    const account = installation.account;
    if (!account?.login || account.type?.toLowerCase() !== 'organization') {
      return null;
    }

    return {
      login: account.login,
      label: account.login,
      type: 'organization',
      avatarUrl: account.avatar_url ?? null,
      url: account.html_url ?? `https://github.com/${account.login}`,
    };
  }

  private toOrganizationOwner(org: GitHubOrgRest | null): GitHubOwner | null {
    if (!org?.login) return null;

    return {
      login: org.login,
      label: org.login,
      type: 'organization',
      avatarUrl: org.avatar_url ?? null,
      url: org.html_url ?? `https://github.com/${org.login}`,
    };
  }

  private toRepositoryOrganizationOwner(
    repo: GitHubRepoRest,
  ): GitHubOwner | null {
    const login = this.repositoryOwnerLogin(repo);
    if (!login || repo.owner?.type?.toLowerCase() !== 'organization') {
      return null;
    }

    return {
      login,
      label: login,
      type: 'organization',
      avatarUrl: repo.owner?.avatar_url ?? null,
      url: repo.owner?.html_url ?? `https://github.com/${login}`,
    };
  }

  private repositoryOwnerLogin(repo: GitHubRepoRest): string | null {
    return repo.owner?.login ?? repo.full_name?.split('/')[0] ?? null;
  }

  private logOwnerSourceFailure(source: string, error: unknown): void {
    this.logger.warn({
      event: 'github.owners.source_failed',
      reason: error instanceof Error ? error.message : String(error),
      source,
    });
  }

  private logRepositorySourceFailure(source: string, error: unknown): void {
    this.logger.warn({
      event: 'github.repositories.source_failed',
      reason: error instanceof Error ? error.message : String(error),
      source,
    });
  }

  private toProject(
    project: GitHubProjectGraphql,
    fallbackOwner: string,
    ownerType: GitHubOwnerScope,
  ): GitHubProject {
    if (!project.id || !project.number || !project.title) {
      throw new ServiceUnavailableException('GitHub API returned invalid data');
    }
    return {
      id: project.id,
      number: project.number,
      title: project.title,
      owner: fallbackOwner,
      state: project.closed === true ? 'closed' : 'open',
      description: project.shortDescription ?? null,
      url:
        project.url ??
        this.projectUrl(fallbackOwner, ownerType, project.number),
      updatedAt: this.requireDate(project.updatedAt),
    };
  }

  private toIssue(
    issue: GitHubIssueRest,
    owner: string,
    repo: string,
  ): GitHubIssue {
    if (!issue.id || !issue.number || !issue.title || !issue.html_url) {
      throw new ServiceUnavailableException('GitHub API returned invalid data');
    }
    return {
      id: String(issue.id),
      nodeId: issue.node_id ?? null,
      repository: {
        owner,
        name: repo,
        fullName: `${owner}/${repo}`,
      },
      number: issue.number,
      title: issue.title,
      state: issue.state === 'closed' ? 'closed' : 'open',
      url: issue.html_url,
      updatedAt: this.requireDate(issue.updated_at),
    };
  }

  private toProjectIssueItem(
    node: {
      id?: string;
      type?: string;
      isArchived?: boolean;
      content?: ProjectItemContent | null;
    } | null,
    state: GitHubIssueState,
    skipped: GitHubProjectIssueSkippedCounts,
  ): GitHubProjectIssueListResponse['items'][number] | null {
    if (!node || !node.id) {
      skipped.unknown += 1;
      return null;
    }
    if (node.type === 'PULL_REQUEST') {
      skipped.pullRequests += 1;
      return null;
    }
    if (node.type === 'DRAFT_ISSUE') {
      skipped.draftIssues += 1;
      return null;
    }
    if (node.type === 'REDACTED') {
      skipped.redacted += 1;
      return null;
    }
    if (node.type !== 'ISSUE' || node.content?.__typename !== 'Issue') {
      skipped.unknown += 1;
      return null;
    }
    const issue = this.toGraphqlIssue(node.content);
    if (state !== 'all' && issue.state !== state) return null;
    return {
      projectItemId: node.id,
      isArchived: node.isArchived === true,
      issue,
    };
  }

  private toGraphqlIssue(content: ProjectItemContent): GitHubIssue {
    const nameWithOwner = content.repository?.nameWithOwner;
    const owner = content.repository?.owner?.login;
    const name = content.repository?.name;
    if (
      !content.id ||
      !owner ||
      !name ||
      !nameWithOwner ||
      !content.number ||
      !content.title ||
      !content.url
    ) {
      throw new ServiceUnavailableException('GitHub API returned invalid data');
    }
    return {
      id: content.id,
      nodeId: content.id,
      repository: { owner, name, fullName: nameWithOwner },
      number: content.number,
      title: content.title,
      state: content.state === 'CLOSED' ? 'closed' : 'open',
      url: content.url,
      updatedAt: this.requireDate(content.updatedAt),
    };
  }

  private toRepoVisibility(
    repo: GitHubRepoRest,
  ): GitHubRepository['visibility'] {
    if (repo.visibility === 'internal') return 'internal';
    if (repo.private === true || repo.visibility === 'private')
      return 'private';
    return 'public';
  }

  private projectUrl(
    owner: string,
    ownerType: GitHubOwnerScope,
    number: number,
  ): string {
    const base = ownerType === 'personal' ? 'users' : 'orgs';
    return `https://github.com/${base}/${owner}/projects/${number}`;
  }

  private requireDate(value: string | undefined): string {
    const result = value ? new Date(value) : null;
    if (!result || Number.isNaN(result.getTime())) {
      throw new ServiceUnavailableException('GitHub API returned invalid data');
    }
    return result.toISOString();
  }
}

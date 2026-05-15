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

type GitHubRepoRest = {
  id?: number | string;
  node_id?: string | null;
  name?: string;
  full_name?: string;
  owner?: { login?: string };
  private?: boolean;
  visibility?: string;
  archived?: boolean;
  description?: string | null;
  html_url?: string;
  updated_at?: string;
};

type GitHubProjectRest = {
  node_id?: string;
  number?: number;
  title?: string;
  owner?: { login?: string };
  state?: string;
  description?: string | null;
  short_description?: string | null;
  html_url?: string | null;
  updated_at?: string;
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

@Injectable()
export class GithubApiClientService {
  private readonly logger = new Logger(GithubApiClientService.name);

  async listOwners(
    accessToken: string,
    personal: { login: string; avatarUrl: string | null },
    type: 'all' | 'personal' | 'organization',
  ): Promise<GitHubOwnerListResponse> {
    const items: GitHubOwner[] = [];
    if (type === 'all' || type === 'personal') {
      items.push({
        login: personal.login,
        label: personal.login,
        type: 'personal',
        avatarUrl: personal.avatarUrl,
        url: `https://github.com/${personal.login}`,
      });
    }
    if (type === 'all' || type === 'organization') {
      const orgs = await this.rest<GitHubOrgRest[]>(
        accessToken,
        '/user/orgs',
        { per_page: '100' },
        null,
      );
      for (const org of orgs.body) {
        if (!org.login) continue;
        items.push({
          login: org.login,
          label: org.login,
          type: 'organization',
          avatarUrl: org.avatar_url ?? null,
          url: org.html_url ?? `https://github.com/${org.login}`,
        });
      }
    }
    return { items };
  }

  async listRepositories(input: {
    accessToken: string;
    ownerType: GitHubOwnerScope;
    owner: string;
    limit: number;
    pageToken?: string;
  }): Promise<GitHubRepositoryListResponse> {
    const page = this.decodePage(input.pageToken, 'rest-page') ?? 1;
    const path =
      input.ownerType === 'personal'
        ? '/user/repos'
        : `/orgs/${encodeURIComponent(input.owner)}/repos`;
    const query: Record<string, string> = {
      per_page: String(input.limit),
      page: String(page),
      sort: 'updated',
    };
    if (input.ownerType === 'personal') query.affiliation = 'owner';
    else query.type = 'all';

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

  async listProjects(input: {
    accessToken: string;
    ownerType: GitHubOwnerScope;
    owner: string;
    limit: number;
    pageToken?: string;
  }): Promise<GitHubProjectListResponse> {
    const after = this.decodePage(input.pageToken, 'rest-cursor');
    const path =
      input.ownerType === 'personal'
        ? `/users/${encodeURIComponent(input.owner)}/projectsV2`
        : `/orgs/${encodeURIComponent(input.owner)}/projectsV2`;
    const query: Record<string, string> = { per_page: String(input.limit) };
    if (after) query.after = after;

    const result = await this.rest<GitHubProjectRest[]>(
      input.accessToken,
      path,
      query,
      'rest-cursor',
    );
    return {
      items: result.body.map((project) =>
        this.toProject(project, input.owner, input.ownerType),
      ),
      pagination: result.pagination,
    };
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

  private toProject(
    project: GitHubProjectRest,
    fallbackOwner: string,
    ownerType: GitHubOwnerScope,
  ): GitHubProject {
    if (!project.node_id || !project.number || !project.title) {
      throw new ServiceUnavailableException('GitHub API returned invalid data');
    }
    const owner = project.owner?.login ?? fallbackOwner;
    return {
      id: project.node_id,
      number: project.number,
      title: project.title,
      owner,
      state: project.state === 'closed' ? 'closed' : 'open',
      description: project.description ?? project.short_description ?? null,
      url:
        project.html_url ?? this.projectUrl(owner, ownerType, project.number),
      updatedAt: this.requireDate(project.updated_at),
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

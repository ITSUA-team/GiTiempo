import {
  githubAuthUrlResponseSchema,
  githubConnectionStatusResponseSchema,
  githubIssueListQuerySchema,
  githubOwnerListQuerySchema,
  githubOwnerListResponseSchema,
  githubProjectIssueListResponseSchema,
  githubProjectListQuerySchema,
  githubProjectListResponseSchema,
  githubRepositoryIssueListResponseSchema,
  githubRepositoryListQuerySchema,
  githubRepositoryListResponseSchema,
  type GitHubAuthUrlResponse,
  type GitHubConnectionStatusResponse,
  type GitHubIssueListQuery,
  type GitHubOwnerListQuery,
  type GitHubOwnerListResponse,
  type GitHubProjectIssueListResponse,
  type GitHubProjectListQuery,
  type GitHubProjectListResponse,
  type GitHubRepositoryIssueListResponse,
  type GitHubRepositoryListQuery,
  type GitHubRepositoryListResponse,
} from "@gitiempo/shared";
import type { AuthenticatedApiClient } from "@gitiempo/web-shared/http";

interface GitHubClientOptions {
  apiClient: Pick<AuthenticatedApiClient, "requestJson" | "requestNoContent">;
}

/* eslint-disable no-unused-vars */

export interface GitHubClient {
  disconnect(): Promise<void>;
  getAuthUrl(): Promise<GitHubAuthUrlResponse>;
  getConnectionStatus(): Promise<GitHubConnectionStatusResponse>;
  listOwners(query?: Partial<GitHubOwnerListQuery>): Promise<GitHubOwnerListResponse>;
  listProjects(query: GitHubProjectListQuery): Promise<GitHubProjectListResponse>;
  listProjectIssues(
    projectId: string,
    query?: Partial<GitHubIssueListQuery>,
  ): Promise<GitHubProjectIssueListResponse>;
  listRepositories(
    query: GitHubRepositoryListQuery,
  ): Promise<GitHubRepositoryListResponse>;
  listRepositoryIssues(
    owner: string,
    repo: string,
    query?: Partial<GitHubIssueListQuery>,
  ): Promise<GitHubRepositoryIssueListResponse>;
}

/* eslint-enable no-unused-vars */

function buildQueryString(query: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }

  return searchParams.toString();
}

function withQuery(path: string, query: Record<string, unknown>): string {
  const search = buildQueryString(query);

  return search ? `${path}?${search}` : path;
}

export function createGitHubClient({ apiClient }: GitHubClientOptions): GitHubClient {
  return {
    async disconnect() {
      await apiClient.requestNoContent({
        method: "DELETE",
        path: "/github/connection",
      });
    },
    getAuthUrl() {
      return apiClient.requestJson({
        path: "/github/auth-url",
        responseSchema: githubAuthUrlResponseSchema,
      });
    },
    getConnectionStatus() {
      return apiClient.requestJson({
        path: "/github/connection",
        responseSchema: githubConnectionStatusResponseSchema,
      });
    },
    listOwners(query) {
      const parsed = githubOwnerListQuerySchema.parse(query ?? {});

      return apiClient.requestJson({
        path: withQuery("/github/owners", parsed),
        responseSchema: githubOwnerListResponseSchema,
      });
    },
    listProjects(query) {
      const parsed = githubProjectListQuerySchema.parse(query);

      return apiClient.requestJson({
        path: withQuery("/github/projects", parsed),
        responseSchema: githubProjectListResponseSchema,
      });
    },
    listProjectIssues(projectId, query) {
      const parsed = githubIssueListQuerySchema.parse(query ?? {});

      return apiClient.requestJson({
        path: withQuery(`/github/projects/${encodeURIComponent(projectId)}/issues`, parsed),
        responseSchema: githubProjectIssueListResponseSchema,
      });
    },
    listRepositories(query) {
      const parsed = githubRepositoryListQuerySchema.parse(query);

      return apiClient.requestJson({
        path: withQuery("/github/repos", parsed),
        responseSchema: githubRepositoryListResponseSchema,
      });
    },
    listRepositoryIssues(owner, repo, query) {
      const parsed = githubIssueListQuerySchema.parse(query ?? {});

      return apiClient.requestJson({
        path: withQuery(
          `/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
          parsed,
        ),
        responseSchema: githubRepositoryIssueListResponseSchema,
      });
    },
  };
}

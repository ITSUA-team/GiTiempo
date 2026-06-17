import {
  githubOwnerListResponseSchema,
  githubProjectIssueListResponseSchema,
  githubProjectListResponseSchema,
  githubRepositoryIssueListResponseSchema,
  githubRepositoryListResponseSchema,
  type GitHubOwnerListQuery,
  type GitHubOwnerListResponse,
  type GitHubProjectIssueListResponse,
  type GitHubProjectListQuery,
  type GitHubProjectListResponse,
  type GitHubRepositoryIssueListResponse,
  type GitHubRepositoryListQuery,
  type GitHubRepositoryListResponse,
} from "@gitiempo/shared";

import type { AuthenticatedApiClient } from "./http";

type GitHubIssueListQueryInput = {
  limit?: number | string;
  pageToken?: string;
  q?: string;
  state?: "open" | "closed" | "all";
};

interface GitHubBrowsingClientOptions {
  apiClient: Pick<AuthenticatedApiClient, "requestJson">;
}

export interface GitHubBrowsingClient {
  /* eslint-disable no-unused-vars */
  listOwners(query?: Partial<GitHubOwnerListQuery>): Promise<GitHubOwnerListResponse>;
  listProjectIssues(
    projectId: string,
    query?: GitHubIssueListQueryInput,
  ): Promise<GitHubProjectIssueListResponse>;
  listProjects(
    query: GitHubProjectListQuery,
  ): Promise<GitHubProjectListResponse>;
  listRepositories(
    query: GitHubRepositoryListQuery,
  ): Promise<GitHubRepositoryListResponse>;
  listRepositoryIssues(
    owner: string,
    repo: string,
    query?: GitHubIssueListQueryInput,
  ): Promise<GitHubRepositoryIssueListResponse>;
  /* eslint-enable no-unused-vars */
}

export function createGitHubBrowsingClient({
  apiClient,
}: GitHubBrowsingClientOptions): GitHubBrowsingClient {
  return {
    listOwners(query = {}) {
      return apiClient.requestJson({
        path: withQuery("/github/owners", query),
        responseSchema: githubOwnerListResponseSchema,
      });
    },
    listProjectIssues(projectId, query = {}) {
      return apiClient.requestJson({
        path: withQuery(`/github/projects/${encodePathSegment(projectId)}/issues`, query),
        responseSchema: githubProjectIssueListResponseSchema,
      });
    },
    listProjects(query) {
      return apiClient.requestJson({
        path: withQuery("/github/projects", query),
        responseSchema: githubProjectListResponseSchema,
      });
    },
    listRepositories(query) {
      return apiClient.requestJson({
        path: withQuery("/github/repos", query),
        responseSchema: githubRepositoryListResponseSchema,
      });
    },
    listRepositoryIssues(owner, repo, query = {}) {
      return apiClient.requestJson({
        path: withQuery(
          `/github/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/issues`,
          query,
        ),
        responseSchema: githubRepositoryIssueListResponseSchema,
      });
    },
  };
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

function withQuery(
  path: string,
  query: Record<string, string | number | boolean | null | undefined>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();

  return queryString ? `${path}?${queryString}` : path;
}

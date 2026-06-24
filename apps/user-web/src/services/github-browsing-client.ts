import {
  githubOwnerListResponseSchema,
  githubRepositoryIssueListResponseSchema,
  type GitHubOwnerListQuery,
  type GitHubOwnerListResponse,
  type GitHubIssueListQuery,
  type GitHubRepositoryIssueListResponse,
} from "@gitiempo/shared";
import type { AuthenticatedApiClient } from "@gitiempo/web-shared/http";

interface GitHubBrowsingClientOptions {
  apiClient: Pick<AuthenticatedApiClient, "requestJson">;
}

/* eslint-disable no-unused-vars */

export interface GitHubBrowsingClient {
  listOwners(
    query?: Partial<GitHubOwnerListQuery>,
  ): Promise<GitHubOwnerListResponse>;
  listRepositoryIssues(
    owner: string,
    repo: string,
    query?: Partial<GitHubIssueListQuery>,
  ): Promise<GitHubRepositoryIssueListResponse>;
}

/* eslint-enable no-unused-vars */

function buildGitHubOwnerListQueryString(
  query: Partial<GitHubOwnerListQuery> = {},
): string {
  const search = new URLSearchParams();

  if (query.type) {
    search.set("type", query.type);
  }

  return search.toString();
}

function buildGitHubIssueListQueryString(
  query: Partial<GitHubIssueListQuery> = {},
): string {
  const search = new URLSearchParams();

  if (query.pageToken) {
    search.set("pageToken", query.pageToken);
  }

  if (query.limit !== undefined) {
    search.set("limit", String(query.limit));
  }

  if (query.state) {
    search.set("state", query.state);
  }

  if (query.q) {
    search.set("q", query.q);
  }

  return search.toString();
}

export function createGitHubBrowsingClient({
  apiClient,
}: GitHubBrowsingClientOptions): GitHubBrowsingClient {
  return {
    listOwners(query) {
      const search = buildGitHubOwnerListQueryString(query);
      const querySuffix = search ? `?${search}` : "";

      return apiClient.requestJson({
        path: `/github/owners${querySuffix}`,
        responseSchema: githubOwnerListResponseSchema,
      });
    },
    listRepositoryIssues(owner, repo, query) {
      const search = buildGitHubIssueListQueryString(query);
      const querySuffix = search ? `?${search}` : "";
      const encodedOwner = encodeURIComponent(owner);
      const encodedRepo = encodeURIComponent(repo);

      return apiClient.requestJson({
        path: `/github/repos/${encodedOwner}/${encodedRepo}/issues${querySuffix}`,
        responseSchema: githubRepositoryIssueListResponseSchema,
      });
    },
  };
}

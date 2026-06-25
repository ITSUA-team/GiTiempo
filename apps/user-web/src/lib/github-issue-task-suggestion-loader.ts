import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import type { QueryClient } from "@tanstack/vue-query";

import {
  GITHUB_ISSUE_TASK_SUGGESTION_OWNER_QUERY,
  GITHUB_ISSUE_TASK_SUGGESTION_QUERY,
  buildGitHubIssueTaskSuggestionCacheKey,
  filterGitHubIssueTaskSuggestions,
  isBrowseableGitHubOwner,
  readGitHubRepositoryContext,
  toGitHubIssueTaskSuggestion,
  type GitHubIssueTaskSuggestion,
} from "@/lib/github-issue-task-suggestions";
import { githubBrowsingKeys, type UserServerStateScope } from "@/lib/query-keys";
import type { GitHubBrowsingClient } from "@/services/github-browsing-client";

/* eslint-disable no-unused-vars */

interface LoadGitHubIssueTaskSuggestionsOptions {
  accessToken: string | null;
  getCachedSuggestions?: (
    cacheKey: string,
  ) => GitHubIssueTaskSuggestion[] | undefined;
  githubClient: GitHubBrowsingClient;
  isStale?: () => boolean;
  project: ProjectResponse | null;
  queryClient: QueryClient;
  scope: UserServerStateScope;
  setCachedSuggestions?: (
    cacheKey: string,
    suggestions: GitHubIssueTaskSuggestion[],
  ) => void;
  tasks: TaskResponse[];
}

/* eslint-enable no-unused-vars */

export type GitHubIssueTaskSuggestionLoadResult =
  | { status: "noRepository" }
  | { status: "ownerNotBrowseable" }
  | { status: "loaded"; suggestions: GitHubIssueTaskSuggestion[] }
  | { status: "failed"; errorMessage: string }
  | { status: "stale" };

export async function loadGitHubIssueTaskSuggestions({
  accessToken,
  getCachedSuggestions,
  githubClient,
  isStale,
  project,
  queryClient,
  scope,
  setCachedSuggestions,
  tasks,
}: LoadGitHubIssueTaskSuggestionsOptions): Promise<GitHubIssueTaskSuggestionLoadResult> {
  const repository = readGitHubRepositoryContext(project);

  if (!repository) {
    return { status: "noRepository" };
  }

  try {
    if (!accessToken) {
      throw new Error("Authentication is required to load GitHub issue suggestions.");
    }

    const owners = await githubClient.listOwners(
      GITHUB_ISSUE_TASK_SUGGESTION_OWNER_QUERY,
    );

    if (isStale?.()) {
      return { status: "stale" };
    }

    if (!isBrowseableGitHubOwner(repository.owner, owners.items)) {
      return { status: "ownerNotBrowseable" };
    }

    const cacheKey = buildGitHubIssueTaskSuggestionCacheKey(
      scope,
      repository.fullName,
    );
    const cachedSuggestions = getCachedSuggestions?.(cacheKey);

    if (cachedSuggestions) {
      return {
        status: "loaded",
        suggestions: filterGitHubIssueTaskSuggestions(cachedSuggestions, tasks),
      };
    }

    const response = await queryClient.ensureQueryData({
      queryKey: githubBrowsingKeys.repositoryIssues(
        scope,
        repository.fullName,
        GITHUB_ISSUE_TASK_SUGGESTION_QUERY,
      ),
      queryFn: () =>
        githubClient.listRepositoryIssues(
          repository.owner,
          repository.repo,
          GITHUB_ISSUE_TASK_SUGGESTION_QUERY,
        ),
    });

    if (isStale?.()) {
      return { status: "stale" };
    }

    const fetchedSuggestions = response.items.map(toGitHubIssueTaskSuggestion);

    setCachedSuggestions?.(cacheKey, fetchedSuggestions);

    return {
      status: "loaded",
      suggestions: filterGitHubIssueTaskSuggestions(fetchedSuggestions, tasks),
    };
  } catch (error) {
    return { errorMessage: getErrorMessage(error), status: "failed" };
  }
}

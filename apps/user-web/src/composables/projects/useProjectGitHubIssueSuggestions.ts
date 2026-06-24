import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import { useQueryClient } from "@tanstack/vue-query";
import { ref, type ComputedRef } from "vue";

import {
  GITHUB_ISSUE_TASK_SUGGESTION_OWNER_QUERY,
  GITHUB_ISSUE_TASK_SUGGESTION_QUERY,
  filterGitHubIssueTaskSuggestions,
  isBrowseableGitHubOwner,
  readGitHubRepositoryContext,
  toGitHubIssueTaskSuggestion,
  type GitHubIssueTaskSuggestion,
} from "@/lib/github-issue-task-suggestions";
import { githubBrowsingKeys, type UserServerStateScope } from "@/lib/query-keys";
import type { GitHubBrowsingClient } from "@/services/github-browsing-client";

interface UseProjectGitHubIssueSuggestionsOptions {
  accessToken: ComputedRef<string | null>;
  githubClient: GitHubBrowsingClient;
  scope: ComputedRef<UserServerStateScope>;
}

export function useProjectGitHubIssueSuggestions({
  accessToken,
  githubClient,
  scope,
}: UseProjectGitHubIssueSuggestionsOptions) {
  const queryClient = useQueryClient();
  const gitHubIssueSuggestions = ref<GitHubIssueTaskSuggestion[]>([]);
  const gitHubIssueSuggestionErrorMessage = ref<string | null>(null);
  const isLoadingGitHubIssueSuggestions = ref(false);
  let requestId = 0;

  function clearGitHubIssueSuggestions(): void {
    requestId += 1;
    gitHubIssueSuggestions.value = [];
    gitHubIssueSuggestionErrorMessage.value = null;
    isLoadingGitHubIssueSuggestions.value = false;
  }

  async function loadGitHubIssueSuggestionsForProject(
    project: ProjectResponse | null,
    tasks: TaskResponse[],
  ): Promise<void> {
    const currentRequestId = ++requestId;
    const repository = readGitHubRepositoryContext(project);

    if (!repository) {
      clearGitHubIssueSuggestions();
      return;
    }

    isLoadingGitHubIssueSuggestions.value = true;
    gitHubIssueSuggestionErrorMessage.value = null;

    try {
      if (!accessToken.value) {
        throw new Error("Authentication is required to load GitHub issue suggestions.");
      }

      const owners = await githubClient.listOwners(
        GITHUB_ISSUE_TASK_SUGGESTION_OWNER_QUERY,
      );

      if (!isBrowseableGitHubOwner(repository.owner, owners.items)) {
        if (currentRequestId === requestId) {
          gitHubIssueSuggestions.value = [];
          gitHubIssueSuggestionErrorMessage.value = null;
        }

        return;
      }

      const response = await queryClient.ensureQueryData({
        queryKey: githubBrowsingKeys.repositoryIssues(
          scope.value,
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
      const nextSuggestions = filterGitHubIssueTaskSuggestions(
        response.items.map(toGitHubIssueTaskSuggestion),
        tasks,
      );

      if (currentRequestId === requestId) {
        gitHubIssueSuggestions.value = nextSuggestions;
      }
    } catch (error) {
      if (currentRequestId === requestId) {
        gitHubIssueSuggestions.value = [];
        gitHubIssueSuggestionErrorMessage.value = getErrorMessage(error);
      }
    } finally {
      if (currentRequestId === requestId) {
        isLoadingGitHubIssueSuggestions.value = false;
      }
    }
  }

  return {
    clearGitHubIssueSuggestions,
    gitHubIssueSuggestionErrorMessage,
    gitHubIssueSuggestions,
    isLoadingGitHubIssueSuggestions,
    loadGitHubIssueSuggestionsForProject,
  };
}

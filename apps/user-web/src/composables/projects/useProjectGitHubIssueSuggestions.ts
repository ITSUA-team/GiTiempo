import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { useQueryClient } from "@tanstack/vue-query";
import { ref, type ComputedRef } from "vue";

import {
  GITHUB_ISSUE_SUGGESTION_AVAILABILITY,
  type GitHubIssueSuggestionAvailability,
  type GitHubIssueTaskSuggestion,
} from "@/lib/github-issue-task-suggestions";
import { loadGitHubIssueTaskSuggestions } from "@/lib/github-issue-task-suggestion-loader";
import type { UserServerStateScope } from "@/lib/query-keys";
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
  const gitHubIssueSuggestionAvailability = ref<GitHubIssueSuggestionAvailability>(
    GITHUB_ISSUE_SUGGESTION_AVAILABILITY.AVAILABLE,
  );
  const gitHubIssueSuggestionErrorMessage = ref<string | null>(null);
  const isLoadingGitHubIssueSuggestions = ref(false);
  let requestId = 0;

  function clearGitHubIssueSuggestions(): void {
    requestId += 1;
    gitHubIssueSuggestions.value = [];
    gitHubIssueSuggestionAvailability.value =
      GITHUB_ISSUE_SUGGESTION_AVAILABILITY.AVAILABLE;
    gitHubIssueSuggestionErrorMessage.value = null;
    isLoadingGitHubIssueSuggestions.value = false;
  }

  async function loadGitHubIssueSuggestionsForProject(
    project: ProjectResponse | null,
    tasks: TaskResponse[],
  ): Promise<void> {
    const currentRequestId = ++requestId;

    isLoadingGitHubIssueSuggestions.value = true;
    gitHubIssueSuggestionAvailability.value =
      GITHUB_ISSUE_SUGGESTION_AVAILABILITY.AVAILABLE;
    gitHubIssueSuggestionErrorMessage.value = null;

    try {
      const result = await loadGitHubIssueTaskSuggestions({
        accessToken: accessToken.value,
        githubClient,
        isStale: () => currentRequestId !== requestId,
        project,
        queryClient,
        scope: scope.value,
        tasks,
      });

      if (currentRequestId !== requestId || result.status === "stale") {
        return;
      }

      if (result.status === "noRepository") {
        clearGitHubIssueSuggestions();
        return;
      }

      if (result.status === "ownerNotBrowseable") {
        gitHubIssueSuggestions.value = [];
        gitHubIssueSuggestionAvailability.value =
          GITHUB_ISSUE_SUGGESTION_AVAILABILITY.OWNER_UNAVAILABLE;
        gitHubIssueSuggestionErrorMessage.value = null;

        return;
      }

      if (result.status === "failed") {
        gitHubIssueSuggestions.value = [];
        gitHubIssueSuggestionAvailability.value =
          GITHUB_ISSUE_SUGGESTION_AVAILABILITY.AVAILABLE;
        gitHubIssueSuggestionErrorMessage.value = result.errorMessage;

        return;
      }

      gitHubIssueSuggestions.value = result.suggestions;
    } finally {
      if (currentRequestId === requestId) {
        isLoadingGitHubIssueSuggestions.value = false;
      }
    }
  }

  return {
    clearGitHubIssueSuggestions,
    gitHubIssueSuggestionAvailability,
    gitHubIssueSuggestionErrorMessage,
    gitHubIssueSuggestions,
    isLoadingGitHubIssueSuggestions,
    loadGitHubIssueSuggestionsForProject,
  };
}

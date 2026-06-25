import type {
  ProjectResponse,
  TaskResponse,
} from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import { useQueryClient } from "@tanstack/vue-query";
import { ref, type ComputedRef } from "vue";

import {
  GITHUB_ISSUE_SUGGESTION_AVAILABILITY,
} from "@/lib/github-issue-task-suggestions";
import { loadGitHubIssueTaskSuggestions } from "@/lib/github-issue-task-suggestion-loader";
import { timerKeys, type UserServerStateScope } from "@/lib/query-keys";
import type { GitHubBrowsingClient } from "@/services/github-browsing-client";
import type { TimeEntriesClient } from "@/services/time-entries-client";

import type {
  TopBarGitHubTaskProposal,
  TopBarTaskPicker,
} from "./useTopBarTaskPicker";

interface UseTopBarTaskOptionsOptions {
  accessToken: ComputedRef<string | null>;
  client: TimeEntriesClient;
  githubClient: GitHubBrowsingClient;
  picker: TopBarTaskPicker;
  scope: ComputedRef<UserServerStateScope>;
}

export function useTopBarTaskOptions({
  accessToken,
  client,
  githubClient,
  picker,
  scope,
}: UseTopBarTaskOptionsOptions) {
  const queryClient = useQueryClient();
  const isLoadingProjects = ref(false);
  const isLoadingTasks = ref(false);
  const isLoadingGitHubTaskProposals = ref(false);
  let taskRequestId = 0;
  let gitHubProposalRequestId = 0;

  async function ensureProjectsLoaded(): Promise<ProjectResponse[]> {
    if (picker.projects.value.length > 0) {
      return picker.projects.value;
    }

    if (!accessToken.value) {
      throw new Error("Authentication is required to load visible projects.");
    }

    isLoadingProjects.value = true;
    picker.setProjectsError(null);

    try {
      const projects = await queryClient.ensureQueryData({
        queryKey: timerKeys.visibleProjects(scope.value),
        queryFn: () => client.listVisibleProjects(),
      });

      picker.setProjects(projects);
      return picker.projects.value;
    } catch (error) {
      picker.setProjectsError(getErrorMessage(error));
      throw error;
    } finally {
      isLoadingProjects.value = false;
    }
  }

  async function loadTasksForProject(projectId: string): Promise<TaskResponse[]> {
    const requestId = ++taskRequestId;

    if (!accessToken.value) {
      throw new Error("Authentication is required to load project tasks.");
    }

    isLoadingTasks.value = true;
    picker.setTasksError(null);

    try {
      const cachedTasks = picker.getCachedTasks(projectId);

      if (cachedTasks) {
        picker.setTasks(cachedTasks);
        return cachedTasks;
      }

      const nextTasks = await queryClient.ensureQueryData({
        queryKey: timerKeys.projectTasks(scope.value, projectId),
        queryFn: () => client.listProjectTasks(projectId),
      });

      if (requestId !== taskRequestId) {
        return picker.tasks.value;
      }

      picker.setCachedTasks(projectId, nextTasks);
      picker.setTasks(nextTasks);
      return nextTasks;
    } catch (error) {
      if (requestId === taskRequestId) {
        picker.setTasks([]);
        picker.setTasksError(getErrorMessage(error));
      }

      throw error;
    } finally {
      if (requestId === taskRequestId) {
        isLoadingTasks.value = false;
      }
    }
  }

  function clearGitHubIssueProposals(): void {
    gitHubProposalRequestId += 1;
    isLoadingGitHubTaskProposals.value = false;
    picker.setGitHubIssueProposals([]);
    picker.setGitHubProposalError(null);
    picker.setGitHubIssueSuggestionAvailability(
      GITHUB_ISSUE_SUGGESTION_AVAILABILITY.AVAILABLE,
    );
  }

  async function loadGitHubIssueProposalsForProject(
    project: ProjectResponse | null,
  ): Promise<TopBarGitHubTaskProposal[]> {
    const requestId = ++gitHubProposalRequestId;

    isLoadingGitHubTaskProposals.value = true;
    picker.setGitHubProposalError(null);
    picker.setGitHubIssueSuggestionAvailability(
      GITHUB_ISSUE_SUGGESTION_AVAILABILITY.AVAILABLE,
    );

    try {
      const result = await loadGitHubIssueTaskSuggestions({
        accessToken: accessToken.value,
        getCachedSuggestions: picker.getCachedGitHubIssueProposals,
        githubClient,
        isStale: () => requestId !== gitHubProposalRequestId,
        project,
        queryClient,
        scope: scope.value,
        setCachedSuggestions: picker.setCachedGitHubIssueProposals,
        tasks: picker.activeTasks.value,
      });

      if (requestId !== gitHubProposalRequestId) {
        return picker.gitHubIssueProposals.value;
      }

      if (result.status === "stale") {
        return picker.gitHubIssueProposals.value;
      }

      if (result.status === "noRepository") {
        clearGitHubIssueProposals();
        return [];
      }

      if (result.status === "ownerNotBrowseable") {
        picker.setGitHubIssueProposals([]);
        picker.setGitHubProposalError(null);
        picker.setGitHubIssueSuggestionAvailability(
          GITHUB_ISSUE_SUGGESTION_AVAILABILITY.OWNER_UNAVAILABLE,
        );
        return [];
      }

      if (result.status === "failed") {
        picker.setGitHubIssueProposals([]);
        picker.setGitHubProposalError(result.errorMessage);
        picker.setGitHubIssueSuggestionAvailability(
          GITHUB_ISSUE_SUGGESTION_AVAILABILITY.AVAILABLE,
        );
        return [];
      }

      picker.setGitHubIssueProposals(result.suggestions);
      return result.suggestions;
    } finally {
      if (requestId === gitHubProposalRequestId) {
        isLoadingGitHubTaskProposals.value = false;
      }
    }
  }

  return {
    clearGitHubIssueProposals,
    ensureProjectsLoaded,
    isLoadingGitHubTaskProposals,
    isLoadingProjects,
    isLoadingTasks,
    loadGitHubIssueProposalsForProject,
    loadTasksForProject,
  };
}

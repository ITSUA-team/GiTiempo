import type {
  ProjectResponse,
  TaskResponse,
} from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import { useQueryClient } from "@tanstack/vue-query";
import { ref, type ComputedRef } from "vue";

import {
  GITHUB_ISSUE_SUGGESTION_AVAILABILITY,
  GITHUB_ISSUE_TASK_SUGGESTION_OWNER_QUERY,
  GITHUB_ISSUE_TASK_SUGGESTION_QUERY,
  buildGitHubIssueTaskSuggestionCacheKey,
  filterGitHubIssueTaskSuggestions,
  isBrowseableGitHubOwner,
  readGitHubRepositoryContext,
  toGitHubIssueTaskSuggestion,
} from "@/lib/github-issue-task-suggestions";
import {
  githubBrowsingKeys,
  timerKeys,
  type UserServerStateScope,
} from "@/lib/query-keys";
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
    const repository = readGitHubRepositoryContext(project);

    if (!repository) {
      clearGitHubIssueProposals();
      return [];
    }

    isLoadingGitHubTaskProposals.value = true;
    picker.setGitHubProposalError(null);
    picker.setGitHubIssueSuggestionAvailability(
      GITHUB_ISSUE_SUGGESTION_AVAILABILITY.AVAILABLE,
    );

    try {
      if (!accessToken.value) {
        throw new Error("Authentication is required to load GitHub issue suggestions.");
      }

      const owners = await githubClient.listOwners(
        GITHUB_ISSUE_TASK_SUGGESTION_OWNER_QUERY,
      );

      if (requestId !== gitHubProposalRequestId) {
        return picker.gitHubIssueProposals.value;
      }

      if (!isBrowseableGitHubOwner(repository.owner, owners.items)) {
        picker.setGitHubIssueProposals([]);
        picker.setGitHubProposalError(null);
        picker.setGitHubIssueSuggestionAvailability(
          GITHUB_ISSUE_SUGGESTION_AVAILABILITY.OWNER_UNAVAILABLE,
        );
        return [];
      }

      const cacheKey = buildGitHubIssueTaskSuggestionCacheKey(
        scope.value,
        repository.fullName,
      );
      const cachedProposals = picker.getCachedGitHubIssueProposals(cacheKey);

      if (cachedProposals) {
        const proposals = filterGitHubIssueTaskSuggestions(
          cachedProposals,
          picker.activeTasks.value,
        );

        picker.setGitHubIssueProposals(proposals);
        return proposals;
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
      const fetchedProposals = response.items.map(toGitHubIssueTaskSuggestion);
      const proposals = filterGitHubIssueTaskSuggestions(
        fetchedProposals,
        picker.activeTasks.value,
      );

      if (requestId !== gitHubProposalRequestId) {
        return picker.gitHubIssueProposals.value;
      }

      picker.setCachedGitHubIssueProposals(cacheKey, fetchedProposals);
      picker.setGitHubIssueProposals(proposals);
      return proposals;
    } catch (error) {
      if (requestId === gitHubProposalRequestId) {
        picker.setGitHubIssueProposals([]);
        picker.setGitHubProposalError(getErrorMessage(error));
        picker.setGitHubIssueSuggestionAvailability(
          GITHUB_ISSUE_SUGGESTION_AVAILABILITY.AVAILABLE,
        );
      }

      return [];
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

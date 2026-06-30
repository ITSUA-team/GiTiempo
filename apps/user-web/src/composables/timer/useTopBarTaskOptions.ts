import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import { useQueryClient } from "@tanstack/vue-query";
import { ref, type ComputedRef } from "vue";

import { appendUnsyncedProjectGitHubIssueOptions } from "@/lib/project-github-issues";
import { getGitHubIssueTaskOptionId } from "@/lib/top-bar-timer-helpers";
import { timerKeys, type UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";

import type {
  GitHubIssueTaskOption,
  TopBarTaskOption,
  TopBarTaskPicker,
} from "./useTopBarTaskPicker";

interface UseTopBarTaskOptionsOptions {
  accessToken: ComputedRef<string | null>;
  client: TimeEntriesClient;
  picker: TopBarTaskPicker;
  scope: ComputedRef<UserServerStateScope>;
}

interface LoadedTopBarTaskOptions {
  errorMessage: string | null;
  taskOptions: TopBarTaskOption[];
}

export function useTopBarTaskOptions({
  accessToken,
  client,
  picker,
  scope,
}: UseTopBarTaskOptionsOptions) {
  const queryClient = useQueryClient();
  const isLoadingProjects = ref(false);
  const isLoadingTasks = ref(false);
  let taskRequestId = 0;

  async function ensureProjectsLoaded(): Promise<ProjectResponse[]> {
    if (!accessToken.value) {
      throw new Error("Authentication is required to load visible projects.");
    }

    isLoadingProjects.value = true;
    picker.setProjectsError(null);

    try {
      const previousProjectsById = new Map(
        picker.projects.value.map((project) => [project.id, project]),
      );
      const projects = await queryClient.fetchQuery({
        queryKey: timerKeys.visibleProjects(scope.value),
        queryFn: () => client.listVisibleProjects(),
      });

      for (const project of projects) {
        const previousProject = previousProjectsById.get(project.id);

        if (previousProject && previousProject.source !== project.source) {
          picker.invalidateCachedTasks(project.id);
        }
      }

      picker.setProjects(projects);
      return picker.projects.value;
    } catch (error) {
      picker.setProjectsError(getErrorMessage(error));
      throw error;
    } finally {
      isLoadingProjects.value = false;
    }
  }

  async function loadTasksForProject(projectId: string): Promise<TopBarTaskOption[]> {
    const requestId = ++taskRequestId;

    if (!accessToken.value) {
      throw new Error("Authentication is required to load project tasks.");
    }

    isLoadingTasks.value = true;
    picker.setTasksError(null);

    try {
      const hasProjectMetadata = picker.projects.value.some(
        (project) => project.id === projectId,
      );
      const cachedTasks = picker.getCachedTasks(projectId);

      if (cachedTasks && hasProjectMetadata) {
        picker.setTasksError(null);
        picker.setTasks(cachedTasks);
        return cachedTasks;
      }

      const localTasks = await queryClient.ensureQueryData({
        queryKey: timerKeys.projectTasks(scope.value, projectId),
        queryFn: () => client.listProjectTasks(projectId),
      });
      const { errorMessage, taskOptions } = await appendGitHubIssueOptions(
        projectId,
        localTasks,
      );

      if (requestId !== taskRequestId) {
        return picker.tasks.value;
      }

      if (errorMessage === null && hasProjectMetadata) {
        picker.setCachedTasks(projectId, taskOptions);
      }
      picker.setTasks(taskOptions);
      picker.setTasksError(errorMessage);
      return taskOptions;
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

  async function appendGitHubIssueOptions(
    projectId: string,
    localTasks: TaskResponse[],
  ): Promise<LoadedTopBarTaskOptions> {
    const project =
      picker.projects.value.find((candidate) => candidate.id === projectId) ??
      null;
    const selectedContextGitHubIssue =
      picker.selectedProjectId.value === projectId
        ? picker.selectedContextGitHubIssue.value
        : null;

    return appendUnsyncedProjectGitHubIssueOptions({
      client,
      hasKnownGitHubIssueSource: selectedContextGitHubIssue !== null,
      knownSyncedGitHubIssues: selectedContextGitHubIssue
        ? [selectedContextGitHubIssue]
        : [],
      localTaskOptions: localTasks,
      localTasks,
      mapGitHubIssue(issue): GitHubIssueTaskOption {
        if (!project) {
          throw new Error("GitHub issue options require a visible project.");
        }

        return {
          createdAt: issue.updatedAt,
          defaultBillableForTimeEntries: project.defaultBillableForTasks,
          githubIssue: issue.githubIssue,
          id: getGitHubIssueTaskOptionId(issue.githubIssue),
          isActive: true,
          isGitHubIssueOption: true,
          issueTitle: issue.issueTitle,
          projectId: issue.projectId,
          status: "open",
          title: issue.issueTitle,
          updatedAt: issue.updatedAt,
          workspaceId: project.workspaceId,
        };
      },
      project,
    });
  }

  return {
    ensureProjectsLoaded,
    isLoadingProjects,
    isLoadingTasks,
    loadTasksForProject,
  };
}

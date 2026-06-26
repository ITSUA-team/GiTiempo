import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import { useQueryClient } from "@tanstack/vue-query";
import { ref, type ComputedRef } from "vue";

import { loadUnsyncedProjectGitHubIssues } from "@/lib/project-github-issues";
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

  async function loadTasksForProject(projectId: string): Promise<TopBarTaskOption[]> {
    const requestId = ++taskRequestId;

    if (!accessToken.value) {
      throw new Error("Authentication is required to load project tasks.");
    }

    isLoadingTasks.value = true;
    picker.setTasksError(null);

    try {
      const cachedTasks = picker.getCachedTasks(projectId);

      if (cachedTasks) {
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

      if (errorMessage === null) {
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
    const project = picker.projects.value.find(
      (candidate) => candidate.id === projectId,
    );

    const hasGitHubIssueTask = localTasks.some(
      (task) => task.githubIssue !== null,
    );

    if (!project || (project.source !== "github" && !hasGitHubIssueTask)) {
      return {
        errorMessage: null,
        taskOptions: localTasks,
      };
    }

    const { errorMessage, issues } = await loadUnsyncedProjectGitHubIssues({
      client,
      localTasks,
      projectId: project.id,
    });
    const githubOptions: GitHubIssueTaskOption[] = issues.map((issue) => ({
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
      }));

    return {
      errorMessage,
      taskOptions: [...localTasks, ...githubOptions],
    };
  }

  return {
    ensureProjectsLoaded,
    isLoadingProjects,
    isLoadingTasks,
    loadTasksForProject,
  };
}

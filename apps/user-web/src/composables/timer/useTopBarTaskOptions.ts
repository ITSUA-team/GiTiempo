import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import { useQueryClient, type QueryKey } from "@tanstack/vue-query";
import { ref, type ComputedRef } from "vue";

import { appendUnsyncedProjectGitHubIssueOptions } from "@/lib/project-github-issues";
import {
  loadGitHubProjectIssues,
  loadGitHubProjectRepositories,
  loadOrganizationGitHubProjects,
} from "@/lib/timer-github-projects";
import {
  getGitHubIssueTaskOptionId,
  getGitHubProjectIssueTaskOptionId,
} from "@/lib/top-bar-timer-helpers";
import {
  timerKeys,
  userProjectsKeys,
  type UserServerStateScope,
} from "@/lib/query-keys";
import { TIMER_OPTIONS_STALE_TIME } from "@/lib/timer-options-cache";
import type { TimeEntriesClient } from "@/services/time-entries-client";

import type {
  GitHubIssueTaskOption,
  TopBarTaskOption,
  TopBarTaskPicker,
} from "./useTopBarTaskPicker";

interface UseTopBarTaskOptionsOptions {
  client: TimeEntriesClient;
  enabled: ComputedRef<boolean>;
  picker: TopBarTaskPicker;
  scope: ComputedRef<UserServerStateScope>;
}

interface LoadedTopBarTaskOptions {
  errorMessage: string | null;
  taskOptions: TopBarTaskOption[];
}

export function useTopBarTaskOptions({
  client,
  enabled,
  picker,
  scope,
}: UseTopBarTaskOptionsOptions) {
  const queryClient = useQueryClient();
  const isLoadingProjects = ref(false);
  const isLoadingGitHubProjects = ref(false);
  const isLoadingTasks = ref(false);
  let taskRequestId = 0;

  function isQueryDataCurrent(queryKey: QueryKey): boolean {
    const queryState = queryClient.getQueryState(queryKey);

    return queryState !== undefined && !queryState.isInvalidated;
  }

  function getTaskOptionsQueryKey(projectId: string): QueryKey {
    return timerKeys.projectTaskOptions(scope.value, projectId);
  }

  function getCachedTaskOptions(projectId: string): TopBarTaskOption[] | undefined {
    return queryClient.getQueryData<LoadedTopBarTaskOptions>(
      getTaskOptionsQueryKey(projectId),
    )?.taskOptions;
  }

  function setCachedTaskOptions(
    projectId: string,
    taskOptions: TopBarTaskOption[],
  ): void {
    queryClient.setQueryData<LoadedTopBarTaskOptions>(
      getTaskOptionsQueryKey(projectId),
      { errorMessage: null, taskOptions },
    );
  }

  async function ensureProjectsLoaded(): Promise<ProjectResponse[]> {
    if (!enabled.value) {
      throw new Error("Authentication is required to load visible projects.");
    }

    isLoadingProjects.value = true;
    picker.setProjectsError(null);

    try {
      const previousProjectsById = new Map(
        picker.projects.value.map((project) => [project.id, project]),
      );
      const projects = await queryClient.fetchQuery({
        queryKey: userProjectsKeys.visibleProjects(scope.value),
        queryFn: () => client.listVisibleProjects(),
        staleTime: TIMER_OPTIONS_STALE_TIME,
      });

      for (const project of projects) {
        const previousProject = previousProjectsById.get(project.id);

        if (previousProject && previousProject.source !== project.source) {
          queryClient.removeQueries({
            queryKey: getTaskOptionsQueryKey(project.id),
          });
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

  async function ensureGitHubProjectsLoaded(): Promise<void> {
    if (!enabled.value) {
      return;
    }

    isLoadingGitHubProjects.value = true;
    picker.setGitHubProjectsError(null);

    try {
      const result = await queryClient.fetchQuery({
        queryKey: timerKeys.githubProjects(scope.value),
        queryFn: () => loadOrganizationGitHubProjects({ client }),
        staleTime: TIMER_OPTIONS_STALE_TIME,
      });

      picker.setGitHubProjectAvailability(result.availability);
      picker.setGitHubProjectsError(result.errorMessage);
      picker.setGitHubProjectsTruncated(result.isTruncated);
      picker.setGitHubProjects(
        result.projects.map((project) => ({
          ...project,
          isGitHubProjectOption: true as const,
        })),
      );

      if (result.projects.length > 0) {
        const repositories = await queryClient.fetchQuery({
          queryKey: timerKeys.githubProjectRepositories(scope.value),
          queryFn: () =>
            loadGitHubProjectRepositories({
              client,
              projects: result.projects,
            }),
          staleTime: TIMER_OPTIONS_STALE_TIME,
        });

        picker.setGitHubProjectRepositories(repositories);
      }
    } catch (error) {
      picker.setGitHubProjects([]);
      picker.setGitHubProjectsError(getErrorMessage(error));
    } finally {
      isLoadingGitHubProjects.value = false;
    }
  }

  async function loadIssuesForGitHubProject(
    githubProjectId: string,
  ): Promise<TopBarTaskOption[]> {
    const requestId = ++taskRequestId;

    isLoadingTasks.value = true;
    picker.setTasksError(null);

    try {
      const result = await queryClient.fetchQuery({
        queryKey: timerKeys.githubProjectIssues(scope.value, githubProjectId),
        queryFn: () => loadGitHubProjectIssues({ client, githubProjectId }),
      });

      if (requestId !== taskRequestId) {
        return picker.tasks.value;
      }

      const options: TopBarTaskOption[] = result.issues.map((issue) => ({
        createdAt: issue.updatedAt,
        defaultBillableForTimeEntries: true,
        githubIssue: issue.githubIssue,
        id: getGitHubProjectIssueTaskOptionId(issue.githubIssue),
        isActive: true,
        isGitHubProjectIssueOption: true as const,
        issueTitle: issue.issueTitle,
        projectId: "",
        status: "open",
        title: issue.issueTitle,
        updatedAt: issue.updatedAt,
        workspaceId: "",
      }));

      picker.setGitHubProjectDraftCount(result.draftCount);
      picker.setTasks(options);
      picker.setTasksError(result.errorMessage);
      return options;
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

  async function loadTasksForProject(projectId: string): Promise<TopBarTaskOption[]> {
    const requestId = ++taskRequestId;

    if (!enabled.value) {
      throw new Error("Authentication is required to load project tasks.");
    }

    isLoadingTasks.value = true;
    picker.setTasksError(null);

    try {
      const hasProjectMetadata = picker.projects.value.some(
        (project) => project.id === projectId,
      );
      const cachedTaskOptions = isQueryDataCurrent(
        getTaskOptionsQueryKey(projectId),
      )
        ? getCachedTaskOptions(projectId)
        : undefined;

      if (cachedTaskOptions && hasProjectMetadata) {
        picker.setTasksError(null);
        picker.setTasks(cachedTaskOptions);
        return cachedTaskOptions;
      }

      const localTaskQueryOptions = {
        queryKey: userProjectsKeys.projectTasks(scope.value, projectId),
        queryFn: () => client.listProjectTasks(projectId),
      };
      const localTasks = isQueryDataCurrent(localTaskQueryOptions.queryKey)
        ? await queryClient.ensureQueryData(localTaskQueryOptions)
        : await queryClient.fetchQuery(localTaskQueryOptions);
      const { errorMessage, taskOptions } = await appendGitHubIssueOptions(
        projectId,
        localTasks,
      );

      if (requestId !== taskRequestId) {
        return picker.tasks.value;
      }

      if (errorMessage === null && hasProjectMetadata) {
        setCachedTaskOptions(projectId, taskOptions);
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
    ensureGitHubProjectsLoaded,
    ensureProjectsLoaded,
    getCachedTaskOptions,
    isLoadingGitHubProjects,
    isLoadingProjects,
    isLoadingTasks,
    loadIssuesForGitHubProject,
    loadTasksForProject,
    setCachedTaskOptions,
  };
}

export type TopBarTaskOptions = ReturnType<typeof useTopBarTaskOptions>;

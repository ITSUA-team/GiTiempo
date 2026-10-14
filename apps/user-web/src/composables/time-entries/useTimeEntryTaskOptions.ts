import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import { useQueryClient, type QueryKey } from "@tanstack/vue-query";
import type { ComputedRef } from "vue";

import {
  appendUnsyncedProjectGitHubIssueOptions,
  fetchCachedProjectGitHubIssuePage,
  type ProjectGitHubIssuePageFetcher,
} from "@/lib/project-github-issues";
import {
  userProjectsKeys,
  type UserServerStateScope,
} from "@/lib/query-keys";
import { TIMER_OPTIONS_STALE_TIME } from "@/lib/timer-options-cache";
import type { TimeEntriesClient } from "@/services/time-entries-client";

import {
  toGitHubIssueTaskLookupOption,
  toTaskLookupOption,
  type TaskLookupOption,
} from "./time-entry-task-lookup";

interface UseTimeEntryTaskOptionsOptions {
  client: TimeEntriesClient;
  getProjectById(projectId: string): ProjectResponse | null;
  scope: ComputedRef<UserServerStateScope>;
}

interface LoadTaskOptionsOptions {
  trackableOnly?: boolean;
}

interface LoadedTaskOptionsResult {
  errorMessage: string | null;
  taskOptions: TaskLookupOption[];
}

interface TaskOptionsTarget {
  beginTaskRequest(): number;
  isCurrentTaskRequest(requestId: number): boolean;
  setTaskOptions(options: TaskLookupOption[]): void;
  setTasksError(message: string | null): void;
  setTasksLoading(isLoading: boolean): void;
}

interface CachedProjectTaskOptions {
  githubIssueOptions: TaskLookupOption[];
  localTasks: TaskResponse[];
}

interface ProjectTaskCacheContext {
  cacheKey: string;
  project: ProjectResponse | null;
  queryKey: QueryKey;
  requestScope: UserServerStateScope;
}

export function useTimeEntryTaskOptions({
  client,
  getProjectById,
  scope,
}: UseTimeEntryTaskOptionsOptions) {
  const queryClient = useQueryClient();
  const taskCache = new Map<string, CachedProjectTaskOptions>();

  function getProjectTaskCacheContext(projectId: string): ProjectTaskCacheContext {
    const currentScope = scope.value;
    const project = getProjectById(projectId);
    const accessScope = project?.accessScope ?? null;
    const queryKey = userProjectsKeys.projectTasks(
      currentScope,
      projectId,
      accessScope,
    );

    return {
      cacheKey: JSON.stringify(queryKey),
      project,
      queryKey,
      requestScope: currentScope,
    };
  }

  function isQueryDataCurrent(queryKey: QueryKey): boolean {
    const queryState = queryClient.getQueryState(queryKey);

    return queryState !== undefined &&
      !queryState.isInvalidated &&
      queryState.dataUpdatedAt > 0 &&
      Date.now() - queryState.dataUpdatedAt < TIMER_OPTIONS_STALE_TIME;
  }

  function getCurrentProjectTasks(queryKey: QueryKey): TaskResponse[] | null {
    return isQueryDataCurrent(queryKey)
      ? queryClient.getQueryData<TaskResponse[]>(queryKey) ?? null
      : null;
  }

  function isCurrentProjectTaskCacheContext(
    projectId: string,
    context: ProjectTaskCacheContext,
  ): boolean {
    return getProjectTaskCacheContext(projectId).cacheKey === context.cacheKey;
  }

  function createProjectGitHubIssuePageFetcherForScope(
    requestScope: UserServerStateScope,
  ): ProjectGitHubIssuePageFetcher {
    return (page) => fetchCachedProjectGitHubIssuePage({
      client,
      page,
      queryClient,
      scope: requestScope,
    });
  }

  async function loadProjectTaskOptions(
    projectId: string,
    options: LoadTaskOptionsOptions = {},
  ): Promise<LoadedTaskOptionsResult> {
    const context = getProjectTaskCacheContext(projectId);
    const cached = taskCache.get(context.cacheKey);

    if (
      cached &&
      cached.localTasks === getCurrentProjectTasks(context.queryKey)
    ) {
      return {
        errorMessage: null,
        taskOptions: buildTaskOptions(
          cached.localTasks,
          cached.githubIssueOptions,
          options.trackableOnly,
        ),
      };
    }

    const localTasks = await queryClient.fetchQuery({
      queryKey: context.queryKey,
      queryFn: () => client.listProjectTasks(projectId),
      staleTime: TIMER_OPTIONS_STALE_TIME,
    });

    if (!isCurrentProjectTaskCacheContext(projectId, context)) {
      return loadProjectTaskOptions(projectId, options);
    }

    const localTaskOptions = buildLocalTaskOptions(localTasks, options.trackableOnly);
    const result = await appendGitHubIssueOptions(
      projectId,
      localTaskOptions,
      localTasks,
      context.project,
      context.requestScope,
    );

    if (!isCurrentProjectTaskCacheContext(projectId, context)) {
      return loadProjectTaskOptions(projectId, options);
    }

    if (result.errorMessage === null) {
      taskCache.set(context.cacheKey, {
        githubIssueOptions: result.taskOptions.filter(
          (task) => task.isGitHubIssueOption === true,
        ),
        localTasks,
      });
    }

    return result;
  }

  function upsertProjectTask(
    task: TaskResponse,
    options: LoadTaskOptionsOptions = {},
  ): TaskLookupOption[] {
    const context = getProjectTaskCacheContext(task.projectId);
    const currentLocalTasks = getCurrentProjectTasks(context.queryKey);
    const cached = taskCache.get(context.cacheKey);
    const cachedTasksAreCurrent =
      currentLocalTasks !== null && cached?.localTasks === currentLocalTasks;
    const localTasks = cachedTasksAreCurrent
      ? cached.localTasks
      : currentLocalTasks ?? [];
    const githubIssueOptions = cachedTasksAreCurrent
      ? cached.githubIssueOptions
      : [];
    const nextLocalTasks = [
      ...localTasks.filter((cachedTask) => cachedTask.id !== task.id),
      task,
    ];

    if (currentLocalTasks !== null) {
      queryClient.setQueryData(context.queryKey, nextLocalTasks);
    }

    taskCache.set(context.cacheKey, {
      githubIssueOptions,
      localTasks: nextLocalTasks,
    });
    return buildTaskOptions(
      nextLocalTasks,
      githubIssueOptions,
      options.trackableOnly,
    );
  }

  async function loadTargetProjectTaskOptions(
    projectId: string,
    target: TaskOptionsTarget,
    options: LoadTaskOptionsOptions = {},
  ): Promise<TaskLookupOption[]> {
    const requestId = target.beginTaskRequest();

    target.setTasksLoading(true);
    target.setTasksError(null);

    try {
      const { errorMessage, taskOptions } = await loadProjectTaskOptions(
        projectId,
        options,
      );

      if (target.isCurrentTaskRequest(requestId)) {
        target.setTaskOptions(taskOptions);
        target.setTasksError(errorMessage);
      }

      return taskOptions;
    } catch (error) {
      if (target.isCurrentTaskRequest(requestId)) {
        target.setTaskOptions([]);
        target.setTasksError(getErrorMessage(error));
      }

      throw error;
    } finally {
      if (target.isCurrentTaskRequest(requestId)) {
        target.setTasksLoading(false);
      }
    }
  }

  function invalidateProjectTaskOptions(projectId: string): void {
    const context = getProjectTaskCacheContext(projectId);
    taskCache.delete(context.cacheKey);
    void queryClient.invalidateQueries(
      {
        refetchType: "none",
        queryKey: context.queryKey,
        exact: true,
      },
    );
  }

  return {
    invalidateProjectTaskOptions,
    loadProjectTaskOptions,
    loadTargetProjectTaskOptions,
    upsertProjectTask,
  };

  function buildLocalTaskOptions(
    tasks: TaskResponse[],
    trackableOnly = false,
  ): TaskLookupOption[] {
    return tasks
      .filter(
        (task) => task.isActive && (!trackableOnly || task.status === "open"),
      )
      .map(toTaskLookupOption);
  }

  function buildTaskOptions(
    localTasks: TaskResponse[],
    githubIssueOptions: TaskLookupOption[],
    trackableOnly = false,
  ): TaskLookupOption[] {
    return [
      ...buildLocalTaskOptions(localTasks, trackableOnly),
      ...githubIssueOptions,
    ];
  }

  async function appendGitHubIssueOptions(
    projectId: string,
    localTaskOptions: TaskLookupOption[],
    localTasks: TaskResponse[],
    project: ProjectResponse | null,
    requestScope: UserServerStateScope,
  ): Promise<LoadedTaskOptionsResult> {
    return appendUnsyncedProjectGitHubIssueOptions({
      client,
      fetchPage: createProjectGitHubIssuePageFetcherForScope(requestScope),
      localTaskOptions,
      localTasks,
      mapGitHubIssue(issue) {
        if (!project) {
          throw new Error("GitHub issue options require a visible project.");
        }

        return toGitHubIssueTaskLookupOption({
          defaultBillableForTimeEntries: project.defaultBillableForTasks,
          githubIssue: issue.githubIssue,
          issueTitle: issue.issueTitle,
          projectId: issue.projectId,
        });
      },
      project,
    });
  }
}

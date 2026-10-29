import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import { useQueries, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, nextTick, watch, type ComputedRef } from "vue";

import { userProjectsKeys, type UserServerStateScope } from "@/lib/query-keys";
import { USER_LIST_QUERY_POLICY } from "@/lib/query-policy";
import { sortProjectTasks } from "@/lib/projects-page-helpers";
import type { TimeEntriesClient } from "@/services/time-entries-client";

interface UseProjectsDataOptions {
  client: TimeEntriesClient;
  enabled: ComputedRef<boolean>;
  onLoadProjectsError(error: unknown): void;
  onLoadTasksError(message: string): void;
  scope: ComputedRef<UserServerStateScope>;
}

interface ProjectTasksSelection {
  projectId: string;
  tasks: TaskResponse[];
}

export function useProjectsData({
  client,
  enabled,
  onLoadProjectsError,
  onLoadTasksError,
  scope,
}: UseProjectsDataOptions) {
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({
    queryKey: computed(() => userProjectsKeys.visibleProjects(scope.value)),
    enabled,
    queryFn: () => client.listVisibleProjects(),
    refetchOnWindowFocus: true,
  });
  const visibleProjects = computed(() =>
    (projectsQuery.data.value ?? []).filter((project) => project.isActive),
  );
  const projectAccessScopes = new Map<string, ProjectResponse["accessScope"]>();
  const taskQueries = useQueries({
    queries: computed(() =>
      visibleProjects.value.map((project) => ({
        queryKey: userProjectsKeys.projectTasks(
          scope.value,
          project.id,
          project.accessScope,
        ),
        enabled: enabled.value,
        queryFn: () => client.listProjectTasks(project.id),
        refetchOnWindowFocus: false,
        ...USER_LIST_QUERY_POLICY,
        select: (tasks: TaskResponse[]): ProjectTasksSelection => ({
          projectId: project.id,
          tasks,
        }),
      })),
    ),
  });
  let isManualRefresh = false;
  let manualRefreshPromise: Promise<void> | null = null;

  watch(
    () => projectsQuery.dataUpdatedAt.value,
    async (updatedAt, previousUpdatedAt) => {
      if (!updatedAt || !previousUpdatedAt || isManualRefresh) {
        return;
      }

      await nextTick();
      await Promise.all(
        taskQueries.value
          .filter((taskQuery) => taskQuery.isStale)
          .map((taskQuery) => taskQuery.refetch({ cancelRefetch: false })),
      );
    },
  );
  const tasksByProjectId = computed(() => {
    const nextTasksByProjectId: Record<string, TaskResponse[]> = {};

    for (const taskQuery of taskQueries.value) {
      const selection = taskQuery.data;

      if (selection) {
        nextTasksByProjectId[selection.projectId] = sortProjectTasks(
          selection.tasks.filter((task) => task.isActive),
        );
      }
    }

    return nextTasksByProjectId;
  });
  const taskLoadErrors = computed(() => {
    const nextTaskLoadErrors: Record<string, string> = {};
    const projects = visibleProjects.value;
    const queries = taskQueries.value;

    if (projects.length !== queries.length) {
      return nextTaskLoadErrors;
    }

    projects.forEach((project, index) => {
      const error = queries[index]?.error;

      if (error) {
        nextTaskLoadErrors[project.id] = getErrorMessage(error);
      }
    });

    return nextTaskLoadErrors;
  });
  const firstTaskError = computed(
    () => Object.values(taskLoadErrors.value)[0] ?? null,
  );
  const hasLoadedProjects = computed(() => projectsQuery.data.value !== undefined);
  const hasLoadedTasks = computed(() =>
    taskQueries.value.every((taskQuery) => taskQuery.data !== undefined),
  );
  const hasLoadedContent = computed(
    () => hasLoadedProjects.value && hasLoadedTasks.value,
  );
  const isLoadingProjects = computed(
    () => projectsQuery.isPending.value && !hasLoadedProjects.value,
  );
  const isLoadingTasks = computed(
    () => !hasLoadedTasks.value && taskQueries.value.some((taskQuery) => taskQuery.isPending),
  );
  const isRefreshing = computed(
    () => projectsQuery.isFetching.value || taskQueries.value.some((taskQuery) => taskQuery.isFetching),
  );
  const requestErrorMessage = computed(() =>
    projectsQuery.error.value
      ? getErrorMessage(projectsQuery.error.value)
      : firstTaskError.value,
  );

  async function loadPage(): Promise<void> {
    if (manualRefreshPromise) {
      return manualRefreshPromise;
    }

    isManualRefresh = true;
    manualRefreshPromise = (async () => {
      try {
        const refreshScope = scope.value;
        const taskQueriesBeforeRefresh = taskQueries.value;
        await projectsQuery.refetch({ cancelRefetch: false });

        if (
          scope.value.userId !== refreshScope.userId ||
          scope.value.workspaceId !== refreshScope.workspaceId
        ) {
          return;
        }

        await nextTick();
        await Promise.all(
          taskQueriesBeforeRefresh.map((taskQuery) =>
            taskQuery.refetch({ cancelRefetch: false }),
          ),
        );
      } finally {
        isManualRefresh = false;
        manualRefreshPromise = null;
      }
    })();

    return manualRefreshPromise;
  }

  function updateCachedProjectTasks(
    task: TaskResponse,
    updateTasks: (tasks: TaskResponse[]) => TaskResponse[],
  ): void {
    queryClient.setQueryData<TaskResponse[]>(
      userProjectsKeys.projectTasks(
        scope.value,
        task.projectId,
        task.accessScope,
      ),
      (currentTasks) => (currentTasks ? updateTasks(currentTasks) : currentTasks),
    );
  }

  function upsertTask(task: TaskResponse): void {
    updateCachedProjectTasks(task, (tasks) => [
      ...tasks.filter((currentTask) => currentTask.id !== task.id),
      task,
    ]);
  }

  function removeTask(task: TaskResponse): void {
    updateCachedProjectTasks(task, (tasks) =>
      tasks.filter((currentTask) => currentTask.id !== task.id),
    );
  }

  watch(visibleProjects, (projects) => {
    const nextAccessScopes = new Map(
      projects.map((project) => [project.id, project.accessScope]),
    );

    for (const [projectId, previousAccessScope] of projectAccessScopes) {
      const nextAccessScope = nextAccessScopes.get(projectId);

      if (!nextAccessScope) {
        queryClient.removeQueries({
          queryKey: userProjectsKeys.projectTasksAll(scope.value, projectId),
        });
      } else if (nextAccessScope !== previousAccessScope) {
        queryClient.removeQueries({
          queryKey: userProjectsKeys.projectTasks(
            scope.value,
            projectId,
            previousAccessScope,
          ),
        });
      }
    }

    projectAccessScopes.clear();
    nextAccessScopes.forEach((accessScope, projectId) => {
      projectAccessScopes.set(projectId, accessScope);
    });
  });

  watch(scope, () => {
    projectAccessScopes.clear();
  });

  watch(projectsQuery.error, (error) => {
    if (error) {
      onLoadProjectsError(error);
    }
  });

  watch(firstTaskError, (message) => {
    if (message) {
      onLoadTasksError(message);
    }
  });

  return {
    hasLoadedContent,
    hasLoadedProjects,
    isLoadingProjects,
    isLoadingTasks,
    isRefreshing,
    loadPage,
    removeTask,
    requestErrorMessage,
    taskLoadErrors,
    tasksByProjectId,
    upsertTask,
    visibleProjects,
  };
}

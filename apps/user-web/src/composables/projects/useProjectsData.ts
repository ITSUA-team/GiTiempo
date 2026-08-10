import type { TaskResponse } from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import { useQueries, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, watch, type ComputedRef } from "vue";

import { userProjectsKeys, type UserServerStateScope } from "@/lib/query-keys";
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
  });
  const visibleProjects = computed(() =>
    (projectsQuery.data.value ?? []).filter((project) => project.isActive),
  );
  const taskQueries = useQueries({
    queries: computed(() =>
      visibleProjects.value.map((project) => ({
        queryKey: userProjectsKeys.projectTasks(scope.value, project.id),
        enabled: enabled.value,
        queryFn: () => client.listProjectTasks(project.id),
        select: (tasks: TaskResponse[]): ProjectTasksSelection => ({
          projectId: project.id,
          tasks,
        }),
      })),
    ),
  });
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
  const isLoadingProjects = computed(() => projectsQuery.isFetching.value);
  const isLoadingTasks = computed(() =>
    taskQueries.value.some((taskQuery) => taskQuery.isFetching),
  );
  const requestErrorMessage = computed(() =>
    projectsQuery.error.value
      ? getErrorMessage(projectsQuery.error.value)
      : firstTaskError.value,
  );

  async function loadPage(): Promise<void> {
    await projectsQuery.refetch();
    await Promise.all(taskQueries.value.map((taskQuery) => taskQuery.refetch()));
  }

  function updateCachedProjectTasks(
    projectId: string,
    updateTasks: (tasks: TaskResponse[]) => TaskResponse[],
  ): void {
    queryClient.setQueryData<TaskResponse[]>(
      userProjectsKeys.projectTasks(scope.value, projectId),
      (currentTasks) => (currentTasks ? updateTasks(currentTasks) : currentTasks),
    );
  }

  function upsertTask(task: TaskResponse): void {
    updateCachedProjectTasks(task.projectId, (tasks) => [
      ...tasks.filter((currentTask) => currentTask.id !== task.id),
      task,
    ]);
  }

  function removeTask(task: TaskResponse): void {
    updateCachedProjectTasks(task.projectId, (tasks) =>
      tasks.filter((currentTask) => currentTask.id !== task.id),
    );
  }

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
    isLoadingProjects,
    isLoadingTasks,
    loadPage,
    removeTask,
    requestErrorMessage,
    taskLoadErrors,
    tasksByProjectId,
    upsertTask,
    visibleProjects,
  };
}

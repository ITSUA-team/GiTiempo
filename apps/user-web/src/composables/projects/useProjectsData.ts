import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, watch, type ComputedRef } from "vue";

import { userProjectsKeys, type UserServerStateScope } from "@/lib/query-keys";
import { sortProjectTasks } from "@/lib/projects-page-helpers";
import type { TimeEntriesClient } from "@/services/time-entries-client";

interface UseProjectsDataOptions {
  accessToken: ComputedRef<string | null>;
  client: TimeEntriesClient;
  onLoadProjectsError(error: unknown): void;
  onLoadTasksError(message: string): void;
  scope: ComputedRef<UserServerStateScope>;
}

export function useProjectsData({
  accessToken,
  client,
  onLoadProjectsError,
  onLoadTasksError,
  scope,
}: UseProjectsDataOptions) {
  interface ProjectsPageData {
    taskLoadErrors: Record<string, string>;
    tasksByProjectId: Record<string, TaskResponse[]>;
    visibleProjects: ProjectResponse[];
  }

  const queryClient = useQueryClient();
  const queryKey = computed(() => userProjectsKeys.page(scope.value));
  const projectsPageQuery = useQuery({
    queryKey,
    enabled: computed(() => Boolean(accessToken.value)),
    queryFn: async (): Promise<ProjectsPageData> => {
      const projects = await client.listVisibleProjects();
      const visibleProjects = projects.filter((project) => project.isActive);
      const tasksByProjectId: Record<string, TaskResponse[]> = {};
      const taskLoadErrors: Record<string, string> = {};

      for (const project of visibleProjects) {
        try {
          const nextTasks = await client.listProjectTasks(project.id);

          tasksByProjectId[project.id] = sortProjectTasks(
            nextTasks.filter((task) => task.isActive),
          );
        } catch (error) {
          taskLoadErrors[project.id] = getErrorMessage(error);
        }
      }

      return { taskLoadErrors, tasksByProjectId, visibleProjects };
    },
  });
  const visibleProjects = computed(() =>
    projectsPageQuery.data.value?.visibleProjects ?? [],
  );
  const tasksByProjectId = computed(() =>
    projectsPageQuery.data.value?.tasksByProjectId ?? {},
  );
  const taskLoadErrors = computed(() =>
    projectsPageQuery.data.value?.taskLoadErrors ?? {},
  );
  const firstTaskError = computed(() => Object.values(taskLoadErrors.value)[0] ?? null);
  const isLoadingProjects = computed(() => projectsPageQuery.isFetching.value);
  const isLoadingTasks = computed(() => projectsPageQuery.isFetching.value);
  const requestErrorMessage = computed(() =>
    projectsPageQuery.error.value
      ? getErrorMessage(projectsPageQuery.error.value)
      : firstTaskError.value,
  );

  async function loadPage(): Promise<void> {
    await projectsPageQuery.refetch();
  }

  function upsertTask(task: TaskResponse): void {
    queryClient.setQueryData<ProjectsPageData>(queryKey.value, (currentData) => {
      if (!currentData) return currentData;

      return {
        ...currentData,
        tasksByProjectId: {
          ...currentData.tasksByProjectId,
          [task.projectId]: sortProjectTasks([
            ...(currentData.tasksByProjectId[task.projectId] ?? []).filter(
              (currentTask) => currentTask.id !== task.id,
            ),
            task,
          ]),
        },
      };
    });
  }

  function removeTask(task: TaskResponse): void {
    queryClient.setQueryData<ProjectsPageData>(queryKey.value, (currentData) => {
      if (!currentData) return currentData;

      return {
        ...currentData,
        tasksByProjectId: {
          ...currentData.tasksByProjectId,
          [task.projectId]: (currentData.tasksByProjectId[task.projectId] ?? []).filter(
            (currentTask) => currentTask.id !== task.id,
          ),
        },
      };
    });
  }

  watch(projectsPageQuery.error, (error) => {
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

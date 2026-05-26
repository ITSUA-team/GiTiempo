import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import {
  useProjectTasksQuery,
  useVisibleProjectsQuery,
} from "@gitiempo/web-shared/query";
import { computed, nextTick, ref, shallowRef, type ComputedRef } from "vue";

import { sortProjectTasks } from "@/lib/projects-page-helpers";
import type { TimeEntriesClient } from "@/services/time-entries-client";

/* eslint-disable no-unused-vars */
interface UseProjectsDataOptions {
  accessToken: ComputedRef<string | null>;
  client: TimeEntriesClient;
  onLoadProjectsError(error: unknown): void;
  onLoadTasksError(message: string): void;
}
/* eslint-enable no-unused-vars */

export function useProjectsData({
  accessToken,
  client,
  onLoadProjectsError,
  onLoadTasksError,
}: UseProjectsDataOptions) {
  const projects = ref<ProjectResponse[]>([]);
  const tasksByProjectId = ref<Record<string, TaskResponse[]>>({});
  const taskLoadErrors = ref<Record<string, string>>({});
  const isLoadingProjects = shallowRef(true);
  const isLoadingTasks = shallowRef(false);
  const requestErrorMessage = shallowRef<string | null>(null);
  const projectTasksProjectId = shallowRef<string | null>(null);
  const visibleProjects = computed(() =>
    projects.value.filter((project) => project.isActive),
  );
  const visibleProjectsQuery = useVisibleProjectsQuery({
    accessToken,
    client,
    enabled: false,
  });
  const projectTasksQuery = useProjectTasksQuery({
    accessToken,
    client,
    enabled: false,
    projectId: projectTasksProjectId,
  });
  async function loadVisibleProjects(): Promise<ProjectResponse[]> {
    isLoadingProjects.value = true;

    try {
      const result = await visibleProjectsQuery.refetch({ throwOnError: true });

      if (!result.data) {
        throw result.error ?? new Error("Could not load visible projects.");
      }

      projects.value = result.data;
      return visibleProjects.value;
    } catch (error) {
      projects.value = [];
      requestErrorMessage.value = getErrorMessage(error);
      onLoadProjectsError(error);
      throw error;
    } finally {
      isLoadingProjects.value = false;
    }
  }

  async function loadTasksForProjects(projectOptions: ProjectResponse[]): Promise<void> {
    isLoadingTasks.value = true;
    tasksByProjectId.value = {};
    taskLoadErrors.value = {};

    try {
      const nextTasksByProjectId: Record<string, TaskResponse[]> = {};
      const nextTaskErrors: Record<string, string> = {};

      for (const project of projectOptions) {
        try {
          projectTasksProjectId.value = project.id;
          await nextTick();

          const result = await projectTasksQuery.refetch({ throwOnError: true });

          if (!result.data) {
            throw result.error ?? new Error("Could not load project tasks.");
          }

          const nextTasks = result.data;

          nextTasksByProjectId[project.id] = sortProjectTasks(
            nextTasks.filter((task) => task.isActive),
          );
        } catch (error) {
          nextTaskErrors[project.id] = getErrorMessage(error);
        }
      }

      tasksByProjectId.value = nextTasksByProjectId;
      taskLoadErrors.value = nextTaskErrors;

      const firstTaskError = Object.values(nextTaskErrors)[0] ?? null;

      if (firstTaskError) {
        requestErrorMessage.value = firstTaskError;
        onLoadTasksError(firstTaskError);
      }
    } finally {
      isLoadingTasks.value = false;
    }
  }

  async function loadPage(): Promise<void> {
    requestErrorMessage.value = null;

    let nextProjects: ProjectResponse[] = [];

    try {
      nextProjects = await loadVisibleProjects();
    } catch {
      tasksByProjectId.value = {};
      taskLoadErrors.value = {};
      return;
    }

    if (nextProjects.length === 0) {
      tasksByProjectId.value = {};
      taskLoadErrors.value = {};
      return;
    }

    await loadTasksForProjects(nextProjects);
  }

  function upsertTask(task: TaskResponse): void {
    tasksByProjectId.value = {
      ...tasksByProjectId.value,
      [task.projectId]: sortProjectTasks([
        ...(tasksByProjectId.value[task.projectId] ?? []).filter(
          (currentTask) => currentTask.id !== task.id,
        ),
        task,
      ]),
    };
  }

  function removeTask(task: TaskResponse): void {
    tasksByProjectId.value = {
      ...tasksByProjectId.value,
      [task.projectId]: (tasksByProjectId.value[task.projectId] ?? []).filter(
        (currentTask) => currentTask.id !== task.id,
      ),
    };
  }

  return {
    isLoadingProjects,
    isLoadingTasks,
    loadPage,
    removeTask,
    requestErrorMessage,
    taskLoadErrors,
    tasksByProjectId: computed(() => tasksByProjectId.value),
    upsertTask,
    visibleProjects,
  };
}

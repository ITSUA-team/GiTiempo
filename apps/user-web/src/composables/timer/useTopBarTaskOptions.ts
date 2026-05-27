import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import {
  useProjectTasksQuery,
  useVisibleProjectsQuery,
} from "@/composables/query";
import { computed, nextTick, shallowRef, type ComputedRef } from "vue";

import { timerKeys, type UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";

import type { TopBarTaskPicker } from "./useTopBarTaskPicker";

interface UseTopBarTaskOptionsOptions {
  accessToken: ComputedRef<string | null>;
  client: TimeEntriesClient;
  picker: TopBarTaskPicker;
  scope: ComputedRef<UserServerStateScope>;
}

export function useTopBarTaskOptions({
  accessToken,
  client,
  picker,
  scope,
}: UseTopBarTaskOptionsOptions) {
  const isLoadingProjects = shallowRef(false);
  const isLoadingTasks = shallowRef(false);
  const projectTasksProjectId = shallowRef<string | null>(null);
  let taskRequestId = 0;

  const visibleProjectsQuery = useVisibleProjectsQuery({
    accessToken,
    client,
    enabled: false,
    queryKey: computed(() => timerKeys.visibleProjects(scope.value)),
    scope,
  });
  const projectTasksQuery = useProjectTasksQuery({
    accessToken,
    client,
    enabled: false,
    projectId: projectTasksProjectId,
    queryKey: computed(() =>
      timerKeys.projectTasks(scope.value, projectTasksProjectId.value),
    ),
    scope,
  });

  async function ensureProjectsLoaded(): Promise<ProjectResponse[]> {
    if (picker.projects.value.length > 0) {
      return picker.projects.value;
    }

    isLoadingProjects.value = true;
    picker.setProjectsError(null);

    try {
      const result = await visibleProjectsQuery.refetch({ throwOnError: true });

      if (!result.data) {
        throw result.error ?? new Error("Could not load visible projects.");
      }

      picker.setProjects(result.data);
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

    isLoadingTasks.value = true;
    picker.setTasksError(null);

    try {
      const cachedTasks = picker.getCachedTasks(projectId);

      if (cachedTasks) {
        picker.setTasks(cachedTasks);
        return cachedTasks;
      }

      projectTasksProjectId.value = projectId;
      await nextTick();

      const result = await projectTasksQuery.refetch({ throwOnError: true });

      if (!result.data) {
        throw result.error ?? new Error("Could not load project tasks.");
      }

      const nextTasks = result.data;

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

  return {
    ensureProjectsLoaded,
    isLoadingProjects,
    isLoadingTasks,
    loadTasksForProject,
  };
}

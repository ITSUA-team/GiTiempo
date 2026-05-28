import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import { useQueryClient } from "@tanstack/vue-query";
import { shallowRef, type ComputedRef } from "vue";

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
  const queryClient = useQueryClient();
  const isLoadingProjects = shallowRef(false);
  const isLoadingTasks = shallowRef(false);
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

  return {
    ensureProjectsLoaded,
    isLoadingProjects,
    isLoadingTasks,
    loadTasksForProject,
  };
}

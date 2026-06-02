import { getErrorMessage } from "@gitiempo/web-shared";
import { computed } from "vue";

import type { TimeEntriesClient } from "@/services/time-entries-client";

import { toTaskLookupOption, type TaskLookupOption } from "./time-entry-task-lookup";

interface UseTimeEntryTaskOptionsOptions {
  client: TimeEntriesClient;
}

/* eslint-disable no-unused-vars */
interface TaskOptionsTarget {
  beginTaskRequest(): number;
  isCurrentTaskRequest(requestId: number): boolean;
  setTaskOptions(options: TaskLookupOption[]): void;
  setTasksError(message: string | null): void;
  setTasksLoading(isLoading: boolean): void;
}
/* eslint-enable no-unused-vars */

export function useTimeEntryTaskOptions({
  client,
}: UseTimeEntryTaskOptionsOptions) {
  const taskCache = new Map<string, TaskLookupOption[]>();
  const cachedTaskOptions = computed(() => Array.from(taskCache.values()).flat());

  async function loadProjectTaskOptions(projectId: string): Promise<TaskLookupOption[]> {
    const cached = taskCache.get(projectId);

    if (cached) {
      return cached;
    }

    const nextTasks = (await client.listProjectTasks(projectId))
      .filter((task) => task.isActive)
      .map(toTaskLookupOption);

    taskCache.set(projectId, nextTasks);

    return nextTasks;
  }

  async function loadTargetProjectTaskOptions(
    projectId: string,
    target: TaskOptionsTarget,
  ): Promise<TaskLookupOption[]> {
    const requestId = target.beginTaskRequest();

    target.setTasksLoading(true);
    target.setTasksError(null);

    try {
      const tasks = await loadProjectTaskOptions(projectId);

      if (target.isCurrentTaskRequest(requestId)) {
        target.setTaskOptions(tasks);
      }

      return tasks;
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

  return {
    cachedTaskOptions,
    loadProjectTaskOptions,
    loadTargetProjectTaskOptions,
  };
}

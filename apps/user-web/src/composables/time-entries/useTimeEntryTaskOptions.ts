import type { TaskResponse } from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";

import type { TimeEntriesClient } from "@/services/time-entries-client";

import { toTaskLookupOption, type TaskLookupOption } from "./time-entry-task-lookup";

interface UseTimeEntryTaskOptionsOptions {
  client: TimeEntriesClient;
}

interface LoadTaskOptionsOptions {
  trackableOnly?: boolean;
}

interface TaskOptionsTarget {
  beginTaskRequest(): number;
  isCurrentTaskRequest(requestId: number): boolean;
  setTaskOptions(options: TaskLookupOption[]): void;
  setTasksError(message: string | null): void;
  setTasksLoading(isLoading: boolean): void;
}

export function useTimeEntryTaskOptions({
  client,
}: UseTimeEntryTaskOptionsOptions) {
  const taskCache = new Map<string, TaskResponse[]>();

  function toVisibleTaskOptions(
    tasks: TaskResponse[],
    options: LoadTaskOptionsOptions = {},
  ): TaskLookupOption[] {
    return tasks
      .filter(
        (task) =>
          task.isActive && (!options.trackableOnly || task.status === "open"),
      )
      .map(toTaskLookupOption);
  }

  async function loadProjectTaskOptions(
    projectId: string,
    options: LoadTaskOptionsOptions = {},
  ): Promise<TaskLookupOption[]> {
    let tasks = taskCache.get(projectId);

    if (!tasks) {
      tasks = await client.listProjectTasks(projectId);
      taskCache.set(projectId, tasks);
    }

    return toVisibleTaskOptions(tasks, options);
  }

  function upsertProjectTask(
    task: TaskResponse,
    options: LoadTaskOptionsOptions = {},
  ): TaskLookupOption[] {
    const cachedTasks = taskCache.get(task.projectId) ?? [];
    const nextTasks = [
      ...cachedTasks.filter((cachedTask) => cachedTask.id !== task.id),
      task,
    ];

    taskCache.set(task.projectId, nextTasks);
    return toVisibleTaskOptions(nextTasks, options);
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
      const tasks = await loadProjectTaskOptions(projectId, options);

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
    loadProjectTaskOptions,
    loadTargetProjectTaskOptions,
    upsertProjectTask,
  };
}

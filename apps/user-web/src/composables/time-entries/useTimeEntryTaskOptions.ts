import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";

import { appendUnsyncedProjectGitHubIssueOptions } from "@/lib/project-github-issues";
import type { TimeEntriesClient } from "@/services/time-entries-client";

import {
  toGitHubIssueTaskLookupOption,
  toTaskLookupOption,
  type TaskLookupOption,
} from "./time-entry-task-lookup";

/* eslint-disable no-unused-vars */
interface UseTimeEntryTaskOptionsOptions {
  client: TimeEntriesClient;
  getProjectById(projectId: string): ProjectResponse | null;
}
/* eslint-enable no-unused-vars */

interface LoadTaskOptionsOptions {
  trackableOnly?: boolean;
}

interface LoadedTaskOptionsResult {
  errorMessage: string | null;
  taskOptions: TaskLookupOption[];
}

interface CachedProjectTaskOptions {
  githubIssueOptions: TaskLookupOption[];
  localTasks: TaskResponse[];
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
  getProjectById,
}: UseTimeEntryTaskOptionsOptions) {
  const taskCache = new Map<string, CachedProjectTaskOptions>();

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
  ): Promise<LoadedTaskOptionsResult> {
    const cached = taskCache.get(projectId);

    if (cached) {
      return {
        errorMessage: null,
        taskOptions: buildTaskOptions(
          cached.localTasks,
          cached.githubIssueOptions,
          options.trackableOnly,
        ),
      };
    }

    const localTasks = await client.listProjectTasks(projectId);
    const localTaskOptions = buildLocalTaskOptions(localTasks, options.trackableOnly);
    const result = await appendGitHubIssueOptions(
      projectId,
      localTaskOptions,
      localTasks,
    );

    if (result.errorMessage === null) {
      taskCache.set(projectId, {
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
    const cached = taskCache.get(task.projectId) ?? {
      githubIssueOptions: [],
      localTasks: [],
    };
    const nextLocalTasks = [
      ...cached.localTasks.filter((cachedTask) => cachedTask.id !== task.id),
      task,
    ];

    taskCache.set(task.projectId, {
      githubIssueOptions: cached.githubIssueOptions,
      localTasks: nextLocalTasks,
    });
    return buildTaskOptions(
      nextLocalTasks,
      cached.githubIssueOptions,
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
    taskCache.delete(projectId);
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
  ): Promise<LoadedTaskOptionsResult> {
    const project = getProjectById(projectId);

    return appendUnsyncedProjectGitHubIssueOptions({
      client,
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

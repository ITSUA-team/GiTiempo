import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";

import { listUnsyncedProjectGitHubIssues } from "@/lib/project-github-issues";
import type { TimeEntriesClient } from "@/services/time-entries-client";

import {
  toGitHubIssueTaskLookupOption,
  toTaskLookupOption,
  type TaskLookupOption,
} from "./time-entry-task-lookup";

interface UseTimeEntryTaskOptionsOptions {
  client: TimeEntriesClient;
  getProjectById(projectId: string): ProjectResponse | null;
}

interface LoadTaskOptionsOptions {
  trackableOnly?: boolean;
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
  const taskCache = new Map<string, TaskResponse[]>();

  async function loadProjectTaskOptions(
    projectId: string,
    options: LoadTaskOptionsOptions = {},
  ): Promise<TaskLookupOption[]> {
    let tasks = taskCache.get(projectId);

    if (!tasks) {
      tasks = await client.listProjectTasks(projectId);
      taskCache.set(projectId, tasks);
    }

    const localTaskOptions = tasks
      .filter(
        (task) =>
          task.isActive && (!options.trackableOnly || task.status === "open"),
      )
      .map(toTaskLookupOption);

    return appendGitHubIssueOptions(projectId, localTaskOptions, tasks);
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

  function invalidateProjectTaskOptions(projectId: string): void {
    taskCache.delete(projectId);
  }

  return {
    invalidateProjectTaskOptions,
    loadProjectTaskOptions,
    loadTargetProjectTaskOptions,
  };

  async function appendGitHubIssueOptions(
    projectId: string,
    localTaskOptions: TaskLookupOption[],
    localTasks: TaskResponse[],
  ): Promise<TaskLookupOption[]> {
    const project = getProjectById(projectId);

    if (!project || project.source !== "github") {
      return localTaskOptions;
    }

    try {
      const githubIssueOptions = (
        await listUnsyncedProjectGitHubIssues({
          client,
          localTasks,
          projectId: project.id,
        })
      ).map((issue) =>
        toGitHubIssueTaskLookupOption({
          defaultBillableForTimeEntries: project.defaultBillableForTasks,
          githubIssue: issue.githubIssue,
          issueTitle: issue.issueTitle,
          projectId: issue.projectId,
        }),
      );

      return [...localTaskOptions, ...githubIssueOptions];
    } catch {
      return localTaskOptions;
    }
  }
}

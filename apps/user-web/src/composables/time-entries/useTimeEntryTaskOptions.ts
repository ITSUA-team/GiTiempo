import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";

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

    const repo = parseGitHubRepositoryProject(project);

    if (!repo) {
      return localTaskOptions;
    }

    try {
      const response = await client.listGitHubRepositoryIssues(repo.owner, repo.name, {
        limit: 30,
        state: "open",
      });
      const syncedLocalIssues = new Set(
        localTasks
          .map((task) => task.githubIssue)
          .filter((issue) => issue !== null)
          .map((issue) => `${issue.githubRepo.toLowerCase()}#${issue.issueNumber}`),
      );
      const githubIssueOptions = response.items
        .filter(
          (issue) =>
            !syncedLocalIssues.has(
              `${issue.repository.fullName.toLowerCase()}#${issue.number}`,
            ),
        )
        .map((issue) =>
          toGitHubIssueTaskLookupOption({
            defaultBillableForTimeEntries: project.defaultBillableForTasks,
            githubIssue: {
              githubRepo: issue.repository.fullName,
              issueNumber: issue.number,
            },
            issueTitle: issue.title,
            projectId: project.id,
          }),
        );

      return [...localTaskOptions, ...githubIssueOptions];
    } catch {
      return localTaskOptions;
    }
  }
}

function parseGitHubRepositoryProject(
  project: ProjectResponse,
): { name: string; owner: string } | null {
  const [owner, name, ...rest] = project.name.split("/");

  if (!owner || !name || rest.length > 0) {
    return null;
  }

  return { owner, name };
}

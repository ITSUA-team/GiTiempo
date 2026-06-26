import type { SyncedGitHubIssue, TaskResponse } from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";

import type { TimeEntriesClient } from "@/services/time-entries-client";

export interface UnsyncedProjectGitHubIssue {
  githubIssue: SyncedGitHubIssue;
  issueTitle: string;
  projectId: string;
  updatedAt: string;
}

export interface UnsyncedProjectGitHubIssueResult {
  errorMessage: string | null;
  issues: UnsyncedProjectGitHubIssue[];
}

export async function loadUnsyncedProjectGitHubIssues(input: {
  client: TimeEntriesClient;
  localTasks: TaskResponse[];
  projectId: string;
}): Promise<UnsyncedProjectGitHubIssueResult> {
  try {
    const response = await input.client.listProjectGitHubIssues(input.projectId, {
      limit: 30,
      state: "open",
    });
    const syncedLocalIssues = new Set(
      input.localTasks
        .map((task) => task.githubIssue)
        .filter((issue) => issue !== null)
        .map((issue) => `${issue.githubRepo.toLowerCase()}#${issue.issueNumber}`),
    );

    return {
      errorMessage: null,
      issues: response.items
        .filter(
          (issue) =>
            !syncedLocalIssues.has(
              `${issue.repository.fullName.toLowerCase()}#${issue.number}`,
            ),
        )
        .map((issue) => ({
          githubIssue: {
            githubRepo: issue.repository.fullName,
            issueNumber: issue.number,
          },
          issueTitle: issue.title,
          projectId: input.projectId,
          updatedAt: issue.updatedAt,
        })),
    };
  } catch (error) {
    return {
      errorMessage: getErrorMessage(error),
      issues: [],
    };
  }
}

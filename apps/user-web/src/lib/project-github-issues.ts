import type {
  GitHubRepositoryIssueListResponse,
  ProjectResponse,
  SyncedGitHubIssue,
  TaskResponse,
} from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";

import type { TimeEntriesClient } from "@/services/time-entries-client";

const PROJECT_GITHUB_ISSUE_PAGE_SIZE = 30;
const MAX_PROJECT_GITHUB_ISSUE_OPTION_COUNT = 30;
const MAX_PROJECT_GITHUB_ISSUE_PAGES = 5;

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

export interface AppendedProjectTaskOptionsResult<TTaskOption> {
  errorMessage: string | null;
  taskOptions: TTaskOption[];
}

/* eslint-disable no-unused-vars */
interface AppendUnsyncedProjectGitHubIssueOptionsInput<TTaskOption> {
  client: TimeEntriesClient;
  localTaskOptions: TTaskOption[];
  localTasks: TaskResponse[];
  project: Pick<ProjectResponse, "id" | "source"> | null;
  mapGitHubIssue(issue: UnsyncedProjectGitHubIssue): TTaskOption;
}
/* eslint-enable no-unused-vars */

export function supportsProjectGitHubIssueSuggestions(
  project: Pick<ProjectResponse, "source"> | null,
  localTasks: Pick<TaskResponse, "githubIssue">[],
): boolean {
  return (
    project !== null &&
    (project.source === "github" ||
      localTasks.some((task) => task.githubIssue !== null))
  );
}

export async function loadUnsyncedProjectGitHubIssues(input: {
  client: TimeEntriesClient;
  localTasks: TaskResponse[];
  projectId: string;
}): Promise<UnsyncedProjectGitHubIssueResult> {
  try {
    const issues: UnsyncedProjectGitHubIssue[] = [];
    const syncedLocalIssues = new Set(
      input.localTasks
        .map((task) => task.githubIssue)
        .filter((issue) => issue !== null)
        .map(toGitHubIssueKey),
    );
    let pageToken: string | undefined = undefined;
    let pagesLoaded = 0;

    do {
      const response = await input.client.listProjectGitHubIssues(
        input.projectId,
        {
          limit: PROJECT_GITHUB_ISSUE_PAGE_SIZE,
          ...(pageToken ? { pageToken } : {}),
          state: "open",
        },
      );

      for (const issue of response.items) {
        const issueKey = toRepositoryIssueKey(issue);

        if (syncedLocalIssues.has(issueKey)) {
          continue;
        }

        issues.push({
          githubIssue: {
            githubRepo: issue.repository.fullName,
            issueNumber: issue.number,
          },
          issueTitle: issue.title,
          projectId: input.projectId,
          updatedAt: issue.updatedAt,
        });

        if (issues.length >= MAX_PROJECT_GITHUB_ISSUE_OPTION_COUNT) {
          break;
        }
      }

      pagesLoaded += 1;
      pageToken =
        issues.length < MAX_PROJECT_GITHUB_ISSUE_OPTION_COUNT &&
        pagesLoaded < MAX_PROJECT_GITHUB_ISSUE_PAGES
          ? (response.pagination.nextPageToken ?? undefined)
          : undefined;
    } while (pageToken !== undefined);

    return { errorMessage: null, issues };
  } catch (error) {
    return {
      errorMessage: getErrorMessage(error),
      issues: [],
    };
  }
}

export async function appendUnsyncedProjectGitHubIssueOptions<TTaskOption>(
  input: AppendUnsyncedProjectGitHubIssueOptionsInput<TTaskOption>,
): Promise<AppendedProjectTaskOptionsResult<TTaskOption>> {
  const project = input.project;

  if (
    project === null ||
    !supportsProjectGitHubIssueSuggestions(project, input.localTasks)
  ) {
    return {
      errorMessage: null,
      taskOptions: input.localTaskOptions,
    };
  }

  const { errorMessage, issues } = await loadUnsyncedProjectGitHubIssues({
    client: input.client,
    localTasks: input.localTasks,
    projectId: project.id,
  });

  return {
    errorMessage,
    taskOptions: [
      ...input.localTaskOptions,
      ...issues.map((issue) => input.mapGitHubIssue(issue)),
    ],
  };
}

function toGitHubIssueKey(issue: SyncedGitHubIssue): string {
  return `${issue.githubRepo.toLowerCase()}#${issue.issueNumber}`;
}

function toRepositoryIssueKey(
  issue: GitHubRepositoryIssueListResponse["items"][number],
): string {
  return `${issue.repository.fullName.toLowerCase()}#${issue.number}`;
}

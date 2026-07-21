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

interface AppendUnsyncedProjectGitHubIssueOptionsInput<TTaskOption> {
  client: TimeEntriesClient;
  knownSyncedGitHubIssues?: SyncedGitHubIssue[];
  localTaskOptions: TTaskOption[];
  localTasks: TaskResponse[];
  hasKnownGitHubIssueSource?: boolean;
  project: Pick<ProjectResponse, "id" | "source"> | null;
  mapGitHubIssue(issue: UnsyncedProjectGitHubIssue): TTaskOption;
}

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
  knownSyncedGitHubIssues?: SyncedGitHubIssue[];
  localTasks: TaskResponse[];
  projectId: string;
}): Promise<UnsyncedProjectGitHubIssueResult> {
  try {
    const issues: UnsyncedProjectGitHubIssue[] = [];
    const syncedLocalIssues = new Set(
      [
        ...input.localTasks.map((task) => task.githubIssue),
        ...(input.knownSyncedGitHubIssues ?? []),
      ]
        .filter((issue): issue is SyncedGitHubIssue => issue !== null)
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
    (!input.hasKnownGitHubIssueSource &&
      !supportsProjectGitHubIssueSuggestions(project, input.localTasks))
  ) {
    return {
      errorMessage: null,
      taskOptions: input.localTaskOptions,
    };
  }

  const { errorMessage, issues } = await loadUnsyncedProjectGitHubIssues({
    client: input.client,
    knownSyncedGitHubIssues: input.knownSyncedGitHubIssues,
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

// Case-insensitive: GitHub owner/repo identity ignores casing (github.com
// treats "ITSUA-team" and "itsua-team" as the same owner), and the backend
// dedupes GitHub refs the same way via lower(external_key). Comparing
// case-sensitively here surfaced an already-synced issue as unsynced whenever
// its stored casing differed from the casing GitHub's issue list returns;
// re-selecting it then just returned the existing task without repairing the
// ref, so it stayed "unsynced" forever. Only the comparison key is lowercased —
// the issue's real casing is preserved for display and task creation.
function toGitHubIssueKey(issue: SyncedGitHubIssue): string {
  return `${issue.githubRepo}#${issue.issueNumber}`.toLowerCase();
}

function toRepositoryIssueKey(
  issue: GitHubRepositoryIssueListResponse["items"][number],
): string {
  return `${issue.repository.fullName}#${issue.number}`.toLowerCase();
}

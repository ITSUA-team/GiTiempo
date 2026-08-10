import type {
  GitHubProject,
  GitHubProjectIssueItem,
  ProjectResponse,
  SyncedGitHubIssue,
} from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import { isApiErrorStatus } from "@gitiempo/web-shared/http";

import type { TimeEntriesClient } from "@/services/time-entries-client";

const PROJECT_PAGE_SIZE = 50;
const MAX_PROJECT_OPTION_COUNT = 50;
const MAX_PROJECT_PAGES = 3;
const ISSUE_PAGE_SIZE = 30;
const MAX_ISSUE_OPTION_COUNT = 50;
const MAX_ISSUE_PAGES = 5;

export type GitHubProjectAvailability =
  | "available"
  | "no-connection"
  | "no-organization";

export interface GitHubProjectListResult {
  availability: GitHubProjectAvailability;
  errorMessage: string | null;
  isTruncated: boolean;
  projects: GitHubProject[];
}

export interface GitHubProjectIssueOption {
  githubIssue: SyncedGitHubIssue;
  issueTitle: string;
  updatedAt: string;
}

export interface GitHubProjectIssueResult {
  draftCount: number;
  errorMessage: string | null;
  isTruncated: boolean;
  issues: GitHubProjectIssueOption[];
}

const EMPTY_PROJECTS: GitHubProjectListResult = {
  availability: "available",
  errorMessage: null,
  isTruncated: false,
  projects: [],
};

export async function loadOrganizationGitHubProjects(input: {
  client: TimeEntriesClient;
}): Promise<GitHubProjectListResult> {
  let owners;

  try {
    owners = await input.client.listGitHubOwners();
  } catch (error) {
    if (isApiErrorStatus(error, [404])) {
      return { ...EMPTY_PROJECTS, availability: "no-connection" };
    }

    return { ...EMPTY_PROJECTS, errorMessage: getErrorMessage(error) };
  }

  const organizations = owners.items.filter(
    (owner) => owner.type === "organization",
  );

  if (organizations.length === 0) {
    return { ...EMPTY_PROJECTS, availability: "no-organization" };
  }

  const projects: GitHubProject[] = [];
  let isTruncated = false;

  try {
    for (const organization of organizations) {
      let pageToken: string | undefined = undefined;
      let pagesLoaded = 0;

      do {
        const response = await input.client.listGitHubProjects(
          organization.login,
          {
            limit: PROJECT_PAGE_SIZE,
            ...(pageToken ? { pageToken } : {}),
          },
        );

        for (const project of response.items) {
          if (project.state !== "open") {
            continue;
          }

          projects.push(project);
        }

        pagesLoaded += 1;
        const hasMore = response.pagination.nextPageToken !== null;
        const reachedCap =
          projects.length >= MAX_PROJECT_OPTION_COUNT ||
          pagesLoaded >= MAX_PROJECT_PAGES;

        if (reachedCap) {
          isTruncated = isTruncated || hasMore;
          pageToken = undefined;
        } else {
          pageToken = response.pagination.nextPageToken ?? undefined;
        }
      } while (pageToken !== undefined);

      if (projects.length >= MAX_PROJECT_OPTION_COUNT) {
        isTruncated = true;
        break;
      }
    }
  } catch (error) {
    return { ...EMPTY_PROJECTS, errorMessage: getErrorMessage(error) };
  }

  return {
    availability: "available",
    errorMessage: null,
    isTruncated,
    projects: projects.slice(0, MAX_PROJECT_OPTION_COUNT),
  };
}

export async function loadGitHubProjectIssues(input: {
  client: TimeEntriesClient;
  githubProjectId: string;
}): Promise<GitHubProjectIssueResult> {
  const issues: GitHubProjectIssueOption[] = [];
  let draftCount = 0;
  let isTruncated = false;

  try {
    let pageToken: string | undefined = undefined;
    let pagesLoaded = 0;

    do {
      const response = await input.client.listGitHubProjectIssues(
        input.githubProjectId,
        {
          limit: ISSUE_PAGE_SIZE,
          ...(pageToken ? { pageToken } : {}),
          state: "open",
        },
      );

      draftCount += response.skipped.draftIssues;

      for (const item of response.items) {
        if (item.isArchived) {
          continue;
        }

        issues.push(toIssueOption(item));
      }

      pagesLoaded += 1;
      const hasMore = response.pagination.nextPageToken !== null;
      const reachedCap =
        issues.length >= MAX_ISSUE_OPTION_COUNT ||
        pagesLoaded >= MAX_ISSUE_PAGES;

      if (reachedCap) {
        isTruncated = isTruncated || hasMore;
        pageToken = undefined;
      } else {
        pageToken = response.pagination.nextPageToken ?? undefined;
      }
    } while (pageToken !== undefined);
  } catch (error) {
    return {
      draftCount: 0,
      errorMessage: getErrorMessage(error),
      isTruncated: false,
      issues: [],
    };
  }

  return {
    draftCount,
    errorMessage: null,
    isTruncated,
    issues: issues.slice(0, MAX_ISSUE_OPTION_COUNT),
  };
}

function toIssueOption(item: GitHubProjectIssueItem): GitHubProjectIssueOption {
  return {
    githubIssue: {
      githubRepo: item.issue.repository.fullName,
      issueNumber: item.issue.number,
    },
    issueTitle: item.issue.title,
    updatedAt: item.issue.updatedAt,
  };
}

const MAX_REPOSITORY_PROBE_BOARDS = 12;
const REPOSITORY_PROBE_PAGE_SIZE = 50;

export interface GitHubProjectRepositorySummary {
  repositories: string[];
  hasMore: boolean;
}

export async function loadGitHubProjectRepositories(input: {
  client: TimeEntriesClient;
  projects: Pick<GitHubProject, "id">[];
}): Promise<Record<string, GitHubProjectRepositorySummary>> {
  const boards = input.projects.slice(0, MAX_REPOSITORY_PROBE_BOARDS);
  const entries = await Promise.all(
    boards.map(async (board) => {
      try {
        const response = await input.client.listGitHubProjectIssues(board.id, {
          limit: REPOSITORY_PROBE_PAGE_SIZE,
          state: "open",
        });
        const repositories: string[] = [];

        for (const item of response.items) {
          const fullName = item.issue.repository.fullName;

          if (!repositories.includes(fullName)) {
            repositories.push(fullName);
          }
        }

        return [
          board.id,
          {
            hasMore: response.pagination.nextPageToken !== null,
            repositories,
          },
        ] as const;
      } catch {
        return [board.id, { hasMore: false, repositories: [] }] as const;
      }
    }),
  );

  return Object.fromEntries(entries);
}

export function toTrackedRepositoryKeySet(
  projects: Pick<ProjectResponse, "name" | "source">[],
): Set<string> {
  return new Set(
    projects
      .filter((project) => project.source === "github")
      .map((project) => project.name)
      .filter((name) => /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(name))
      .map((name) => name.toLowerCase()),
  );
}

export function isRepositoryTracked(
  fullName: string,
  trackedKeys: Set<string>,
): boolean {
  return trackedKeys.has(fullName.toLowerCase());
}

import type {
  GitHubIssue,
  GitHubIssueListQuery,
  GitHubOwner,
  GitHubOwnerListQuery,
  ProjectResponse,
  TaskResponse,
} from "@gitiempo/shared";

import type { UserServerStateScope } from "@/lib/query-keys";

const GITHUB_REPO_PATTERN = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/;
const GITHUB_ISSUE_TASK_SUGGESTION_ID_PREFIX = "__github-issue-task-suggestion__";

export const GITHUB_ISSUE_TASK_SUGGESTION_QUERY = {
  limit: 10,
  state: "open",
} satisfies Partial<GitHubIssueListQuery>;

export const GITHUB_ISSUE_TASK_SUGGESTION_OWNER_QUERY = {
  type: "all",
} satisfies Partial<GitHubOwnerListQuery>;

export interface GitHubRepositoryContext {
  fullName: string;
  owner: string;
  repo: string;
}

export interface GitHubIssueTaskSuggestion {
  id: string;
  isGitHubIssueProposal: true;
  issue: GitHubIssue;
  repositoryLabel: string;
  title: string;
}

export const GITHUB_ISSUE_SUGGESTION_AVAILABILITY = {
  AVAILABLE: "available",
  OWNER_UNAVAILABLE: "owner-unavailable",
} as const;

export type GitHubIssueSuggestionAvailability =
  (typeof GITHUB_ISSUE_SUGGESTION_AVAILABILITY)[keyof typeof GITHUB_ISSUE_SUGGESTION_AVAILABILITY];

export function readGitHubRepositoryContext(
  project: ProjectResponse | null,
): GitHubRepositoryContext | null {
  if (!project || project.source !== "github") {
    return null;
  }

  const match = project.name.trim().match(GITHUB_REPO_PATTERN);

  if (!match) {
    return null;
  }

  const [, owner, repo] = match;

  if (!owner || !repo) {
    return null;
  }

  return {
    fullName: `${owner}/${repo}`,
    owner,
    repo,
  };
}

export function createGitHubIssueTaskSuggestionId(
  githubRepo: string,
  issueNumber: number,
): string {
  return `${GITHUB_ISSUE_TASK_SUGGESTION_ID_PREFIX}${githubRepo}#${issueNumber}`;
}

export function toGitHubIssueTaskSuggestion(
  issue: GitHubIssue,
): GitHubIssueTaskSuggestion {
  const repositoryLabel = issue.repository.fullName;

  return {
    id: createGitHubIssueTaskSuggestionId(repositoryLabel, issue.number),
    isGitHubIssueProposal: true,
    issue,
    repositoryLabel,
    title: issue.title,
  };
}

export function isBrowseableGitHubOwner(
  ownerLogin: string,
  owners: GitHubOwner[],
): boolean {
  const normalizedOwner = ownerLogin.toLowerCase();

  return owners.some((owner) => owner.login.toLowerCase() === normalizedOwner);
}

export function filterGitHubIssueTaskSuggestions(
  suggestions: GitHubIssueTaskSuggestion[],
  tasks: TaskResponse[],
): GitHubIssueTaskSuggestion[] {
  return suggestions.filter(
    (suggestion) => !hasExistingGitHubTask(suggestion.issue, tasks),
  );
}

export function buildGitHubIssueTaskSuggestionCacheKey(
  scope: UserServerStateScope,
  repositoryFullName: string,
): string {
  return [
    scope.userId ?? "anonymous-user",
    scope.workspaceId ?? "anonymous-workspace",
    repositoryFullName.toLowerCase(),
  ].join(":");
}

function hasExistingGitHubTask(issue: GitHubIssue, tasks: TaskResponse[]): boolean {
  return tasks.some((task) => {
    const taskIssue = task.githubIssue;

    return (
      taskIssue !== null &&
      taskIssue.githubRepo.toLowerCase() === issue.repository.fullName.toLowerCase() &&
      taskIssue.issueNumber === issue.number
    );
  });
}

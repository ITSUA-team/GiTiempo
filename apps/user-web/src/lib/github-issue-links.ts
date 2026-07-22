import type { SyncedGitHubIssue } from "@gitiempo/shared";

export function buildGitHubIssueUrl(issue: SyncedGitHubIssue): string {
  return `https://github.com/${issue.githubRepo}/issues/${issue.issueNumber}`;
}

export function buildGitHubIssueLabel(issue: SyncedGitHubIssue): string {
  return `Open GitHub issue ${issue.githubRepo}#${issue.issueNumber}`;
}

/** Short badge form shown beside a task name, e.g. "#184". */
export function buildGitHubIssueBadge(issue: SyncedGitHubIssue): string {
  return `#${issue.issueNumber}`;
}

import type { SyncedGitHubIssue, TimeEntryResponse } from '@gitiempo/shared';
import { formatRunningDuration } from '@gitiempo/web-shared/time';

export interface LocalSelectedTaskContext {
  githubIssue: SyncedGitHubIssue | null;
  projectId: string;
  projectName: string;
  source: 'local';
  taskId: string;
  taskTitle: string;
}

export interface GitHubIssueSelectedTaskContext {
  githubIssue: SyncedGitHubIssue;
  issueTitle: string;
  projectId: string;
  projectName: string;
  source: 'github-issue';
  taskId: string;
  taskTitle: string;
}

export type SelectedTaskContext =
  | GitHubIssueSelectedTaskContext
  | LocalSelectedTaskContext;

export const TOP_BAR_TIMER_NEW_TASK_ID = "__top-bar-timer-new-task__";
export const TOP_BAR_TIMER_GITHUB_ISSUE_TASK_ID_PREFIX =
  "__top-bar-timer-github-issue__";

export function getGitHubIssueTaskOptionId(issue: SyncedGitHubIssue): string {
  return `${TOP_BAR_TIMER_GITHUB_ISSUE_TASK_ID_PREFIX}${issue.githubRepo}#${issue.issueNumber}`;
}

export function isGitHubIssueSelectedTaskContext(
  context: SelectedTaskContext,
): context is GitHubIssueSelectedTaskContext {
  return context.source === 'github-issue';
}

export function isGitHubIssueTaskOptionId(taskId: string): boolean {
  return taskId.startsWith(TOP_BAR_TIMER_GITHUB_ISSUE_TASK_ID_PREFIX);
}

export function formatElapsedTime(
  startedAt: string | null,
  nowMs: number,
): string {
  if (!startedAt) {
    return '00:00:00';
  }

  return formatRunningDuration(startedAt, nowMs);
}

export function isConflictErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes('already running') ||
    normalized.includes('active timer') ||
    normalized.includes('overlap')
  );
}

export function isRunningTimer(timer: TimeEntryResponse | null): boolean {
  return timer !== null && timer.endedAt === null;
}

export function toSelectedTaskContext(
  timer: TimeEntryResponse,
): SelectedTaskContext {
  return {
    githubIssue: timer.githubIssue,
    projectId: timer.project.id,
    projectName: timer.project.name,
    source: 'local',
    taskId: timer.task.id,
    taskTitle: timer.task.title,
  };
}

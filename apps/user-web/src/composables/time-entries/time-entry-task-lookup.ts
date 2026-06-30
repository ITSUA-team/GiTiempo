import type {
  SyncedGitHubIssue,
  TaskResponse,
  TimeEntryResponse,
} from "@gitiempo/shared";
import { filterAutocompleteOptions } from "@gitiempo/web-shared";

import { getGitHubIssueTaskOptionId } from "@/lib/top-bar-timer-helpers";
import {
  createInlineNewTaskOption,
  INLINE_NEW_TASK_ID,
  isInlineNewTaskOption,
} from "@/lib/inline-new-task";

export type TaskLookupValue = string | TaskLookupOption | null;

export const TIME_ENTRY_NEW_TASK_ID = INLINE_NEW_TASK_ID;

interface BaseTaskLookupOption {
  defaultBillableForTimeEntries?: boolean;
  id: string;
  isActive: boolean;
  isNewTask?: boolean;
  projectId: string;
  title: string;
}

export interface LocalTaskLookupOption extends BaseTaskLookupOption {
  githubIssue?: SyncedGitHubIssue | null;
  isGitHubIssueOption?: false;
}

export interface GitHubIssueTaskLookupOption extends BaseTaskLookupOption {
  githubIssue: SyncedGitHubIssue;
  isGitHubIssueOption: true;
  issueTitle: string;
}

export type TaskLookupOption =
  | GitHubIssueTaskLookupOption
  | LocalTaskLookupOption;

export function isTaskLookupOption(value: TaskLookupValue): value is TaskLookupOption {
  return typeof value === "object" && value !== null && "id" in value;
}

export function isGitHubIssueTaskLookupOption(
  value: TaskLookupOption | null,
): value is GitHubIssueTaskLookupOption {
  return value?.isGitHubIssueOption === true;
}

export function isNewTaskLookupOption(
  value: TaskLookupValue,
): value is TaskLookupOption & { isNewTask: true } {
  return isTaskLookupOption(value) && isInlineNewTaskOption(value);
}

export function createNewTaskLookupOption(projectId: string): TaskLookupOption {
  return createInlineNewTaskOption({
    isActive: true,
    projectId,
  });
}

export function toTaskLookupOption(task: TaskResponse): TaskLookupOption {
  return {
    defaultBillableForTimeEntries: task.defaultBillableForTimeEntries,
    githubIssue: task.githubIssue,
    id: task.id,
    isActive: task.isActive,
    projectId: task.projectId,
    title: task.title,
  };
}

export function toGitHubIssueTaskLookupOption(input: {
  defaultBillableForTimeEntries: boolean;
  githubIssue: SyncedGitHubIssue;
  issueTitle: string;
  projectId: string;
}): GitHubIssueTaskLookupOption {
  return {
    defaultBillableForTimeEntries: input.defaultBillableForTimeEntries,
    githubIssue: input.githubIssue,
    id: getGitHubIssueTaskOptionId(input.githubIssue),
    isActive: true,
    isGitHubIssueOption: true,
    issueTitle: input.issueTitle,
    projectId: input.projectId,
    title: input.issueTitle,
  };
}

export function buildTaskLookupSuggestions(
  query: string,
  options: TaskLookupOption[],
  newTaskProjectId: string | null = null,
): TaskLookupOption[] {
  const suggestions = filterAutocompleteOptions(options, query, (task) => task.title);

  if (!newTaskProjectId) {
    return suggestions;
  }

  return [...suggestions, createNewTaskLookupOption(newTaskProjectId)];
}

export function toEntryTaskOption(entry: TimeEntryResponse): TaskLookupOption {
  return {
    githubIssue: entry.githubIssue,
    id: entry.task.id,
    isActive: true,
    projectId: entry.projectId,
    title: entry.task.title,
  };
}

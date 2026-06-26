import type {
  SyncedGitHubIssue,
  TaskResponse,
  TimeEntryResponse,
} from "@gitiempo/shared";
import { filterAutocompleteOptions } from "@gitiempo/web-shared";

import { getGitHubIssueTaskOptionId } from "@/lib/top-bar-timer-helpers";

export type TaskLookupValue = string | TaskLookupOption | null;

interface BaseTaskLookupOption {
  defaultBillableForTimeEntries?: boolean;
  id: string;
  isActive: boolean;
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
): TaskLookupOption[] {
  return filterAutocompleteOptions(options, query, (task) => task.title);
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

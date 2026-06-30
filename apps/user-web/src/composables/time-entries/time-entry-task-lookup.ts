import type { TaskResponse, TimeEntryResponse } from "@gitiempo/shared";
import { filterAutocompleteOptions } from "@gitiempo/web-shared";

import {
  createInlineNewTaskOption,
  INLINE_NEW_TASK_ID,
  isInlineNewTaskOption,
} from "@/lib/inline-new-task";

export type TaskLookupValue = string | TaskLookupOption | null;

export const TIME_ENTRY_NEW_TASK_ID = INLINE_NEW_TASK_ID;

export interface TaskLookupOption {
  defaultBillableForTimeEntries?: boolean;
  id: string;
  isActive: boolean;
  isNewTask?: boolean;
  projectId: string;
  title: string;
}

export function isTaskLookupOption(value: TaskLookupValue): value is TaskLookupOption {
  return typeof value === "object" && value !== null && "id" in value;
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
    id: task.id,
    isActive: task.isActive,
    projectId: task.projectId,
    title: task.title,
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
    id: entry.task.id,
    isActive: true,
    projectId: entry.projectId,
    title: entry.task.title,
  };
}

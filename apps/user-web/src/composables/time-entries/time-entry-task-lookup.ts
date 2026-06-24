import type { TaskResponse, TimeEntryResponse } from "@gitiempo/shared";
import { filterAutocompleteOptions } from "@gitiempo/web-shared";

export type TaskLookupValue = string | TaskLookupOption | null;

export const TIME_ENTRY_NEW_TASK_ID = "__time-entry-new-task__";

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
  return (
    isTaskLookupOption(value) &&
    value.id === TIME_ENTRY_NEW_TASK_ID &&
    value.isNewTask === true
  );
}

export function createNewTaskLookupOption(projectId: string): TaskLookupOption {
  return {
    id: TIME_ENTRY_NEW_TASK_ID,
    isActive: true,
    isNewTask: true,
    projectId,
    title: "New task",
  };
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

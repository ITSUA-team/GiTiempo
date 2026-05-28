import type { TaskResponse, TimeEntryResponse } from "@gitiempo/shared";

export type TaskLookupValue = string | TaskLookupOption | null;

export interface TaskLookupOption {
  id: string;
  isActive: boolean;
  projectId: string;
  title: string;
}

export function isTaskLookupOption(value: TaskLookupValue): value is TaskLookupOption {
  return typeof value === "object" && value !== null && "id" in value;
}

export function toTaskLookupOption(task: TaskResponse): TaskLookupOption {
  return {
    id: task.id,
    isActive: task.isActive,
    projectId: task.projectId,
    title: task.title,
  };
}

export function buildTaskLookupSuggestions(
  query: string,
  options: TaskLookupOption[],
): TaskLookupOption[] {
  const normalized = query.trim().toLowerCase();

  return normalized.length === 0
    ? [...options]
    : options.filter((task) => task.title.toLowerCase().includes(normalized));
}

export function toEntryTaskOption(entry: TimeEntryResponse): TaskLookupOption {
  return {
    id: entry.task.id,
    isActive: true,
    projectId: entry.projectId,
    title: entry.task.title,
  };
}

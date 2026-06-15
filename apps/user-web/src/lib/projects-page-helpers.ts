import type { ProjectResponse, TaskResponse } from '@gitiempo/shared';
import {
  addLocalDays,
  formatLocalTime,
  formatLocalWeekday,
  getLocalDateKey,
} from '@gitiempo/web-shared/time';

export interface ProjectsPageTaskGroup {
  project: ProjectResponse;
  tasks: TaskResponse[];
}

export interface ProjectsSearchSuggestion {
  id: string;
  kind: 'project' | 'task';
  label: string;
  meta: string;
  projectId: string;
}

export type ProjectStatusFilterValue = 'all' | 'open' | 'closed';

export interface ProjectStatusFilterOption {
  label: string;
  value: ProjectStatusFilterValue;
}

export type ProjectUpdatedFilterValue = 'any' | 'today' | 'last-7-days' | 'older';

export interface ProjectUpdatedFilterOption {
  label: string;
  value: ProjectUpdatedFilterValue;
}

export interface ProjectTaskGroupFilterOptions {
  nowMs?: number;
  status?: ProjectStatusFilterValue;
  updated?: ProjectUpdatedFilterValue;
}

export const ALL_PROJECT_STATUSES_FILTER: ProjectStatusFilterOption = {
  label: 'All statuses',
  value: 'all',
};

export const ANY_PROJECT_UPDATED_FILTER: ProjectUpdatedFilterOption = {
  label: 'Any time',
  value: 'any',
};

export const PROJECT_STATUS_FILTER_OPTIONS: ProjectStatusFilterOption[] = [
  ALL_PROJECT_STATUSES_FILTER,
  { label: 'Open', value: 'open' },
  { label: 'Closed', value: 'closed' },
];

export const PROJECT_UPDATED_FILTER_OPTIONS: ProjectUpdatedFilterOption[] = [
  ANY_PROJECT_UPDATED_FILTER,
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: 'last-7-days' },
  { label: 'Older', value: 'older' },
];

export function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

export function sortProjectTasks(tasks: TaskResponse[]): TaskResponse[] {
  return [...tasks].sort((left, right) => {
    const timeDiff =
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();

    if (timeDiff !== 0) {
      return timeDiff;
    }

    return left.title.localeCompare(right.title);
  });
}

export function buildProjectTaskGroups(
  projects: ProjectResponse[],
  tasksByProjectId: Record<string, TaskResponse[]>,
): ProjectsPageTaskGroup[] {
  return projects.map((project) => ({
    project,
    tasks: tasksByProjectId[project.id] ?? [],
  }));
}

export function filterProjectTaskGroups(
  groups: ProjectsPageTaskGroup[],
  searchText: string,
  options: ProjectTaskGroupFilterOptions = {},
): ProjectsPageTaskGroup[] {
  const normalized = normalizeSearchValue(searchText);
  const statusFilter = options.status ?? ALL_PROJECT_STATUSES_FILTER.value;
  const updatedFilter = options.updated ?? ANY_PROJECT_UPDATED_FILTER.value;
  const hasStructuredFilters =
    statusFilter !== ALL_PROJECT_STATUSES_FILTER.value ||
    updatedFilter !== ANY_PROJECT_UPDATED_FILTER.value;
  const searchFilteredGroups = filterProjectTaskGroupsBySearch(
    groups,
    normalized,
  );

  if (!hasStructuredFilters) {
    return searchFilteredGroups;
  }

  return searchFilteredGroups.flatMap((group) => {
    const matchingTasks = group.tasks.filter(
      (task) =>
        matchesTaskStatusFilter(task, statusFilter) &&
        matchesTaskUpdatedFilter(task, updatedFilter, options.nowMs),
    );

    return matchingTasks.length > 0
      ? [{ project: group.project, tasks: matchingTasks }]
      : [];
  });
}

function filterProjectTaskGroupsBySearch(
  groups: ProjectsPageTaskGroup[],
  normalizedSearchText: string,
): ProjectsPageTaskGroup[] {
  if (normalizedSearchText.length === 0) {
    return groups;
  }

  return groups.flatMap((group) => {
    const projectMatch = group.project.name
      .toLowerCase()
      .includes(normalizedSearchText);

    if (projectMatch) {
      return [group];
    }

    const matchingTasks = group.tasks.filter((task) =>
      task.title.toLowerCase().includes(normalizedSearchText),
    );

    return matchingTasks.length > 0
      ? [{ project: group.project, tasks: matchingTasks }]
      : [];
  });
}

function matchesTaskStatusFilter(
  task: TaskResponse,
  filter: ProjectStatusFilterValue,
): boolean {
  return filter === ALL_PROJECT_STATUSES_FILTER.value || task.status === filter;
}

function matchesTaskUpdatedFilter(
  task: TaskResponse,
  filter: ProjectUpdatedFilterValue,
  nowMs = Date.now(),
): boolean {
  if (filter === ANY_PROJECT_UPDATED_FILTER.value) {
    return true;
  }

  const taskDateKey = getLocalDateKey(task.updatedAt);
  const now = new Date(nowMs);
  const todayKey = getLocalDateKey(now);
  const lastSevenDaysStartKey = getLocalDateKey(addLocalDays(now, -6));

  if (filter === 'today') {
    return taskDateKey === todayKey;
  }

  if (filter === 'last-7-days') {
    return taskDateKey >= lastSevenDaysStartKey && taskDateKey <= todayKey;
  }

  return taskDateKey < lastSevenDaysStartKey;
}

export function buildProjectSearchSuggestions(
  groups: ProjectsPageTaskGroup[],
  query: string,
): ProjectsSearchSuggestion[] {
  const normalized = normalizeSearchValue(query);
  const suggestions: ProjectsSearchSuggestion[] = [];

  for (const group of groups) {
    if (
      normalized.length === 0 ||
      group.project.name.toLowerCase().includes(normalized)
    ) {
      suggestions.push({
        id: `project:${group.project.id}`,
        kind: 'project',
        label: group.project.name,
        meta: 'Project',
        projectId: group.project.id,
      });
    }

    for (const task of group.tasks) {
      if (
        normalized.length === 0 ||
        task.title.toLowerCase().includes(normalized)
      ) {
        suggestions.push({
          id: `task:${task.id}`,
          kind: 'task',
          label: task.title,
          meta: `Task • ${group.project.name}`,
          projectId: group.project.id,
        });
      }
    }
  }

  return suggestions.slice(0, 10);
}

export function formatUpdatedLabel(
  isoDateTime: string,
  nowMs = Date.now(),
): string {
  const dayKey = getLocalDateKey(isoDateTime);
  const now = new Date(nowMs);
  const todayKey = getLocalDateKey(now);
  const yesterdayKey = getLocalDateKey(addLocalDays(now, -1));

  if (dayKey === todayKey) {
    return `Today, ${formatLocalTime(isoDateTime)}`;
  }

  if (dayKey === yesterdayKey) {
    return `Yesterday, ${formatLocalTime(isoDateTime)}`;
  }

  return `${formatLocalWeekday(isoDateTime)}, ${formatLocalTime(isoDateTime)}`;
}

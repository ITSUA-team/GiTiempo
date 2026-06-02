import type { ProjectResponse, TaskResponse } from '@gitiempo/shared';
import {
  addUtcDays,
  formatUtcTime,
  formatUtcWeekday,
  getUtcDateKey,
} from '@gitiempo/web-shared/time';

export interface ProjectsPageTaskGroup {
  project: ProjectResponse;
  tasks: TaskResponse[];
}

export interface ProjectsSearchSuggestion {
  id: string;
  kind: 'project' | 'task';
  label: string;
  projectId: string;
}

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
): ProjectsPageTaskGroup[] {
  const normalized = normalizeSearchValue(searchText);

  if (normalized.length === 0) {
    return groups;
  }

  return groups.flatMap((group) => {
    const projectMatch = group.project.name.toLowerCase().includes(normalized);

    if (projectMatch) {
      return [group];
    }

    const matchingTasks = group.tasks.filter((task) =>
      task.title.toLowerCase().includes(normalized),
    );

    return matchingTasks.length > 0
      ? [{ project: group.project, tasks: matchingTasks }]
      : [];
  });
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
  const dayKey = getUtcDateKey(isoDateTime);
  const now = new Date(nowMs);
  const todayKey = getUtcDateKey(now.toISOString());
  const yesterdayKey = getUtcDateKey(addUtcDays(now, -1).toISOString());

  if (dayKey === todayKey) {
    return `Today, ${formatUtcTime(isoDateTime)}`;
  }

  if (dayKey === yesterdayKey) {
    return `Yesterday, ${formatUtcTime(isoDateTime)}`;
  }

  return `${formatUtcWeekday(isoDateTime)}, ${formatUtcTime(isoDateTime)}`;
}

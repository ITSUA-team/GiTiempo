import type { ProjectListResponse, ProjectResponse } from '@gitiempo/shared';

export const reportPageLimit = 100;

export function sortReportProjects(
  projects: ProjectListResponse,
): ProjectListResponse {
  return [...projects].sort((a, b) => a.name.localeCompare(b.name));
}

export function getVisibleReportProjectsForScope(
  projects: ProjectListResponse,
  projectId: string | null,
): ProjectResponse[] {
  if (!projectId) {
    return projects.filter(
      (project) => project.isActive && project.totalSeconds > 0,
    );
  }

  return projects.filter((project) => project.id === projectId);
}

export function getReportErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Failed to load reports';

  if (/throttler|too many requests/i.test(message)) {
    return 'Too many report requests. Select a project and shorter date range, then try again.';
  }

  return message;
}

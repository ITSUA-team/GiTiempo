import type { TimeEntryListQuery, TimeReportQuery } from "@gitiempo/shared";

export const projectQueryKeys = {
  adminProjects: ["admin_projects"] as const,
  managementSummary: ["management_project_summary"] as const,
  projectTasks: (projectId: string | null | undefined) =>
    ["project_tasks", projectId ?? null] as const,
  visibleProjects: ["visible_projects"] as const,
};

export const reportQueryKeys = {
  timeReport: (query: Partial<TimeReportQuery>) => ["time_report", query] as const,
};

export const timeEntryQueryKeys = {
  ownTimeEntries: (query: Partial<TimeEntryListQuery>) =>
    ["own_time_entries", query] as const,
  ownTimeEntriesRoot: ["own_time_entries"] as const,
  recentOwnTimeEntries: ["recent_own_time_entries"] as const,
};

export const timerQueryKeys = {
  current: ["current_timer"] as const,
};

export const workspaceQueryKeys = {
  invites: ["workspace_invites"] as const,
  members: ["workspace_members"] as const,
  settings: ["workspace_settings"] as const,
  workspace: ["workspace"] as const,
};

import type { TimeReportExportQuery, TimeReportQuery } from '@gitiempo/shared';

export interface AdminServerStateScope {
  role?: string | null;
  userId?: string | null;
  workspaceId?: string | null;
}

interface DashboardWeekWindow {
  dateFrom?: string | null;
  dateTo?: string | null;
}

type QueryKey = readonly unknown[];

function normalizeString(value: string | null | undefined): string | null {
  const next = value?.trim();
  return next ? next : null;
}

function normalizeScope(scope: AdminServerStateScope = {}) {
  return {
    role: normalizeString(scope.role),
    userId: normalizeString(scope.userId),
    workspaceId: normalizeString(scope.workspaceId),
  };
}

function normalizeDashboardWindow(window: DashboardWeekWindow = {}) {
  return {
    dateFrom: window.dateFrom ?? null,
    dateTo: window.dateTo ?? null,
  };
}

export function normalizeTimeReportQuery(query: Partial<TimeReportQuery> = {}) {
  return {
    dateFrom: query.dateFrom ?? null,
    dateTo: query.dateTo ?? null,
    groupBy: query.groupBy ?? null,
    limit: query.limit ?? null,
    page: query.page ?? null,
    projectId: query.projectId ?? null,
    search: query.search ?? null,
    sortBy: query.sortBy ?? null,
    sortOrder: query.sortOrder ?? null,
    userId: query.userId ?? null,
  };
}

export function normalizeTimeReportExportQuery(
  query: Partial<TimeReportExportQuery> = {},
) {
  return {
    dateFrom: query.dateFrom ?? null,
    dateTo: query.dateTo ?? null,
    groupBy: query.groupBy ?? null,
    projectId: query.projectId ?? null,
    search: query.search ?? null,
    sortBy: query.sortBy ?? null,
    sortOrder: query.sortOrder ?? null,
    userId: query.userId ?? null,
  };
}

export const adminDashboardKeys = {
  all: (scope?: AdminServerStateScope) =>
    ['admin-web', normalizeScope(scope), 'dashboard'] as const,
  overview: (scope: AdminServerStateScope, window?: DashboardWeekWindow) =>
    [
      ...adminDashboardKeys.all(scope),
      'overview',
      normalizeDashboardWindow(window),
    ] as const,
};

export const reportsKeys = {
  all: (scope?: AdminServerStateScope) =>
    ['admin-web', normalizeScope(scope), 'reports'] as const,
  export: (
    scope: AdminServerStateScope,
    query?: Partial<TimeReportExportQuery>,
  ) =>
    [
      ...reportsKeys.all(scope),
      'export',
      normalizeTimeReportExportQuery(query),
    ] as const,
  time: (scope: AdminServerStateScope, query?: Partial<TimeReportQuery>) =>
    [
      ...reportsKeys.all(scope),
      'time',
      normalizeTimeReportQuery(query),
    ] as const,
};

export const adminSettingsKeys = {
  all: (scope?: AdminServerStateScope) =>
    ['admin-web', normalizeScope(scope), 'settings'] as const,
  githubConnection: (scope: AdminServerStateScope) =>
    [...adminSettingsKeys.all(scope), 'github-connection'] as const,
  workspaceGitHubOrganizations: (scope: AdminServerStateScope) =>
    [...adminSettingsKeys.all(scope), 'workspace-github-organizations'] as const,
  workspace: (scope: AdminServerStateScope) =>
    [...adminSettingsKeys.all(scope), 'workspace'] as const,
  workspaceSettings: (scope: AdminServerStateScope) =>
    [...adminSettingsKeys.all(scope), 'workspace-settings'] as const,
};

export const adminProjectsKeys = {
  all: (scope?: AdminServerStateScope) =>
    ['admin-web', normalizeScope(scope), 'projects'] as const,
  list: (scope: AdminServerStateScope) =>
    [...adminProjectsKeys.all(scope), 'list'] as const,
  summary: (scope: AdminServerStateScope) =>
    [...adminProjectsKeys.all(scope), 'summary'] as const,
};

export const adminMembersKeys = {
  all: (scope?: AdminServerStateScope) =>
    ['admin-web', normalizeScope(scope), 'members'] as const,
  invites: (scope: AdminServerStateScope) =>
    [...adminMembersKeys.all(scope), 'invites'] as const,
  list: (scope: AdminServerStateScope) =>
    [...adminMembersKeys.all(scope), 'list'] as const,
};

export const adminMutationInvalidationKeys = {
  afterProjectMutation(scope: AdminServerStateScope): QueryKey[] {
    return [
      adminProjectsKeys.all(scope),
      adminDashboardKeys.all(scope),
      reportsKeys.all(scope),
    ];
  },
  afterReportsDataMutation(scope: AdminServerStateScope): QueryKey[] {
    return [reportsKeys.all(scope), adminDashboardKeys.all(scope)];
  },
  afterSettingsSave(scope: AdminServerStateScope): QueryKey[] {
    return [adminSettingsKeys.all(scope)];
  },
};

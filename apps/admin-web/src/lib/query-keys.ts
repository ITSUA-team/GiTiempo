import type {
  EligibleEntriesQuery,
  InvoiceListQuery,
  TimeReportRequest,
} from '@gitiempo/shared';

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

export function normalizeTimeReportQuery(query: Partial<TimeReportRequest> = {}) {
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

export function normalizeInvoiceListQuery(
  query: Partial<InvoiceListQuery> = {},
) {
  return {
    dateFrom: query.dateFrom ?? null,
    dateTo: query.dateTo ?? null,
    limit: query.limit ?? null,
    page: query.page ?? null,
    projectId: query.projectId ?? null,
    search: query.search ?? null,
    status: query.status ?? null,
  };
}

export function normalizeEligibleEntriesQuery(
  query: Partial<EligibleEntriesQuery> = {},
) {
  return {
    dateFrom: query.dateFrom ?? null,
    dateTo: query.dateTo ?? null,
    projectId: query.projectId ?? null,
    roundingStepMinutes: query.roundingStepMinutes ?? null,
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
  time: (scope: AdminServerStateScope, query?: Partial<TimeReportRequest>) =>
    [
      ...reportsKeys.all(scope),
      'time',
      normalizeTimeReportQuery(query),
    ] as const,
};

export const adminSettingsKeys = {
  all: (scope?: AdminServerStateScope) =>
    ['admin-web', normalizeScope(scope), 'settings'] as const,
  availableGitHubOrganizations: (scope: AdminServerStateScope) =>
    [...adminSettingsKeys.all(scope), 'available-github-organizations'] as const,
  githubConnection: (scope: AdminServerStateScope) =>
    [...adminSettingsKeys.all(scope), 'github-connection'] as const,
  workspaceGitHubOrganizations: (scope: AdminServerStateScope) =>
    [...adminSettingsKeys.all(scope), 'workspace-github-organizations'] as const,
  workspaceGitHubInstallations: (scope: AdminServerStateScope) =>
    [...adminSettingsKeys.all(scope), 'workspace-github-installations'] as const,
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

export const adminInvoicesKeys = {
  all: (scope?: AdminServerStateScope) =>
    ['admin-web', normalizeScope(scope), 'invoices'] as const,
  list: (scope: AdminServerStateScope, query?: Partial<InvoiceListQuery>) =>
    [
      ...adminInvoicesKeys.all(scope),
      'list',
      normalizeInvoiceListQuery(query),
    ] as const,
  detail: (scope: AdminServerStateScope, invoiceId: string) =>
    [...adminInvoicesKeys.all(scope), 'detail', invoiceId] as const,
  stats: (scope: AdminServerStateScope) =>
    [...adminInvoicesKeys.all(scope), 'stats'] as const,
  eligibleEntries: (
    scope: AdminServerStateScope,
    query?: Partial<EligibleEntriesQuery>,
  ) =>
    [
      ...adminInvoicesKeys.all(scope),
      'eligible-entries',
      normalizeEligibleEntriesQuery(query),
    ] as const,
};

export const adminMutationInvalidationKeys = {
  afterInvoiceMutation(scope: AdminServerStateScope): QueryKey[] {
    return [adminInvoicesKeys.all(scope)];
  },
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

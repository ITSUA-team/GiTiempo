import type {
  ProjectListResponse,
  ProjectMember,
  TimeEntryResponse,
  TimeReportExportQuery,
  TimeReportGroupBy,
  TimeReportQuery,
  TimeReportResponse,
  TimeReportRow,
  TimeReportTotals,
} from '@gitiempo/shared';

export type ReportDateRange = [Date | null, Date | null] | null;
export type ReportHoursFilter = 'any' | 'gt0' | 'gte8' | 'gte40';
export type ReportBillableFilter = 'any' | 'withBillable' | 'withoutBillable';

export interface ReportFilterOption {
  label: string;
  value: string;
}

export interface ReportSetupFilters {
  dateRange: ReportDateRange;
  groupBy: TimeReportGroupBy;
  memberId: string | null;
  projectId: string | null;
}

export interface ReportTableRow {
  billableSeconds: number;
  billableShare: number | null;
  entryCount: number;
  groupBy: TimeReportGroupBy;
  id: string;
  memberIds: string[];
  memberName: string;
  nonBillableSeconds: number;
  projectIds: string[];
  projectName: string;
  totalSeconds: number;
}

export interface ReportSummaryView extends TimeReportTotals {
  avgPerMemberSeconds: number;
  memberCount: number;
  topProjectName: string;
  topProjectSeconds: number;
}

export interface ReportTableFilters {
  global: string;
  projectId: string | null;
  memberId: string | null;
  hours: ReportHoursFilter;
  billable: ReportBillableFilter;
}

interface ReportRowContext {
  memberOptions: ReportFilterOption[];
  projectOptions: ReportFilterOption[];
  selectedMemberId: string | null;
  selectedProjectId: string | null;
}

const reportDateRangeErrorMessage = 'End date must be after the start date.';
const emptyTotals: TimeReportTotals = {
  billableSeconds: 0,
  billableShare: null,
  entryCount: 0,
  nonBillableSeconds: 0,
  totalSeconds: 0,
};

export const emptyReportSummaryView: ReportSummaryView = {
  ...emptyTotals,
  avgPerMemberSeconds: 0,
  memberCount: 0,
  topProjectName: 'None',
  topProjectSeconds: 0,
};

export function getDefaultReportDateRange(now = new Date()): ReportDateRange {
  return [
    new Date(now.getFullYear(), now.getMonth(), 1),
    new Date(now.getFullYear(), now.getMonth(), now.getDate()),
  ];
}

export function createDefaultReportTableFilters(): ReportTableFilters {
  return {
    billable: 'any',
    global: '',
    hours: 'any',
    memberId: null,
    projectId: null,
  };
}

export function getReportDateRangeError(
  dateRange: ReportDateRange,
): string | null {
  const [start, end] = dateRange ?? [];

  if (start && end && end.getTime() < start.getTime()) {
    return reportDateRangeErrorMessage;
  }

  return null;
}

export function isReportDateRangeValid(dateRange: ReportDateRange): boolean {
  return getReportDateRangeError(dateRange) === null;
}

export function formatReportDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const totalMinutes = Math.floor(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function formatReportPercent(value: number | null): string {
  if (value === null) {
    return '0%';
  }

  return `${Math.round(value * 100)}%`;
}

function getOptionLabel(
  options: ReportFilterOption[],
  value: string | null,
): string | null {
  if (!value) {
    return null;
  }

  return options.find((option) => option.value === value)?.label ?? null;
}

function sortByLabel<T extends { label: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.label.localeCompare(b.label));
}

function addProjectMemberOption(
  options: Map<string, ReportFilterOption>,
  member: ProjectMember,
): void {
  options.set(member.userId, {
    label: member.displayName?.trim() || member.email,
    value: member.userId,
  });
}

export function deriveProjectOptions(
  projects: ProjectListResponse,
): ReportFilterOption[] {
  return sortByLabel(
    projects.map((project) => ({
      label: project.name,
      value: project.id,
    })),
  );
}

export function deriveMemberOptions(
  projects: ProjectListResponse,
  entries: TimeEntryResponse[] = [],
): ReportFilterOption[] {
  const options = new Map<string, ReportFilterOption>();

  for (const project of projects) {
    for (const member of project.members) {
      addProjectMemberOption(options, member);
    }
  }

  for (const entry of entries) {
    options.set(entry.user.id, {
      label: formatUserName(entry.user),
      value: entry.user.id,
    });
  }

  return sortByLabel([...options.values()]);
}

function startOfLocalDayIso(date: Date): string {
  // DatePicker returns the user's local calendar day; the API expects timestamp boundaries.
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).toISOString();
}

function nextLocalDayStartIso(date: Date): string {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
  ).toISOString();
}

function toReportDateQuery(
  dateRange: ReportDateRange,
): Pick<TimeReportQuery, 'dateFrom' | 'dateTo'> {
  const dateRangeError = getReportDateRangeError(dateRange);

  if (dateRangeError) {
    throw new Error(dateRangeError);
  }

  const [dateFrom, dateTo] = dateRange ?? [];
  const query: Pick<TimeReportQuery, 'dateFrom' | 'dateTo'> = {};

  if (dateFrom) {
    query.dateFrom = startOfLocalDayIso(dateFrom);
  }

  if (dateTo) {
    query.dateTo = nextLocalDayStartIso(dateTo);
  }

  return query;
}

export function toTimeReportQuery(
  filters: ReportSetupFilters,
  page: number,
  limit: number,
): Partial<TimeReportQuery> {
  return {
    ...toReportDateQuery(filters.dateRange),
    groupBy: filters.groupBy,
    limit,
    page,
    projectId: filters.projectId ?? undefined,
    sortBy: 'totalSeconds',
    sortOrder: 'desc',
    userId: filters.memberId ?? undefined,
  };
}

export function toTimeReportExportQuery(
  filters: ReportSetupFilters,
): Partial<TimeReportExportQuery> {
  return {
    ...toReportDateQuery(filters.dateRange),
    groupBy: filters.groupBy,
    projectId: filters.projectId ?? undefined,
    sortBy: 'totalSeconds',
    sortOrder: 'desc',
    userId: filters.memberId ?? undefined,
  };
}

function formatUserName(user: { displayName: string | null; email: string }): string {
  return user.displayName?.trim() || user.email;
}

function getEntryDuration(entry: TimeEntryResponse): number {
  return Math.max(0, entry.durationSeconds ?? 0);
}

export function filterEntriesByMember(
  entries: TimeEntryResponse[],
  memberId: string | null,
): TimeEntryResponse[] {
  if (!memberId) {
    return entries;
  }

  return entries.filter((entry) => entry.user.id === memberId);
}

export function deriveReportRows(entries: TimeEntryResponse[]): ReportTableRow[] {
  const rows = new Map<string, ReportTableRow>();

  for (const entry of entries) {
    const rowId = `${entry.project.id}:${entry.user.id}`;
    const existing = rows.get(rowId) ?? {
      billableSeconds: 0,
      billableShare: null,
      entryCount: 0,
      groupBy: 'project',
      id: rowId,
      memberIds: [entry.user.id],
      memberName: formatUserName(entry.user),
      nonBillableSeconds: 0,
      projectIds: [entry.project.id],
      projectName: entry.project.name,
      totalSeconds: 0,
    };
    const durationSeconds = getEntryDuration(entry);

    existing.totalSeconds += durationSeconds;
    existing.billableSeconds += entry.isBillable ? durationSeconds : 0;
    existing.nonBillableSeconds += entry.isBillable ? 0 : durationSeconds;
    existing.entryCount += 1;
    existing.billableShare =
      existing.totalSeconds > 0
        ? existing.billableSeconds / existing.totalSeconds
        : null;
    rows.set(rowId, existing);
  }

  return [...rows.values()].sort(
    (a, b) =>
      a.projectName.localeCompare(b.projectName) ||
      a.memberName.localeCompare(b.memberName),
  );
}

export function deriveReportSummary(
  entries: TimeEntryResponse[],
): ReportSummaryView {
  let totalSeconds = 0;
  let billableSeconds = 0;
  const memberIds = new Set<string>();
  const projectTotals = new Map<string, { name: string; seconds: number }>();

  for (const entry of entries) {
    const durationSeconds = getEntryDuration(entry);

    totalSeconds += durationSeconds;
    billableSeconds += entry.isBillable ? durationSeconds : 0;
    memberIds.add(entry.user.id);

    const projectTotal = projectTotals.get(entry.project.id) ?? {
      name: entry.project.name,
      seconds: 0,
    };
    projectTotal.seconds += durationSeconds;
    projectTotals.set(entry.project.id, projectTotal);
  }

  const topProject = [...projectTotals.values()].sort(
    (a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name),
  )[0];

  return {
    avgPerMemberSeconds: memberIds.size > 0 ? totalSeconds / memberIds.size : 0,
    billableSeconds,
    billableShare: totalSeconds > 0 ? billableSeconds / totalSeconds : null,
    entryCount: entries.length,
    memberCount: memberIds.size,
    nonBillableSeconds: Math.max(0, totalSeconds - billableSeconds),
    topProjectName: topProject?.name ?? 'None',
    topProjectSeconds: topProject?.seconds ?? 0,
    totalSeconds,
  };
}

function getReportTableRowLabels(
  row: TimeReportRow,
  context: ReportRowContext,
): Pick<ReportTableRow, 'memberName' | 'projectName'> {
  const selectedMemberLabel = getOptionLabel(
    context.memberOptions,
    context.selectedMemberId,
  );
  const selectedProjectLabel = getOptionLabel(
    context.projectOptions,
    context.selectedProjectId,
  );

  if (row.groupBy === 'user') {
    return {
      memberName: formatUserName(row.user),
      projectName: selectedProjectLabel ?? 'Project scope',
    };
  }

  if (row.groupBy === 'task') {
    return {
      memberName: selectedMemberLabel ?? 'Member scope',
      projectName: `${row.project.name} / ${row.task.title}`,
    };
  }

  return {
    memberName: selectedMemberLabel ?? 'Member scope',
    projectName: row.project.name,
  };
}

export function toReportTableRows(
  response: TimeReportResponse | null,
  context: ReportRowContext,
): ReportTableRow[] {
  return (response?.items ?? []).map((row) => {
    const projectIds = row.project
      ? [row.project.id]
      : context.selectedProjectId
        ? [context.selectedProjectId]
        : [];
    const memberIds = row.user
      ? [row.user.id]
      : context.selectedMemberId
        ? [context.selectedMemberId]
        : [];

    return {
      billableSeconds: row.billableSeconds,
      billableShare: row.billableShare,
      entryCount: row.entryCount,
      groupBy: row.groupBy,
      id: `${row.groupBy}:${row.project?.id ?? row.task?.id ?? row.user?.id ?? 'unknown'}`,
      memberIds,
      nonBillableSeconds: row.nonBillableSeconds,
      projectIds,
      totalSeconds: row.totalSeconds,
      ...getReportTableRowLabels(row, context),
    };
  });
}

export function deriveReportSummaryView(
  response: TimeReportResponse | null,
  rows: ReportTableRow[],
  context: Pick<ReportRowContext, 'memberOptions' | 'selectedMemberId'>,
): ReportSummaryView {
  if (!response) {
    return emptyReportSummaryView;
  }

  const memberCount = context.selectedMemberId
    ? 1
    : Math.max(0, context.memberOptions.length);
  const projectTotals = new Map<string, { name: string; seconds: number }>();

  for (const row of rows) {
    if (row.projectIds.length !== 1) {
      continue;
    }

    const projectId = row.projectIds[0]!;
    const projectTotal = projectTotals.get(projectId) ?? {
      name: row.projectName,
      seconds: 0,
    };
    projectTotal.seconds += row.totalSeconds;
    projectTotals.set(projectId, projectTotal);
  }

  const topProject = [...projectTotals.values()].sort(
    (a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name),
  )[0];

  return {
    ...response.summary,
    avgPerMemberSeconds:
      memberCount > 0 ? response.summary.totalSeconds / memberCount : 0,
    memberCount,
    topProjectName: topProject?.name ?? 'None',
    topProjectSeconds: topProject?.seconds ?? 0,
  };
}

export function getReportRowUnbillableSeconds(row: ReportTableRow): number {
  return Math.max(0, row.totalSeconds - row.billableSeconds);
}

export function getReportRowBillableSeconds(
  row: ReportTableRow,
  billableFilter: ReportBillableFilter,
): number {
  if (billableFilter === 'withoutBillable') {
    return getReportRowUnbillableSeconds(row);
  }

  return row.billableSeconds;
}

export function filterReportRows(
  rows: ReportTableRow[],
  filters: ReportTableFilters,
): ReportTableRow[] {
  const search = filters.global.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.projectId && !row.projectIds.includes(filters.projectId)) {
      return false;
    }

    if (filters.memberId && !row.memberIds.includes(filters.memberId)) {
      return false;
    }

    if (filters.hours === 'gt0' && row.totalSeconds <= 0) {
      return false;
    }

    if (filters.hours === 'gte8' && row.totalSeconds < 8 * 60 * 60) {
      return false;
    }

    if (filters.hours === 'gte40' && row.totalSeconds < 40 * 60 * 60) {
      return false;
    }

    if (filters.billable === 'withBillable' && row.billableSeconds <= 0) {
      return false;
    }

    if (
      filters.billable === 'withoutBillable' &&
      getReportRowUnbillableSeconds(row) <= 0
    ) {
      return false;
    }

    if (!search) {
      return true;
    }

    const haystack = [
      row.projectName,
      row.memberName,
      formatReportDuration(row.totalSeconds),
      formatReportDuration(getReportRowBillableSeconds(row, filters.billable)),
      formatReportPercent(row.billableShare),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(search);
  });
}

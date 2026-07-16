import {
  timeReportExportQuerySchema,
  timeReportQuerySchema,
  type ProjectListResponse,
  type ProjectMember,
  type TimeReportExportQuery,
  type TimeReportQuery,
  type TimeReportResponse,
  type TimeReportRow,
  type WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import {
  formatPaddedHoursMinutesDuration,
  nextLocalDayStartIso,
  startOfLocalDayIso,
} from '@gitiempo/web-shared/time';
import {
  reportDateRangeErrorMessage,
  reportDateRangeSchema,
  reportFilterOptionSchema,
  reportSetupFiltersSchema,
  reportSummaryViewSchema,
  reportTableFiltersSchema,
  reportTableRowSchema,
  type ReportBillableFilter,
  type ReportDateRange,
  type ReportFilterOption,
  type ReportSetupFilters,
  type ReportSummaryView,
  type ReportTableFilters,
  type ReportTableRow,
} from '@/validation/report-view-model';

export {
  defaultReportGrouping,
  getReportExportBlockedReason,
  reportGroupingApiValue,
} from '@/validation/report-view-model';

export type {
  ReportBillableFilter,
  ReportDateRange,
  ReportFilterOption,
  ReportGrouping,
  ReportHoursFilter,
  ReportSetupFilters,
  ReportSummaryView,
  ReportTableFilters,
  ReportTableRow,
} from '@/validation/report-view-model';

interface ReportRowContext {
  memberOptions: ReportFilterOption[];
  projectOptions: ReportFilterOption[];
  selectedMemberId: string | null;
  selectedProjectId: string | null;
}

export const emptyReportSummaryView = reportSummaryViewSchema.parse({
  avgPerMemberSeconds: 0,
  billableSeconds: 0,
  billableShare: null,
  entryCount: 0,
  memberCount: 0,
  nonBillableSeconds: 0,
  topProjectName: 'None',
  topProjectSeconds: 0,
  totalSeconds: 0,
});

export function getDefaultReportDateRange(now = new Date()): ReportDateRange {
  return reportDateRangeSchema.parse([
    new Date(now.getFullYear(), now.getMonth(), 1),
    new Date(now.getFullYear(), now.getMonth(), now.getDate()),
  ]);
}

export function createDefaultReportTableFilters(): ReportTableFilters {
  return reportTableFiltersSchema.parse({
    billable: 'any',
    global: '',
    hours: 'any',
    memberId: null,
    projectId: null,
  });
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

export function formatReportPercent(value: number | null): string {
  if (value === null) {
    return '0%';
  }

  return `${Math.round(value * 100)}%`;
}

function parseReportDateRange(dateRange: ReportDateRange): ReportDateRange {
  const result = reportDateRangeSchema.safeParse(dateRange);

  if (!result.success) {
    throw new Error(
      result.error.issues[0]?.message ?? 'Invalid report date range.',
    );
  }

  return result.data;
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
  return reportFilterOptionSchema.array().parse(
    sortByLabel(
      projects.map((project) => ({
        label: project.name,
        value: project.id,
      })),
    ),
  );
}

export function deriveMemberOptions(
  projects: ProjectListResponse,
): ReportFilterOption[] {
  const options = new Map<string, ReportFilterOption>();

  for (const project of projects) {
    for (const member of project.members) {
      addProjectMemberOption(options, member);
    }
  }

  return reportFilterOptionSchema
    .array()
    .parse(sortByLabel([...options.values()]));
}

export function deriveWorkspaceMemberOptions(
  members: WorkspaceMemberListResponse,
): ReportFilterOption[] {
  return reportFilterOptionSchema.array().parse(
    sortByLabel(
      members.map((member) => ({
        label: member.displayName?.trim() || member.email,
        value: member.userId,
      })),
    ),
  );
}

function toReportDateQuery(
  dateRange: ReportDateRange,
): Pick<TimeReportQuery, 'dateFrom' | 'dateTo'> {
  const parsedDateRange = parseReportDateRange(dateRange);
  const [dateFrom, dateTo] = parsedDateRange ?? [];
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
): TimeReportQuery {
  const parsedFilters = reportSetupFiltersSchema.parse(filters);

  return timeReportQuerySchema.parse({
    ...toReportDateQuery(parsedFilters.dateRange),
    groupBy: parsedFilters.groupBy,
    limit,
    page,
    projectId: parsedFilters.projectId ?? undefined,
    sortBy: 'totalSeconds',
    sortOrder: 'desc',
    userId: parsedFilters.memberId ?? undefined,
  });
}

export function toTimeReportExportQuery(
  filters: ReportSetupFilters,
): TimeReportExportQuery {
  const parsedFilters = reportSetupFiltersSchema.parse(filters);

  return timeReportExportQuerySchema.parse({
    ...toReportDateQuery(parsedFilters.dateRange),
    groupBy: parsedFilters.groupBy,
    projectId: parsedFilters.projectId ?? undefined,
    sortBy: 'totalSeconds',
    sortOrder: 'desc',
    userId: parsedFilters.memberId ?? undefined,
  });
}

function formatUserName(user: {
  displayName: string | null;
  email: string;
}): string {
  return user.displayName?.trim() || user.email;
}

/**
 * Identities the response does not carry are left null. A project row counts its
 * contributors rather than naming one, so a placeholder label would be a lie.
 */
function getReportTableRowLabels(
  row: TimeReportRow,
  context: ReportRowContext,
): Pick<ReportTableRow, 'memberName' | 'projectName'> {
  const selectedProjectLabel = getOptionLabel(
    context.projectOptions,
    context.selectedProjectId,
  );

  if (row.groupBy === 'user') {
    return {
      memberName: formatUserName(row.user),
      projectName: selectedProjectLabel,
    };
  }

  if (row.groupBy === 'task') {
    return {
      memberName: null,
      projectName: `${row.project.name} / ${row.task.title}`,
    };
  }

  return {
    memberName: null,
    projectName: row.project.name,
  };
}

function getReportTableRowId(
  row: TimeReportRow,
  context: ReportRowContext,
): string {
  const projectId =
    row.project?.id ?? context.selectedProjectId ?? 'all-projects';
  const taskId = row.task?.id ?? 'no-task';
  const memberId = row.user?.id ?? context.selectedMemberId ?? 'all-members';

  return `${row.groupBy}:${projectId}:${taskId}:${memberId}`;
}

export function toReportTableRows(
  response: TimeReportResponse | null,
  context: ReportRowContext,
): ReportTableRow[] {
  const rows = (response?.items ?? []).map((row) => {
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

    return reportTableRowSchema.parse({
      billableSeconds: row.billableSeconds,
      billableShare: row.billableShare,
      entryCount: row.entryCount,
      groupBy: row.groupBy,
      id: getReportTableRowId(row, context),
      memberIds,
      nonBillableSeconds: row.nonBillableSeconds,
      projectIds,
      totalSeconds: row.totalSeconds,
      ...getReportTableRowLabels(row, context),
    });
  });

  return reportTableRowSchema
    .array()
    .parse(rows)
    .sort(
      (a, b) =>
        (a.projectName ?? '').localeCompare(b.projectName ?? '') ||
        (a.memberName ?? '').localeCompare(b.memberName ?? ''),
    );
}

export function deriveReportSummaryView(
  rows: ReportTableRow[],
): ReportSummaryView {
  let totalSeconds = 0;
  let billableSeconds = 0;
  let nonBillableSeconds = 0;
  let entryCount = 0;
  const memberIds = new Set<string>();
  const projectTotals = new Map<string, { name: string; seconds: number }>();

  for (const row of rows) {
    totalSeconds += row.totalSeconds;
    billableSeconds += row.billableSeconds;
    nonBillableSeconds += row.nonBillableSeconds;
    entryCount += row.entryCount;

    for (const memberId of row.memberIds) {
      memberIds.add(memberId);
    }

    if (row.projectIds.length !== 1 || row.projectName === null) {
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
  const memberCount = memberIds.size;

  return reportSummaryViewSchema.parse({
    avgPerMemberSeconds: memberCount > 0 ? totalSeconds / memberCount : 0,
    billableSeconds,
    billableShare: totalSeconds > 0 ? billableSeconds / totalSeconds : null,
    entryCount,
    memberCount,
    nonBillableSeconds,
    topProjectName: topProject?.name ?? 'None',
    topProjectSeconds: topProject?.seconds ?? 0,
    totalSeconds,
  });
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
  const parsedFilters = reportTableFiltersSchema.parse(filters);
  const search = parsedFilters.global.trim().toLowerCase();

  return rows.filter((row) => {
    if (
      parsedFilters.projectId &&
      !row.projectIds.includes(parsedFilters.projectId)
    ) {
      return false;
    }

    if (
      parsedFilters.memberId &&
      !row.memberIds.includes(parsedFilters.memberId)
    ) {
      return false;
    }

    if (parsedFilters.hours === 'gt0' && row.totalSeconds <= 0) {
      return false;
    }

    if (parsedFilters.hours === 'gte8' && row.totalSeconds < 8 * 60 * 60) {
      return false;
    }

    if (parsedFilters.hours === 'gte40' && row.totalSeconds < 40 * 60 * 60) {
      return false;
    }

    if (parsedFilters.billable === 'withBillable' && row.billableSeconds <= 0) {
      return false;
    }

    if (
      parsedFilters.billable === 'withoutBillable' &&
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
      formatPaddedHoursMinutesDuration(row.totalSeconds),
      formatPaddedHoursMinutesDuration(
        getReportRowBillableSeconds(row, parsedFilters.billable),
      ),
      formatReportPercent(row.billableShare),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(search);
  });
}

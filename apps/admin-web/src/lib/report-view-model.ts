import {
  timeReportExportRequestSchema,
  timeReportRequestSchema,
  type ProjectListResponse,
  type ProjectMember,
  type TimeReportExportRequest,
  type TimeReportRequest,
  type TimeReportResponse,
  type TimeReportRow,
  type WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import {
  formatPaddedHoursMinutesDuration,
  getLocalDateKey,
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
  type ReportGrouping,
  type ReportGroupingDimension,
  type ReportSetupFilters,
  type ReportSummaryView,
  type ReportTableFilters,
  type ReportTableRow,
} from '@/validation/report-view-model';

export {
  defaultReportGrouping,
  getReportExportBlockedReason,
  maxReportGroupingLevels,
  reportGroupingApiValue,
  toReportGroupingApiPath,
} from '@/validation/report-view-model';

export type {
  ReportActivityFilter,
  ReportBillableFilter,
  ReportBillableShareFilter,
  ReportDateRange,
  ReportFilterOption,
  ReportGrouping,
  ReportGroupingDimension,
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
    activity: 'any',
    billable: 'any',
    billableShare: 'any',
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
): Pick<TimeReportRequest, 'dateFrom' | 'dateTo'> {
  const parsedDateRange = parseReportDateRange(dateRange);
  const [dateFrom, dateTo] = parsedDateRange ?? [];
  const query: Pick<TimeReportRequest, 'dateFrom' | 'dateTo'> = {};

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
): TimeReportRequest {
  const parsedFilters = reportSetupFiltersSchema.parse(filters);

  return timeReportRequestSchema.parse({
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

export function toTimeReportExportRequest(
  filters: ReportSetupFilters,
): TimeReportExportRequest {
  const parsedFilters = reportSetupFiltersSchema.parse(filters);

  return timeReportExportRequestSchema.parse({
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
 * Identities the response does not carry are left null. A row without member
 * identity totals its contributors rather than naming one, so a placeholder
 * label would be a lie. A project label can still come from the setup filter
 * when the grouping path itself carries no project dimension.
 */
function getReportTableRowLabels(
  row: TimeReportRow,
  context: ReportRowContext,
): Pick<ReportTableRow, 'memberName' | 'projectName' | 'taskName'> {
  const selectedProjectLabel = getOptionLabel(
    context.projectOptions,
    context.selectedProjectId,
  );

  return {
    memberName: row.user ? formatUserName(row.user) : null,
    projectName: row.project?.name ?? selectedProjectLabel,
    taskName: row.task?.title ?? null,
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

  return `${projectId}:${taskId}:${memberId}`;
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
      id: getReportTableRowId(row, context),
      lastStartedAt: row.lastStartedAt,
      memberIds,
      nonBillableSeconds: row.nonBillableSeconds,
      projectIds,
      taskId: row.task?.id ?? null,
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
        (a.memberName ?? '').localeCompare(b.memberName ?? '') ||
        (a.taskName ?? '').localeCompare(b.taskName ?? ''),
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

export interface ReportRowTotals {
  billableSeconds: number;
  billableShare: number | null;
  entryCount: number;
  lastStartedAt: string | null;
  nonBillableSeconds: number;
  totalSeconds: number;
}

export interface ReportTreeNode extends ReportRowTotals {
  children: ReportTreeNode[];
  childCountLabel: string | null;
  dimension: ReportGroupingDimension;
  id: string;
  isLeaf: boolean;
  label: string;
  level: number;
}

export interface ReportDisplayRow extends ReportRowTotals {
  childCountLabel: string | null;
  dimension: ReportGroupingDimension;
  hasChildren: boolean;
  id: string;
  isLeaf: boolean;
  label: string;
  level: number;
}

const reportDimensionNouns: Record<ReportGroupingDimension, string> = {
  member: 'member',
  project: 'project',
  task: 'task',
};

const unknownDimensionLabel: Record<ReportGroupingDimension, string> = {
  member: 'All members',
  project: 'All projects',
  task: 'No task',
};

function getRowDimensionKey(
  row: ReportTableRow,
  dimension: ReportGroupingDimension,
): string {
  if (dimension === 'project') return row.projectIds[0] ?? 'all-projects';
  if (dimension === 'member') return row.memberIds[0] ?? 'all-members';
  return row.taskId ?? 'no-task';
}

function getRowDimensionLabel(
  row: ReportTableRow,
  dimension: ReportGroupingDimension,
): string {
  const label =
    dimension === 'project'
      ? row.projectName
      : dimension === 'member'
        ? row.memberName
        : row.taskName;

  return label ?? unknownDimensionLabel[dimension];
}

function maxIsoDate(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;

  return a >= b ? a : b;
}

export function sumReportRows(rows: ReportTableRow[]): ReportRowTotals {
  let totalSeconds = 0;
  let billableSeconds = 0;
  let nonBillableSeconds = 0;
  let entryCount = 0;
  let lastStartedAt: string | null = null;

  for (const row of rows) {
    totalSeconds += row.totalSeconds;
    billableSeconds += row.billableSeconds;
    nonBillableSeconds += row.nonBillableSeconds;
    entryCount += row.entryCount;
    lastStartedAt = maxIsoDate(lastStartedAt, row.lastStartedAt);
  }

  return {
    billableSeconds,
    billableShare: totalSeconds > 0 ? billableSeconds / totalSeconds : null,
    entryCount,
    lastStartedAt,
    nonBillableSeconds,
    totalSeconds,
  };
}

function formatChildCount(
  count: number,
  dimension: ReportGroupingDimension,
): string {
  const noun = reportDimensionNouns[dimension];

  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

function buildReportTreeLevel(
  rows: ReportTableRow[],
  grouping: ReportGrouping,
  level: number,
  parentId: string,
): ReportTreeNode[] {
  const dimension = grouping[level]!;
  const isLeafLevel = level === grouping.length - 1;
  const groups = new Map<string, ReportTableRow[]>();
  for (const row of rows) {
    const key = getRowDimensionKey(row, dimension);
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  const nodes = [...groups.entries()].map(([key, groupRows]) => {
    const id = `${parentId}/${dimension}:${key}`;
    const children = isLeafLevel
      ? []
      : buildReportTreeLevel(groupRows, grouping, level + 1, id);
    const childDimension = grouping[level + 1];

    return {
      ...sumReportRows(groupRows),
      childCountLabel:
        childDimension === undefined
          ? null
          : formatChildCount(children.length, childDimension),
      children,
      dimension,
      id,
      isLeaf: isLeafLevel,
      label: getRowDimensionLabel(groupRows[0]!, dimension),
      level,
    };
  });

  // Siblings order by tracked time, heaviest first; labels break ties so the
  // order is stable across refreshes.
  return nodes.sort(
    (a, b) =>
      b.totalSeconds - a.totalSeconds || a.label.localeCompare(b.label),
  );
}

export function buildReportTree(
  rows: ReportTableRow[],
  grouping: ReportGrouping,
): ReportTreeNode[] {
  if (rows.length === 0) {
    return [];
  }

  return buildReportTreeLevel(rows, grouping, 0, 'report');
}

/**
 * Flattens the tree for the table. Nodes render in depth-first order and a
 * collapsed node keeps its subtotals visible while hiding its subtree; the
 * default (empty set) shows everything expanded.
 */
export function flattenReportTree(
  nodes: ReportTreeNode[],
  collapsedIds: ReadonlySet<string>,
): ReportDisplayRow[] {
  const rows: ReportDisplayRow[] = [];
  const visit = (node: ReportTreeNode): void => {
    const { children, ...display } = node;
    rows.push({ ...display, hasChildren: children.length > 0 });
    if (!collapsedIds.has(node.id)) {
      children.forEach(visit);
    }
  };
  nodes.forEach(visit);

  return rows;
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

function matchesReportBillableShareFilter(
  share: number | null,
  filter: ReportTableFilters['billableShare'],
): boolean {
  if (filter === 'any') {
    return true;
  }
  // A group with no tracked time has no share to compare.
  if (share === null) {
    return false;
  }
  if (filter === 'below50') {
    return share < 0.5;
  }

  return share >= (filter === 'gte90' ? 0.9 : 0.5);
}

function matchesReportActivityFilter(
  lastStartedAt: string | null,
  filter: ReportTableFilters['activity'],
  now: Date,
): boolean {
  if (filter === 'any') {
    return true;
  }
  if (lastStartedAt === null) {
    return false;
  }
  if (filter === 'today') {
    return getLocalDateKey(lastStartedAt) === getLocalDateKey(now);
  }

  const windowDays = filter === 'last7' ? 7 : 30;
  const windowStart = now.getTime() - windowDays * 24 * 60 * 60 * 1000;

  return new Date(lastStartedAt).getTime() >= windowStart;
}

/**
 * Aggregate filters compare what the primary rows display: the top-level
 * group's own totals. Filtering leaves instead would test invisible numbers —
 * a project showing 8h is built from task-member leaves holding fractions of
 * it, so a leaf-level threshold could never match the screen. Qualifying
 * groups keep their whole subtree.
 */
export function filterReportTreeGroups(
  nodes: ReportTreeNode[],
  filters: ReportTableFilters,
  now = new Date(),
): ReportTreeNode[] {
  const parsedFilters = reportTableFiltersSchema.parse(filters);

  return nodes.filter((node) => {
    if (parsedFilters.hours === 'gt0' && node.totalSeconds <= 0) {
      return false;
    }

    if (parsedFilters.hours === 'gte8' && node.totalSeconds < 8 * 60 * 60) {
      return false;
    }

    if (parsedFilters.hours === 'gte40' && node.totalSeconds < 40 * 60 * 60) {
      return false;
    }

    if (parsedFilters.billable === 'withBillable' && node.billableSeconds <= 0) {
      return false;
    }

    if (
      parsedFilters.billable === 'withoutBillable' &&
      node.totalSeconds - node.billableSeconds <= 0
    ) {
      return false;
    }

    if (
      !matchesReportBillableShareFilter(
        node.billableShare,
        parsedFilters.billableShare,
      )
    ) {
      return false;
    }

    return matchesReportActivityFilter(
      node.lastStartedAt,
      parsedFilters.activity,
      now,
    );
  });
}

export function sumReportTreeTotals(nodes: ReportTreeNode[]): ReportRowTotals {
  let totalSeconds = 0;
  let billableSeconds = 0;
  let nonBillableSeconds = 0;
  let entryCount = 0;
  let lastStartedAt: string | null = null;

  for (const node of nodes) {
    totalSeconds += node.totalSeconds;
    billableSeconds += node.billableSeconds;
    nonBillableSeconds += node.nonBillableSeconds;
    entryCount += node.entryCount;
    lastStartedAt = maxIsoDate(lastStartedAt, node.lastStartedAt);
  }

  return {
    billableSeconds,
    billableShare: totalSeconds > 0 ? billableSeconds / totalSeconds : null,
    entryCount,
    lastStartedAt,
    nonBillableSeconds,
    totalSeconds,
  };
}

/**
 * Leaf-level filtering: identity and text search only. Aggregate thresholds
 * live in filterReportTreeGroups because they must compare displayed group
 * totals, not the invisible leaves underneath.
 */
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

    if (!search) {
      return true;
    }

    const haystack = [
      row.projectName,
      row.memberName,
      row.taskName,
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

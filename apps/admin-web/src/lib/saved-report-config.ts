import {
  savedReportConfigSchema,
  type SavedReportConfig,
  type TimeReportGroupBy,
} from '@gitiempo/shared';
import {
  createDefaultReportTableFilters,
  getDefaultReportDateRange,
} from './report-view-model';
import {
  defaultReportGrouping,
  reportGroupingApiValue,
  type ReportDateRange,
  type ReportGrouping,
  type ReportGroupingDimension,
  type ReportTableFilters,
} from '@/validation/report-view-model';

/**
 * Translates between a saved preset config and the reports page state.
 *
 * Pure by design: functions receive data rather than Vue refs or network
 * dependencies.
 */

/**
 * The slice of page state a preset restores.
 */
export interface SavedReportState {
  dateRange: ReportDateRange;
  grouping: ReportGrouping;
  filters: ReportTableFilters;
}

/** Which identity filters were dropped because they are no longer available. */
export type SavedReportFallback = 'project' | 'member';

export interface ApplyConfigOptions {
  /** Ids the user can currently choose. `null` skips the availability check. */
  availableProjectIds?: readonly string[] | null;
  availableMemberIds?: readonly string[] | null;
}

export interface AppliedConfig {
  state: SavedReportState;
  fallbacks: SavedReportFallback[];
}

const apiToUiDimension: Record<TimeReportGroupBy, ReportGroupingDimension> = {
  project: 'project',
  task: 'task',
  user: 'member',
};

export function toApiGrouping(grouping: ReportGrouping): TimeReportGroupBy[] {
  return grouping.map((dimension) => reportGroupingApiValue[dimension]);
}

export function toUiGrouping(
  grouping: readonly TimeReportGroupBy[],
): ReportGrouping {
  return grouping.map((dimension) => apiToUiDimension[dimension]);
}

function toIsoDate(date: Date): string {
  return date.toISOString();
}

export function buildConfigFromState(
  state: SavedReportState,
  now = new Date(),
): SavedReportConfig {
  const defaultDateRange = getDefaultReportDateRange(now);
  const [start, end] = state.dateRange ?? defaultDateRange ?? [];

  if (!start || !end) {
    throw new Error('A saved report requires a complete date range.');
  }

  const dateRange: SavedReportConfig['dateRange'] = {
    dateFrom: toIsoDate(start),
    dateTo: toIsoDate(end),
    kind: 'absolute',
  };

  const result = savedReportConfigSchema.safeParse({
    dateRange,
    filters: {
      activity: state.filters.activity,
      billable: state.filters.billable,
      billableShare: state.filters.billableShare,
      global: state.filters.global,
      hours: state.filters.hours,
    },
    grouping: toApiGrouping(state.grouping),
    memberId: state.filters.memberId,
    projectId: state.filters.projectId,
  });

  if (result.success) return result.data;

  const [defaultStart, defaultEnd] = defaultDateRange ?? [];
  if (!defaultStart || !defaultEnd) {
    throw new Error('A saved report requires a complete date range.');
  }

  return savedReportConfigSchema.parse({
    dateRange: {
      dateFrom: toIsoDate(defaultStart),
      dateTo: toIsoDate(defaultEnd),
      kind: 'absolute',
    },
  });
}

function keepAvailable(
  id: string | null,
  available: readonly string[] | null | undefined,
): { id: string | null; dropped: boolean } {
  if (id === null || available === null || available === undefined) {
    return { dropped: false, id };
  }

  return available.includes(id)
    ? { dropped: false, id }
    : { dropped: true, id: null };
}

export function applyConfigToState(
  config: SavedReportConfig,
  options: ApplyConfigOptions = {},
): AppliedConfig {
  const project = keepAvailable(config.projectId, options.availableProjectIds);
  const member = keepAvailable(config.memberId, options.availableMemberIds);

  const fallbacks: SavedReportFallback[] = [];
  if (project.dropped) fallbacks.push('project');
  if (member.dropped) fallbacks.push('member');

  const dateRange: ReportDateRange = [
    new Date(config.dateRange.dateFrom),
    new Date(config.dateRange.dateTo),
  ];

  return {
    fallbacks,
    state: {
      dateRange,
      filters: {
        activity: config.filters.activity,
        billable: config.filters.billable,
        billableShare: config.filters.billableShare,
        global: config.filters.global,
        hours: config.filters.hours,
        memberId: member.id,
        projectId: project.id,
      },
      grouping: toUiGrouping(config.grouping),
    },
  };
}

/** One chip in the "This report saves" summary of the mobile save sheet. */
export interface SavedReportConfigSummaryItem {
  icon: string;
  label: string;
}

const groupingDimensionLabels: Record<TimeReportGroupBy, string> = {
  project: 'Project',
  task: 'Task',
  user: 'Member',
};

function formatSummaryDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });
}

function countActiveFilters(config: SavedReportConfig): number {
  const { filters } = config;

  return [
    filters.activity !== 'any',
    filters.billable !== 'any',
    filters.billableShare !== 'any',
    filters.hours !== 'any',
    filters.global.trim() !== '',
    config.projectId !== null,
    config.memberId !== null,
  ].filter(Boolean).length;
}

/**
 * Human-readable summary of what a preset captures: the date range, grouping
 * path, and how many filters are set.
 */
export function describeSavedReportConfig(
  config: SavedReportConfig,
): SavedReportConfigSummaryItem[] {
  const dateLabel = `${formatSummaryDate(config.dateRange.dateFrom)} – ${formatSummaryDate(config.dateRange.dateTo)}`;

  const items: SavedReportConfigSummaryItem[] = [
    { icon: 'pi pi-calendar', label: dateLabel },
    {
      icon: 'pi pi-sitemap',
      label: config.grouping
        .map((dimension) => groupingDimensionLabels[dimension])
        .join(' › '),
    },
  ];

  const filterCount = countActiveFilters(config);
  if (filterCount > 0) {
    items.push({
      icon: 'pi pi-filter',
      label: `${filterCount} ${filterCount === 1 ? 'filter' : 'filters'}`,
    });
  }

  return items;
}

export function createDefaultSavedReportState(
  now = new Date(),
): SavedReportState {
  return {
    dateRange: getDefaultReportDateRange(now),
    filters: createDefaultReportTableFilters(),
    grouping: [...defaultReportGrouping],
  };
}

/** Canonical form for dirty comparison. */
export function normaliseConfig(config: SavedReportConfig): string {
  const parsed = savedReportConfigSchema.parse(config);

  return JSON.stringify([
    ['absolute', parsed.dateRange.dateFrom, parsed.dateRange.dateTo],
    parsed.grouping,
    parsed.projectId ?? '',
    parsed.memberId ?? '',
    parsed.filters.activity,
    parsed.filters.billable,
    parsed.filters.billableShare,
    parsed.filters.global.trim(),
    parsed.filters.hours,
  ]);
}

export function isSameSavedReportConfig(
  left: SavedReportConfig,
  right: SavedReportConfig,
): boolean {
  return normaliseConfig(left) === normaliseConfig(right);
}

import {
  savedReportConfigSchema,
  type SavedReportConfig,
  type SavedReportPeriod,
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
 * Pure by design: every function takes `now` rather than reading the clock, so
 * relative periods are deterministic in tests, and nothing here touches Vue
 * refs or the network.
 */

/**
 * The slice of page state a preset restores. `period` is what the date control
 * has selected: a relative period, or `null` when the user picked a custom
 * range. It is tracked separately from `dateRange` because `dateRange` always
 * holds concrete dates — the resolved window — and the preset must store the
 * user's intent, not the day it happened to be saved.
 */
export interface SavedReportState {
  dateRange: ReportDateRange;
  period: SavedReportPeriod | null;
  grouping: ReportGrouping;
  filters: ReportTableFilters;
}

/** Which identity filters were dropped because they are no longer available. */
export type SavedReportFallback = 'project' | 'member';

export interface ApplyConfigOptions {
  now?: Date;
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

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const shifted = startOfDay(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

/**
 * Resolves a period against the viewer's local calendar, matching how the
 * Last-activity filter and column already read dates.
 */
export function resolveRelativePeriod(
  period: SavedReportPeriod,
  now = new Date(),
): [Date, Date] {
  const today = startOfDay(now);

  switch (period) {
    case 'this_week': {
      // Weeks start Monday; getDay() is 0 on Sunday.
      const weekday = (today.getDay() + 6) % 7;
      return [addDays(today, -weekday), today];
    }
    case 'this_month':
      return [new Date(today.getFullYear(), today.getMonth(), 1), today];
    case 'previous_month':
      return [
        new Date(today.getFullYear(), today.getMonth() - 1, 1),
        new Date(today.getFullYear(), today.getMonth(), 0),
      ];
    case 'last_7_days':
      return [addDays(today, -6), today];
    case 'last_30_days':
      return [addDays(today, -29), today];
  }
}

function toIsoDate(date: Date): string {
  return date.toISOString();
}

export function buildConfigFromState(
  state: SavedReportState,
): SavedReportConfig {
  const [start, end] = state.dateRange ?? [];

  const dateRange: SavedReportConfig['dateRange'] =
    state.period !== null
      ? { kind: 'relative', period: state.period }
      : start && end
        ? {
            dateFrom: toIsoDate(start),
            dateTo: toIsoDate(end),
            kind: 'absolute',
          }
        : { kind: 'relative', period: 'this_month' };

  return savedReportConfigSchema.parse({
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
  const now = options.now ?? new Date();
  const project = keepAvailable(config.projectId, options.availableProjectIds);
  const member = keepAvailable(config.memberId, options.availableMemberIds);

  const fallbacks: SavedReportFallback[] = [];
  if (project.dropped) fallbacks.push('project');
  if (member.dropped) fallbacks.push('member');

  const dateRange: ReportDateRange =
    config.dateRange.kind === 'relative'
      ? resolveRelativePeriod(config.dateRange.period, now)
      : [
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
      period:
        config.dateRange.kind === 'relative' ? config.dateRange.period : null,
    },
  };
}

/** One chip in the "This report saves" summary of the mobile save sheet. */
export interface SavedReportConfigSummaryItem {
  icon: string;
  label: string;
}

const periodLabels: Record<SavedReportPeriod, string> = {
  last_7_days: 'Last 7 days',
  last_30_days: 'Last 30 days',
  previous_month: 'Previous month',
  this_month: 'This month',
  this_week: 'This week',
};

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
 * Human-readable summary of what a preset captures: the date intent, the
 * grouping path, and how many filters are set. Shown before saving so the
 * user knows what the preset will restore — the stored shape, matching the
 * dirty comparison, not the resolved window.
 */
export function describeSavedReportConfig(
  config: SavedReportConfig,
): SavedReportConfigSummaryItem[] {
  const dateLabel =
    config.dateRange.kind === 'relative'
      ? periodLabels[config.dateRange.period]
      : `${formatSummaryDate(config.dateRange.dateFrom)} – ${formatSummaryDate(config.dateRange.dateTo)}`;

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
    period: null,
  };
}

/**
 * Canonical form for dirty comparison.
 *
 * Compares the STORED shape, never the resolved window: a relative preset must
 * not read as changed simply because "this month" covers different days than
 * it did when the preset was saved.
 */
export function normaliseConfig(config: SavedReportConfig): string {
  const parsed = savedReportConfigSchema.parse(config);

  return JSON.stringify([
    parsed.dateRange.kind === 'relative'
      ? ['relative', parsed.dateRange.period]
      : ['absolute', parsed.dateRange.dateFrom, parsed.dateRange.dateTo],
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

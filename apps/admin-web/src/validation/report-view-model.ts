import { z } from 'zod';
import {
  timeReportGroupBySchema,
  timeReportTotalsSchema,
  type TimeReportGroupBy,
} from '@gitiempo/shared';

export const reportDateRangeErrorMessage = 'End date must be after the start date.';
const reportDateRangeTupleSchema = z.tuple([z.date().nullable(), z.date().nullable()]);

export const reportDateRangeSchema = z
  .union([reportDateRangeTupleSchema, z.null()])
  .refine(
    (dateRange) => {
      const [start, end] = dateRange ?? [];

      return !(start && end && end.getTime() < start.getTime());
    },
    { message: reportDateRangeErrorMessage },
  );
export type ReportDateRange = z.infer<typeof reportDateRangeSchema>;

export const reportHoursFilterSchema = z.enum(['any', 'gt0', 'gte8', 'gte40']);
export type ReportHoursFilter = z.infer<typeof reportHoursFilterSchema>;

export const reportBillableFilterSchema = z.enum([
  'any',
  'withBillable',
  'withoutBillable',
]);
export type ReportBillableFilter = z.infer<typeof reportBillableFilterSchema>;

export const reportEntriesFilterSchema = z.enum([
  'any',
  'gte1',
  'gte10',
  'gte50',
]);
export type ReportEntriesFilter = z.infer<typeof reportEntriesFilterSchema>;

export const reportBillableShareFilterSchema = z.enum([
  'any',
  'below50',
  'gte50',
  'gte90',
]);
export type ReportBillableShareFilter = z.infer<
  typeof reportBillableShareFilterSchema
>;

export const reportActivityFilterSchema = z.enum([
  'any',
  'today',
  'last7',
  'last30',
]);
export type ReportActivityFilter = z.infer<typeof reportActivityFilterSchema>;

export const reportFilterOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});
export type ReportFilterOption = z.infer<typeof reportFilterOptionSchema>;

export const reportGroupingDimensionSchema = z.enum([
  'project',
  'member',
  'task',
]);
export type ReportGroupingDimension = z.infer<
  typeof reportGroupingDimensionSchema
>;

export const maxReportGroupingLevels = 4;

// Ordered grouping path: the first dimension is the top table level.
export const reportGroupingSchema = reportGroupingDimensionSchema
  .array()
  .min(1)
  .max(maxReportGroupingLevels)
  .refine((path) => new Set(path).size === path.length, {
    message: 'Grouping levels must be unique',
  });
export type ReportGrouping = z.infer<typeof reportGroupingSchema>;

export const defaultReportGrouping: ReportGrouping = ['project'];

/** UI dimension vocabulary mapped to the API grouping dimensions. */
export const reportGroupingApiValue: Record<
  ReportGroupingDimension,
  TimeReportGroupBy
> = {
  member: 'user',
  project: 'project',
  task: 'task',
};

export function toReportGroupingApiPath(
  grouping: ReportGrouping,
): TimeReportGroupBy[] {
  return grouping.map((dimension) => reportGroupingApiValue[dimension]);
}

export const reportSetupFiltersSchema = z.object({
  dateRange: reportDateRangeSchema,
  groupBy: timeReportGroupBySchema
    .array()
    .min(1)
    .max(maxReportGroupingLevels),
  memberId: z.string().nullable(),
  projectId: z.string().nullable(),
});
export type ReportSetupFilters = z.infer<typeof reportSetupFiltersSchema>;

/**
 * Single source of truth for whether the CSV export may run, and why not.
 *
 * Only filters the table and the CSV agree on reach the export. `hours` and
 * `billable` filter aggregate row totals, and `global` matches formatted
 * labels including durations and percentages; the export is detailed
 * project-task-user rows holding none of those. The backend's own `search` is
 * not an equivalent either: it matches task titles the table never shows and
 * ignores the duration labels the table does.
 *
 * The member filter is grouping-dependent. When `member` is one of the
 * grouping levels, every visible leaf carries one member's own sums, so a
 * `userId`-scoped export matches the screen. Without a member level the table
 * keeps whole folded rows with every contributor's time (`filterReportRows`
 * selects leaves, it never re-sums), while a `userId`-scoped export would
 * return only that member's entries — the file would silently show a fraction
 * of the on-screen hours.
 */
export function getReportExportBlockedReason(
  filters: Pick<
    ReportTableFilters,
    | 'activity'
    | 'billable'
    | 'billableShare'
    | 'entries'
    | 'global'
    | 'hours'
    | 'memberId'
  >,
  grouping: ReportGrouping,
): string | null {
  if (
    filters.hours !== 'any' ||
    filters.billable !== 'any' ||
    filters.entries !== 'any' ||
    filters.billableShare !== 'any' ||
    filters.activity !== 'any' ||
    filters.global.trim() !== ''
  ) {
    return 'Search and column filters over aggregates cannot be exported. Clear them to export this report.';
  }

  if (!grouping.includes('member') && filters.memberId !== null) {
    return 'A member filter cannot be exported without a member grouping level: rows on screen total everyone, but the file would hold only that member. Add a member level or clear the filter.';
  }

  return null;
}

// Leaf row: one aggregate at the requested grouping-path granularity. The
// tree and its subtotals are derived from these (see buildReportTree).
export const reportTableRowSchema = z.object({
  billableSeconds: z.number().int().min(0),
  billableShare: z.number().min(0).max(1).nullable(),
  entryCount: z.number().int().min(0),
  id: z.string(),
  lastStartedAt: z.string().nullable(),
  memberIds: z.array(z.string()),
  memberName: z.string().nullable(),
  nonBillableSeconds: z.number().int().min(0),
  projectIds: z.array(z.string()),
  projectName: z.string().nullable(),
  taskId: z.string().nullable(),
  taskName: z.string().nullable(),
  totalSeconds: z.number().int().min(0),
});
export type ReportTableRow = z.infer<typeof reportTableRowSchema>;

export const reportSummaryViewSchema = timeReportTotalsSchema.extend({
  avgPerMemberSeconds: z.number().min(0),
  memberCount: z.number().int().min(0),
  topProjectName: z.string(),
  topProjectSeconds: z.number().int().min(0),
});
export type ReportSummaryView = z.infer<typeof reportSummaryViewSchema>;

export const reportTableFiltersSchema = z.object({
  activity: reportActivityFilterSchema,
  billable: reportBillableFilterSchema,
  billableShare: reportBillableShareFilterSchema,
  entries: reportEntriesFilterSchema,
  global: z.string(),
  hours: reportHoursFilterSchema,
  memberId: z.string().nullable(),
  projectId: z.string().nullable(),
});
export type ReportTableFilters = z.infer<typeof reportTableFiltersSchema>;

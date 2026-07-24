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

// Billable-hours thresholds, mirroring the Hours filter but measured on a
// group's billable seconds (was a broken with/without-billable toggle; the
// billable split now lives in the grouping dimension instead).
export const reportBillableFilterSchema = z.enum(['any', 'gte8', 'gte40']);
export type ReportBillableFilter = z.infer<typeof reportBillableFilterSchema>;

// Identity of a row split on the billable grouping dimension (client mirror of
// the shared TimeReportBillableGroup). Distinct from the billable column filter
// above: this labels which bucket a split row belongs to.
export const reportBillableGroupSchema = z.enum(['billable', 'nonBillable']);
export type ReportBillableGroup = z.infer<typeof reportBillableGroupSchema>;

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
  'billable',
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
  billable: 'billable',
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

// Leaf row: one aggregate at the requested grouping-path granularity. The
// tree and its subtotals are derived from these (see buildReportTree).
export const reportTableRowSchema = z.object({
  // Which billable bucket this row belongs to, or null until the row is split
  // on the billable grouping dimension (see splitRowsByBillable).
  billable: reportBillableGroupSchema.nullable().default(null),
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
  global: z.string(),
  hours: reportHoursFilterSchema,
  memberId: z.string().nullable(),
  projectId: z.string().nullable(),
});
export type ReportTableFilters = z.infer<typeof reportTableFiltersSchema>;

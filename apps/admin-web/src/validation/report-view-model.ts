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

export const reportFilterOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});
export type ReportFilterOption = z.infer<typeof reportFilterOptionSchema>;

export const reportGroupingSchema = z
  .enum(['project', 'member'])
  .default('project');
export type ReportGrouping = z.infer<typeof reportGroupingSchema>;

export const defaultReportGrouping: ReportGrouping = 'project';

/** Export metadata only: the CSV always carries detailed project-task-user rows. */
export const reportGroupingApiValue: Record<ReportGrouping, TimeReportGroupBy> = {
  member: 'user',
  project: 'project',
};

export const reportSetupFiltersSchema = z.object({
  dateRange: reportDateRangeSchema,
  groupBy: timeReportGroupBySchema,
  memberId: z.string().nullable(),
  projectId: z.string().nullable(),
});
export type ReportSetupFilters = z.infer<typeof reportSetupFiltersSchema>;

/**
 * Only identity filters reach the CSV. `hours` and `billable` filter aggregate
 * row totals, and `global` matches formatted labels including durations and
 * percentages; the export is detailed project-task-user rows holding none of
 * those, so no equivalent exists to send. The backend's own `search` is not an
 * equivalent either: it matches task titles the table never shows and ignores
 * the duration labels the table does.
 */
export function isReportTableFilterExportable(
  filters: Pick<ReportTableFilters, 'billable' | 'global' | 'hours'>,
): boolean {
  return (
    filters.hours === 'any' &&
    filters.billable === 'any' &&
    filters.global.trim() === ''
  );
}

export const reportTableRowSchema = z.object({
  billableSeconds: z.number().int().min(0),
  billableShare: z.number().min(0).max(1).nullable(),
  entryCount: z.number().int().min(0),
  groupBy: timeReportGroupBySchema,
  id: z.string(),
  memberIds: z.array(z.string()),
  memberName: z.string().nullable(),
  nonBillableSeconds: z.number().int().min(0),
  projectIds: z.array(z.string()),
  projectName: z.string().nullable(),
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
  billable: reportBillableFilterSchema,
  global: z.string(),
  hours: reportHoursFilterSchema,
  memberId: z.string().nullable(),
  projectId: z.string().nullable(),
});
export type ReportTableFilters = z.infer<typeof reportTableFiltersSchema>;

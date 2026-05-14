import { z } from 'zod';
import {
  timeReportGroupBySchema,
  timeReportTotalsSchema,
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

export const reportSetupFiltersSchema = z.object({
  dateRange: reportDateRangeSchema,
  groupBy: timeReportGroupBySchema,
  memberId: z.string().nullable(),
  projectId: z.string().nullable(),
});
export type ReportSetupFilters = z.infer<typeof reportSetupFiltersSchema>;

export const reportTableRowSchema = z.object({
  billableSeconds: z.number().int().min(0),
  billableShare: z.number().min(0).max(1).nullable(),
  entryCount: z.number().int().min(0),
  groupBy: timeReportGroupBySchema,
  id: z.string(),
  memberIds: z.array(z.string()),
  memberName: z.string(),
  nonBillableSeconds: z.number().int().min(0),
  projectIds: z.array(z.string()),
  projectName: z.string(),
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

import { z } from "zod";

const dateTimeSchema = z.iso.datetime();

const optionalSearchSchema = z
  .string()
  .trim()
  .max(200)
  .transform((value) => (value === "" ? undefined : value))
  .optional();

// "billable" groups entries by whether they are billable, splitting any level
// into a Billable / Non-billable pair. Unlike project/task/user it is not an
// entity — its identity is the boolean bucket (see timeReportBillableGroupSchema).
export const timeReportGroupBySchema = z.enum([
  "project",
  "task",
  "user",
  "billable",
]);

// Identity of a row grouped on the billable dimension.
export const timeReportBillableGroupSchema = z.enum(["billable", "nonBillable"]);

// Ordered path of 1-4 unique dimensions. Requests carry JSON, so this is an
// array — there is no comma-separated string form to normalize.
export const timeReportGroupByPathSchema = timeReportGroupBySchema
  .array()
  .min(1)
  .max(4)
  .refine((path) => new Set(path).size === path.length, {
    message: "groupBy dimensions must be unique",
  });
export const timeReportSortBySchema = z.enum([
  "project",
  "task",
  "user",
  "totalSeconds",
  "billableSeconds",
  "entryCount",
  "firstStartedAt",
  "lastStartedAt",
]);
export const timeReportSortOrderSchema = z.enum(["asc", "desc"]);

const timeReportFilterShape = {
  dateFrom: dateTimeSchema.optional(),
  dateTo: dateTimeSchema.optional(),
  projectId: z.uuid().optional(),
  userId: z.uuid().optional(),
  groupBy: timeReportGroupByPathSchema.default(["project"]),
  search: optionalSearchSchema,
  sortBy: timeReportSortBySchema.default("totalSeconds"),
  sortOrder: timeReportSortOrderSchema.default("desc"),
};

function isValidDateRange(data: { dateFrom?: string; dateTo?: string }): boolean {
  return (
    data.dateFrom === undefined ||
    data.dateTo === undefined ||
    new Date(data.dateTo).getTime() > new Date(data.dateFrom).getTime()
  );
}

/**
 * Report request body.
 *
 * Reports are requested with a JSON body of named properties, so numbers
 * arrive as numbers (no string coercion) and `.strict()` rejects any property
 * outside this contract instead of ignoring it.
 */
export const timeReportRequestSchema = z
  .object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    ...timeReportFilterShape,
  })
  .strict()
  .refine(isValidDateRange, {
    message: "dateTo must be later than dateFrom",
    path: ["dateTo"],
  });

export const timeReportExportFormatSchema = z.enum(["csv", "pdf"]);

/**
 * Export request body.
 *
 * The export is a POST with a JSON body rather than a query string: the
 * request is a structured set of named properties, each validated here, and
 * `.strict()` rejects anything not on this list instead of silently ignoring
 * it. It also keeps report filters out of URLs, proxy logs, and browser
 * history.
 */
export const timeReportExportRequestSchema = z
  .object({
    ...timeReportFilterShape,
    format: timeReportExportFormatSchema.default("csv"),
  })
  .strict()
  .refine(isValidDateRange, {
    message: "dateTo must be later than dateFrom",
    path: ["dateTo"],
  });

export const timeReportProjectSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

export const timeReportTaskSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
});

export const timeReportUserSummarySchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export const timeReportTotalsSchema = z.object({
  totalSeconds: z.number().int().min(0),
  billableSeconds: z.number().int().min(0),
  nonBillableSeconds: z.number().int().min(0),
  entryCount: z.number().int().min(0),
  billableShare: z.number().min(0).max(1).nullable(),
});

const aggregateTimingSchema = timeReportTotalsSchema.extend({
  firstStartedAt: dateTimeSchema.nullable(),
  lastStartedAt: dateTimeSchema.nullable(),
});

// Unified row: identity objects are populated for exactly the dimensions on
// the requested grouping path (task identity always brings its project).
export const timeReportRowSchema = aggregateTimingSchema.extend({
  project: timeReportProjectSummarySchema.nullable(),
  task: timeReportTaskSummarySchema.nullable(),
  user: timeReportUserSummarySchema.nullable(),
  // Populated only when the grouping path includes the billable dimension.
  billable: timeReportBillableGroupSchema.nullable(),
});

export const timeReportListMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const timeReportEffectiveDateRangeSchema = z.object({
  dateFrom: dateTimeSchema,
  dateTo: dateTimeSchema,
});

export const timeReportResponseSchema = z.object({
  groupBy: timeReportGroupBySchema.array(),
  dateRange: timeReportEffectiveDateRangeSchema,
  summary: timeReportTotalsSchema,
  items: z.array(timeReportRowSchema),
  meta: timeReportListMetaSchema,
});

export type TimeReportGroupBy = z.infer<typeof timeReportGroupBySchema>;
export type TimeReportBillableGroup = z.infer<
  typeof timeReportBillableGroupSchema
>;
export type TimeReportGroupByPath = z.infer<typeof timeReportGroupByPathSchema>;
export type TimeReportExportFormat = z.infer<
  typeof timeReportExportFormatSchema
>;
export type TimeReportSortBy = z.infer<typeof timeReportSortBySchema>;
export type TimeReportSortOrder = z.infer<typeof timeReportSortOrderSchema>;
export type TimeReportRequest = z.infer<typeof timeReportRequestSchema>;
export type TimeReportExportRequest = z.infer<
  typeof timeReportExportRequestSchema
>;
export type TimeReportProjectSummary = z.infer<
  typeof timeReportProjectSummarySchema
>;
export type TimeReportTaskSummary = z.infer<
  typeof timeReportTaskSummarySchema
>;
export type TimeReportUserSummary = z.infer<
  typeof timeReportUserSummarySchema
>;
export type TimeReportTotals = z.infer<typeof timeReportTotalsSchema>;
export type TimeReportRow = z.infer<typeof timeReportRowSchema>;
export type TimeReportListMeta = z.infer<typeof timeReportListMetaSchema>;
export type TimeReportEffectiveDateRange = z.infer<
  typeof timeReportEffectiveDateRangeSchema
>;
export type TimeReportResponse = z.infer<typeof timeReportResponseSchema>;

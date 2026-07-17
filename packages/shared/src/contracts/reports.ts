import { z } from "zod";

const dateTimeSchema = z.iso.datetime();

const optionalSearchSchema = z
  .string()
  .trim()
  .max(200)
  .transform((value) => (value === "" ? undefined : value))
  .optional();

export const timeReportGroupBySchema = z.enum(["project", "task", "user"]);

// Accepts the query-string form ("project,user") and the array form, and
// normalizes both to an ordered path of 1-4 unique dimensions.
export const timeReportGroupByPathSchema = z
  .union([timeReportGroupBySchema.array(), z.string()])
  .transform((value) =>
    typeof value === "string"
      ? value.split(",").map((item) => item.trim())
      : value,
  )
  .pipe(
    timeReportGroupBySchema
      .array()
      .min(1)
      .max(4)
      .refine((path) => new Set(path).size === path.length, {
        message: "groupBy dimensions must be unique",
      }),
  );
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

export const timeReportQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    ...timeReportFilterShape,
  })
  .strict()
  .refine(isValidDateRange, {
    message: "dateTo must be later than dateFrom",
    path: ["dateTo"],
  });

export const timeReportExportFormatSchema = z.enum(["csv", "pdf"]);

export const timeReportExportQuerySchema = z
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
export type TimeReportGroupByPath = z.infer<typeof timeReportGroupByPathSchema>;
export type TimeReportExportFormat = z.infer<
  typeof timeReportExportFormatSchema
>;
export type TimeReportSortBy = z.infer<typeof timeReportSortBySchema>;
export type TimeReportSortOrder = z.infer<typeof timeReportSortOrderSchema>;
export type TimeReportQuery = z.infer<typeof timeReportQuerySchema>;
export type TimeReportExportQuery = z.infer<
  typeof timeReportExportQuerySchema
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

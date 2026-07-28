import { z } from "zod";
import { isOrderedDateRange } from "./date-range.js";
import { timeReportGroupByPathSchema } from "./reports.js";

/**
 * Saved report presets: a named snapshot of the reports page view, shared
 * across a workspace.
 *
 * The config is stored as one JSON column, so it is deliberately tolerant
 * (see the change design, D3): unknown keys are stripped and missing keys take
 * their default, which lets a preset saved before a new filter existed keep
 * parsing. Values that ARE present are validated strictly, so a bad grouping
 * dimension is still rejected.
 */
export const savedReportDateRangeSchema = z
  .object({
    kind: z.literal("absolute"),
    dateFrom: z.iso.datetime(),
    dateTo: z.iso.datetime(),
  })
  // `>=`, not `>`: the reports page treats a single-day window (dateFrom equals
  // dateTo) as valid — the fetch widens dateTo to the next day itself — so an
  // equal window must round-trip through a preset. A strict `>` would reject the
  // default range on the first of a month, where it collapses to one day.
  .refine((range) => isOrderedDateRange(range, { inclusive: true }), {
    message: "dateTo must not be earlier than dateFrom",
    path: ["dateTo"],
  });

// Column-filter vocabularies. Defined here so the API, the admin client, and
// the stored config all validate against one definition.
export const savedReportHoursFilterSchema = z.enum([
  "any",
  "gt0",
  "gte8",
  "gte40",
]);
export const savedReportBillableFilterSchema = z.enum([
  "any",
  "withBillable",
  "withoutBillable",
]);
export const savedReportBillableShareFilterSchema = z.enum([
  "any",
  "below50",
  "gte50",
  "gte90",
]);
export const savedReportActivityFilterSchema = z.enum([
  "any",
  "today",
  "last7",
  "last30",
]);

export const savedReportFiltersSchema = z.object({
  activity: savedReportActivityFilterSchema.default("any"),
  billable: savedReportBillableFilterSchema.default("any"),
  billableShare: savedReportBillableShareFilterSchema.default("any"),
  global: z.string().trim().max(200).default(""),
  hours: savedReportHoursFilterSchema.default("any"),
});

export const savedReportConfigSchema = z.object({
  dateRange: savedReportDateRangeSchema,
  filters: savedReportFiltersSchema.default(() =>
    savedReportFiltersSchema.parse({}),
  ),
  grouping: timeReportGroupByPathSchema.default(["project"]),
  memberId: z.uuid().nullable().default(null),
  projectId: z.uuid().nullable().default(null),
});

export const savedReportNameSchema = z.string().trim().min(1).max(120);

export const savedReportSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  config: savedReportConfigSchema,
  createdBy: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const savedReportListResponseSchema = z.array(savedReportSchema);

export const createSavedReportSchema = z
  .object({
    name: savedReportNameSchema,
    config: savedReportConfigSchema,
  })
  .strict();

export const updateSavedReportSchema = z
  .object({
    name: savedReportNameSchema.optional(),
    config: savedReportConfigSchema.optional(),
  })
  .strict()
  .refine((value) => value.name !== undefined || value.config !== undefined, {
    message: "Provide a name, a config, or both",
  });

export type SavedReportDateRange = z.infer<typeof savedReportDateRangeSchema>;
export type SavedReportHoursFilter = z.infer<
  typeof savedReportHoursFilterSchema
>;
export type SavedReportBillableFilter = z.infer<
  typeof savedReportBillableFilterSchema
>;
export type SavedReportBillableShareFilter = z.infer<
  typeof savedReportBillableShareFilterSchema
>;
export type SavedReportActivityFilter = z.infer<
  typeof savedReportActivityFilterSchema
>;
export type SavedReportFilters = z.infer<typeof savedReportFiltersSchema>;
export type SavedReportConfig = z.infer<typeof savedReportConfigSchema>;
export type SavedReport = z.infer<typeof savedReportSchema>;
export type SavedReportListResponse = z.infer<
  typeof savedReportListResponseSchema
>;
export type CreateSavedReportInput = z.infer<typeof createSavedReportSchema>;
export type UpdateSavedReportInput = z.infer<typeof updateSavedReportSchema>;

import { z } from "zod";
import { timeReportGroupByPathSchema } from "./reports.js";

/**
 * Saved report presets: a named snapshot of the reports page view, shared
 * across a workspace.
 *
 * The config has two schema variants (see the change design, D3). The transport
 * variant (`savedReportConfigSchema`, used by the create/update requests) is
 * strict: a value outside a filter's current vocabulary is a validation error,
 * so a client cannot save a preset with an unknown filter and have it silently
 * become the neutral choice. The stored variant (`storedSavedReportConfigSchema`,
 * used only at the persistence-read boundary) is tolerant: such a value degrades
 * to the neutral choice via `.catch` instead of throwing, so a preset saved
 * against an older contract keeps loading. Both keep the structural parts — the
 * grouping path and the date range — strict, so a genuinely broken config is
 * always rejected (and, on read, skipped rather than failing the whole list).
 */
export const savedReportDateRangeSchema = z
  .object({
    kind: z.literal("absolute"),
    dateFrom: z.iso.datetime(),
    dateTo: z.iso.datetime(),
  })
  // Inclusive: a single-day window (dateTo === dateFrom) is legitimate — the
  // reports date picker allows it and migration 0017 can emit it on a month or
  // week boundary. Only a truly inverted range (dateTo < dateFrom) is rejected.
  .refine(
    (range) =>
      new Date(range.dateTo).getTime() >= new Date(range.dateFrom).getTime(),
    { message: "dateTo must not be before dateFrom", path: ["dateTo"] },
  );

// Column-filter vocabularies. Defined here so the API, the admin client, and
// the stored config all validate against one definition.
export const savedReportHoursFilterSchema = z.enum([
  "any",
  "gt0",
  "gte8",
  "gte40",
]);
export const savedReportBillableFilterSchema = z.enum(["any", "gte8", "gte40"]);
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

// Strict transport filters (create/update requests). A missing key still
// defaults to the neutral choice via `.default`, but a present value outside the
// vocabulary is a validation error — a client cannot smuggle a retired/unknown
// filter into a write and have it silently coerced to the neutral choice.
export const savedReportFiltersSchema = z.object({
  activity: savedReportActivityFilterSchema.default("any"),
  billable: savedReportBillableFilterSchema.default("any"),
  billableShare: savedReportBillableShareFilterSchema.default("any"),
  global: z.string().trim().max(200).default(""),
  hours: savedReportHoursFilterSchema.default("any"),
});

// Tolerant persistence-read filters. `.catch` (never `.default`) so a stored
// value that no longer belongs to a filter's vocabulary — e.g. the retired
// withBillable/withoutBillable options — degrades to the neutral choice instead
// of throwing on read. This variant lives ONLY behind the read boundary, so it
// can never weaken the strict write contract above.
export const storedSavedReportFiltersSchema = z.object({
  activity: savedReportActivityFilterSchema.catch("any"),
  billable: savedReportBillableFilterSchema.catch("any"),
  billableShare: savedReportBillableShareFilterSchema.catch("any"),
  global: z.string().trim().max(200).catch(""),
  hours: savedReportHoursFilterSchema.catch("any"),
});

// Strict config for create/update transport (see the module comment).
export const savedReportConfigSchema = z.object({
  dateRange: savedReportDateRangeSchema,
  filters: savedReportFiltersSchema.default(() =>
    savedReportFiltersSchema.parse({}),
  ),
  grouping: timeReportGroupByPathSchema.default(["project"]),
  memberId: z.uuid().nullable().default(null),
  projectId: z.uuid().nullable().default(null),
});

// Tolerant config for the persistence-read boundary. Structurally identical to
// the transport schema above; only the column filters differ — they degrade a
// retired value instead of rejecting it — so a preset saved against an older
// contract keeps loading.
export const storedSavedReportConfigSchema = z.object({
  dateRange: savedReportDateRangeSchema,
  filters: storedSavedReportFiltersSchema.default(() =>
    storedSavedReportFiltersSchema.parse({}),
  ),
  grouping: timeReportGroupByPathSchema.default(["project"]),
  memberId: z.uuid().nullable().default(null),
  projectId: z.uuid().nullable().default(null),
});

export const savedReportNameSchema = z.string().trim().min(1).max(120);

export const savedReportSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  // Null when the stored config could not be loaded (a corrupt row that
  // repair could not salvage). The preset is still listed — every workspace
  // preset must be returned — but marked unavailable so it reads as "needs
  // repair" instead of silently vanishing. Writes still require a valid config.
  config: storedSavedReportConfigSchema.nullable(),
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

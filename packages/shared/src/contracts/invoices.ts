import { z } from "zod";

import {
  dateSchema,
  dateTimeSchema,
  optionalSearchSchema,
  paginatedListMetaSchema,
} from "./common.js";

export const invoiceStatusSchema = z.enum(["draft", "sent", "paid"]);

export const invoiceProjectSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

// A compact summary of a time entry linked to an invoice, used in the
// detail response to show what was billed without re-fetching full entry context.
export const invoiceTimeEntrySummarySchema = z.object({
  id: z.uuid(),
  taskId: z.uuid(),
  userId: z.uuid(),
  userName: z.string().nullable(),
  taskName: z.string().nullable(),
  startedAt: dateTimeSchema,
  endedAt: dateTimeSchema,
  durationSeconds: z.number().int().positive(),
  isBillable: z.boolean(),
  description: z.string().nullable(),
});

export const invoiceResponseSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  projectId: z.uuid().nullable(),
  title: z.string(),
  status: invoiceStatusSchema,
  dateFrom: dateSchema,
  dateTo: dateSchema,
  hourlyRate: z.number().nonnegative().max(99999999.99).multipleOf(0.01),
  currency: z.string().length(3).regex(/^[A-Za-z]{3}$/),
  discountPercent: z.number().min(0).max(100).multipleOf(0.01),
  totalHours: z.number().nonnegative().max(99999999.99).multipleOf(0.01),
  totalAmount: z.number().nonnegative().max(9999999999.99).multipleOf(0.01),
  roundingStepMinutes: z.number().int().min(1).max(60),
  notes: z.string().nullable(),
  createdBy: z.uuid(),
  createdByName: z.string().nullable(),
  timeEntryCount: z.number().int().min(0),
  timeEntries: z.array(invoiceTimeEntrySummarySchema),
  project: invoiceProjectSummarySchema.nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const invoiceListItemSchema = invoiceResponseSchema.omit({
  timeEntries: true,
});

export const invoiceListMetaSchema = paginatedListMetaSchema;

export const invoiceListResponseSchema = z.object({
  items: z.array(invoiceListItemSchema),
  meta: invoiceListMetaSchema,
});

// Optional fields so list queries with only one date bound can reuse the
// helper; a range is only checked when both bounds are present.
function isValidInvoiceDateRange(data: {
  dateFrom?: string;
  dateTo?: string;
}): boolean {
  if (data.dateFrom === undefined || data.dateTo === undefined) {
    return true;
  }

  return new Date(data.dateTo).getTime() >= new Date(data.dateFrom).getTime();
}

export const invoiceListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    projectId: z.uuid().optional(),
    status: invoiceStatusSchema.optional(),
    dateFrom: dateSchema.optional(),
    dateTo: dateSchema.optional(),
    search: optionalSearchSchema,
  })
  .strict()
  .refine(
    (data) =>
      data.dateFrom === undefined ||
      data.dateTo === undefined ||
      isValidInvoiceDateRange(data),
    {
      message: "dateTo must be later than or equal to dateFrom",
      path: ["dateTo"],
    },
  );

export const createInvoiceSchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    dateFrom: dateSchema,
    dateTo: dateSchema,
    projectId: z.uuid().optional(),
    hourlyRate: z
      .number()
      .nonnegative()
      .max(99999999.99)
      .multipleOf(0.01)
      .optional(),
    currency: z
      .string()
      .length(3)
      .regex(/^[A-Za-z]{3}$/)
      .transform((c) => c.toUpperCase())
      .optional(),
    discountPercent: z.number().min(0).max(100).multipleOf(0.01).default(0),
    notes: z.string().max(5000).nullable().optional(),
    roundingStepMinutes: z.number().int().min(1).max(60).optional(),
  })
  .strict()
  .refine(isValidInvoiceDateRange, {
    message: "dateTo must be later than or equal to dateFrom",
    path: ["dateTo"],
  });

// Only status, notes, and title are editable after creation. Snapshot fields
// (hourlyRate, currency, discountPercent, totalHours, totalAmount, dateFrom,
// dateTo) and the linked time-entry set are immutable; totals are never
// recomputed by an update.
export const updateInvoiceSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    status: invoiceStatusSchema.optional(),
    notes: z.string().max(5000).nullable().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.status !== undefined ||
      data.notes !== undefined,
    {
      message: "At least one field must be provided",
      path: [],
    },
  );

// Preview of time entries that would be billed if an invoice is created
// with the given project scope and date range. The query mirrors the
// eligibility conditions used by createInvoice but performs no writes.
export const eligibleEntriesQuerySchema = z
  .object({
    projectId: z.uuid().optional(),
    dateFrom: dateSchema,
    dateTo: dateSchema,
    roundingStepMinutes: z.coerce.number().int().min(1).max(60).optional(),
  })
  .strict()
  .refine(isValidInvoiceDateRange, {
    message: "dateTo must be later than or equal to dateFrom",
    path: ["dateTo"],
  });

export const eligibleEntriesResponseSchema = z.object({
  count: z.number().int().min(0),
  totalHours: z.number().nonnegative().max(99999999.99).multipleOf(0.01),
  entries: z.array(invoiceTimeEntrySummarySchema),
  defaultHourlyRate: z.number().nonnegative().nullable(),
  defaultCurrency: z.string().length(3).regex(/^[A-Za-z]{3}$/).nullable(),
  defaultRoundingStepMinutes: z.number().int().min(1).max(60),
});

export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;
export type InvoiceProjectSummary = z.infer<
  typeof invoiceProjectSummarySchema
>;
export type InvoiceTimeEntrySummary = z.infer<
  typeof invoiceTimeEntrySummarySchema
>;
export type InvoiceResponse = z.infer<typeof invoiceResponseSchema>;
export type InvoiceListItem = z.infer<typeof invoiceListItemSchema>;
export type InvoiceListMeta = z.infer<typeof invoiceListMetaSchema>;
export type InvoiceListResponse = z.infer<typeof invoiceListResponseSchema>;
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type EligibleEntriesQuery = z.infer<typeof eligibleEntriesQuerySchema>;
export type EligibleEntriesResponse = z.infer<
  typeof eligibleEntriesResponseSchema
>;

export const invoiceStatsResponseSchema = z.object({
  byStatus: z.object({
    draft: z.number().int().min(0),
    sent: z.number().int().min(0),
    paid: z.number().int().min(0),
  }),
  thisMonth: z.object({
    invoiceCount: z.number().int().min(0),
    projectCount: z.number().int().min(0),
    totalAmount: z.number().nonnegative().max(9999999999.99).multipleOf(0.01),
    currency: z.string().length(3).regex(/^[A-Za-z]{3}$/),
  }),
});

export type InvoiceStatsResponse = z.infer<typeof invoiceStatsResponseSchema>;
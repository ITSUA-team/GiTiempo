import { z } from "zod";

import {
  dateSchema,
  dateTimeSchema,
  optionalSearchSchema,
  paginatedListMetaSchema,
  roundingStepMinutesSchema,
} from "./common.js";

const billingText = z.string().trim().max(5000);
export const invoicePartySchema = z.object({
  name: billingText, address: billingText, email: z.union([z.email(), z.literal("")]), taxId: billingText,
}).strict();
export const invoicePaymentSchema = z.object({
  method: billingText, terms: billingText, beneficiary: billingText, provider: billingText, account: billingText, instructions: billingText,
  swift: billingText.optional(),
  paymentUrl: z.union([z.url({ protocol: /^https$/ }).trim().max(5000), z.literal("")]).optional(),
}).strict();
export const invoiceLogoSchema = z.string().max(341362)
  .regex(/^data:image\/(png|svg\+xml);base64,[A-Za-z0-9+/=]+$/)
  .refine(value => {
    try {
      const svg = atob(value.slice(value.indexOf(",") + 1));
      if (svg.length > 256000) return false;
      if (value.startsWith("data:image/png;base64,")) {
        return svg.startsWith("\x89PNG\r\n\x1a\n") && svg.slice(12, 16) === "IHDR";
      }
      return /^\s*<svg[\s>]/i.test(svg) &&
        !/<[!?]|<(?:script|foreignObject|style|iframe|object|embed|image|use|a|animate|set)\b|\son[a-z]+\s*=|(?:href|src)\s*=|url\s*\(|&(?:#|[a-z])/i.test(svg);
    } catch {
      return false;
    }
  }, "Choose a valid PNG or static SVG logo up to 250 KB, without scripts or external resources")
  .nullable();

export const invoiceBillingProfileSchema = z.object({
  sender: invoicePartySchema,
  payment: invoicePaymentSchema,
  logo: invoiceLogoSchema,
  invoicePrefix: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/),
}).strict();
const distinctEntryIds = z.array(z.uuid()).max(10000).refine(ids => new Set(ids).size === ids.length, "Entry IDs must be distinct");
const invoiceBusinessFields = {
  sender: invoicePartySchema.nullable().optional(),
  recipient: invoicePartySchema.nullable().optional(),
  payment: invoicePaymentSchema.nullable().optional(),
  services: billingText.nullable().optional(),
  logo: invoiceLogoSchema.optional(),
};
export type InvoiceParty = z.infer<typeof invoicePartySchema>;
export type InvoicePayment = z.infer<typeof invoicePaymentSchema>;
export type InvoiceBillingProfile = z.infer<typeof invoiceBillingProfileSchema>;

export const invoiceStatusSchema = z.enum(["draft", "sent", "paid"]);

export const invoiceProjectSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

// A compact summary of a time entry linked to an invoice, used in the
// detail response to show what was billed without re-fetching full entry context.
// `durationSeconds` is the original raw tracked duration; `roundedDurationSeconds`
// is the per-entry ceiling-rounded duration (using the invoice's rounding step)
// that feeds the invoice totals and is what should be displayed to the user.
export const invoiceTimeEntrySummarySchema = z.object({
  id: z.uuid(),
  taskId: z.uuid(),
  userId: z.uuid(),
  userName: z.string().nullable(),
  taskName: z.string().nullable(),
  startedAt: dateTimeSchema,
  endedAt: dateTimeSchema,
  durationSeconds: z.number().int().positive(),
  roundedDurationSeconds: z.number().int().positive(),
  isBillable: z.boolean(),
  description: z.string().nullable(),
});

export const invoiceResponseSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  ...invoiceBusinessFields,
  reference: z.string().optional(),
  revision: z.number().int().nonnegative().optional(),
  groupId: z.uuid().nullable().optional(),
  projectId: z.uuid().nullable(),
  title: z.string(),
  status: invoiceStatusSchema,
  issueDate: dateSchema.optional(),
  dueDate: dateSchema.nullable().optional(),
  dateFrom: dateSchema,
  dateTo: dateSchema,
  hourlyRate: z.number().nonnegative().max(99999999.99).multipleOf(0.01),
  currency: z.string().length(3).regex(/^[A-Za-z]{3}$/),
  discountPercent: z.number().min(0).max(100).multipleOf(0.01),
  totalHours: z.number().nonnegative().max(99999999.99).multipleOf(0.01),
  totalAmount: z.number().nonnegative().max(9999999999.99).multipleOf(0.01),
  roundingStepMinutes: roundingStepMinutesSchema,
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
  sender: true,
  payment: true,
  services: true,
  logo: true,
});

export const invoiceListMetaSchema = paginatedListMetaSchema;

export const invoiceListResponseSchema = z.object({
  items: z.array(invoiceListItemSchema),
  meta: invoiceListMetaSchema,
});

function isValidPaymentDates(data: { issueDate?: string; dueDate?: string | null }): boolean {
  return !data.issueDate || !data.dueDate || data.dueDate >= data.issueDate;
}

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
    groupId: z.union([z.uuid(), z.literal("ungrouped")]).optional(),
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
    ...invoiceBusinessFields,
    timeEntryIds: distinctEntryIds.optional(),
    groupId: z.uuid().nullable().optional(),
    title: z.string().trim().min(1).max(255),
    issueDate: dateSchema.optional(),
    dueDate: dateSchema.nullable().optional(),
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
    roundingStepMinutes: roundingStepMinutesSchema.optional(),
  })
  .strict()
  .refine(isValidPaymentDates, { message: "Due date must be on or after the issue date", path: ["dueDate"] })
  .refine(isValidInvoiceDateRange, {
    message: "dateTo must be later than or equal to dateFrom",
    path: ["dateTo"],
  });

export const updateInvoiceSchema = z.object(createInvoiceSchema.shape).partial().extend({
  discountPercent: z.number().min(0).max(100).multipleOf(0.01).optional(),
  status: invoiceStatusSchema.optional(),
  projectId: z.uuid().nullable().optional(),
  expectedRevision: z.number().int().nonnegative().optional(),
}).strict().refine(isValidPaymentDates, { message: "Due date must be on or after the issue date", path: ["dueDate"] }).refine(data => Object.keys(data).some(key => key !== "expectedRevision"), "At least one field must be provided").refine(isValidInvoiceDateRange, {
  message: "dateTo must be later than or equal to dateFrom", path: ["dateTo"],
});

// Preview of time entries that would be billed if an invoice is created
// with the given project scope and date range. The query mirrors the
// eligibility conditions used by createInvoice but performs no writes.
export const eligibleEntriesQuerySchema = z
  .object({
    invoiceId: z.uuid().optional(),
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
  defaultRoundingStepMinutes: roundingStepMinutesSchema,
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

export const invoiceDefaultsResponseSchema = z.object({
  billingProfile: invoiceBillingProfileSchema.nullable().optional(),
  currency: z.string().length(3).regex(/^[A-Za-z]{3}$/).nullable(),
  defaultHourlyRate: z.number().nonnegative().nullable(),
  timeRoundingStepMinutes: roundingStepMinutesSchema,
});

export type InvoiceDefaultsResponse = z.infer<
  typeof invoiceDefaultsResponseSchema
>;
export const createInvoiceGroupSchema = z.object({ name: z.string().trim().min(1).max(100) }).strict();
export const invoiceGroupSchema = z.object({ id: z.uuid(), name: z.string(), count: z.number().int().nonnegative() });
export const invoiceGroupsResponseSchema = z.object({
  groups: z.array(invoiceGroupSchema), allCount: z.number().int().nonnegative(), ungroupedCount: z.number().int().nonnegative(),
});
export const moveInvoicesSchema = z.object({ invoiceIds: distinctEntryIds.refine(ids => ids.length > 0), groupId: z.uuid().nullable() }).strict();
export const previewInvoiceSchema = z.object(createInvoiceSchema.shape).extend({ invoiceId: z.uuid().optional() }).strict().refine(isValidInvoiceDateRange);
export const previewInvoiceResponseSchema = eligibleEntriesResponseSchema.pick({ count: true, entries: true, totalHours: true }).extend({
  subtotal: z.number().nonnegative(), discountAmount: z.number().nonnegative(), totalAmount: z.number().nonnegative(), currency: z.string(),
});
export type InvoiceGroup = z.infer<typeof invoiceGroupSchema>;
export type InvoiceGroupsResponse = z.infer<typeof invoiceGroupsResponseSchema>;
export type CreateInvoiceGroupInput = z.infer<typeof createInvoiceGroupSchema>;
export type MoveInvoicesInput = z.infer<typeof moveInvoicesSchema>;
export type PreviewInvoiceInput = z.infer<typeof previewInvoiceSchema>;
export type PreviewInvoiceResponse = z.infer<typeof previewInvoiceResponseSchema>;

export const invoiceDocumentIncompleteErrorSchema = z.object({
  code: z.literal("invoice_document_incomplete"),
  message: z.string(),
  details: z.object({ missingFields: z.array(z.enum(["sender", "recipient", "services", "payment"])).min(1) }),
});
export type InvoiceDocumentIncompleteError = z.infer<typeof invoiceDocumentIncompleteErrorSchema>;

export const invoiceLogoInvalidErrorSchema = z.object({
  code: z.literal("invoice_logo_invalid"),
  message: z.string(),
});

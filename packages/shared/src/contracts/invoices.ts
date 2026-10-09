import { z } from "zod";

export const invoiceStatusSchema = z.enum(["draft", "sent", "paid"]);

const dateTimeSchema = z.iso.datetime();
const dateSchema = z.iso.date();

const invoiceProjectSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

const invoiceCreatorSummarySchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export const invoiceResponseSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  projectId: z.uuid().nullable(),
  title: z.string(),
  status: invoiceStatusSchema,
  dateFrom: dateSchema,
  dateTo: dateSchema,
  hourlyRate: z.number(),
  currency: z.string().min(3).max(3),
  discountPercent: z.number(),
  totalHours: z.number(),
  totalAmount: z.number(),
  notes: z.string().nullable(),
  createdBy: z.uuid(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  project: invoiceProjectSummarySchema.nullable(),
  createdByUser: invoiceCreatorSummarySchema,
  timeEntryCount: z.number().int().min(0),
});

export const invoiceListMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const invoiceListResponseSchema = z.object({
  items: z.array(invoiceResponseSchema),
  meta: invoiceListMetaSchema,
});

export const invoiceListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    projectId: z.uuid().optional(),
    status: invoiceStatusSchema.optional(),
  })
  .strict();

export const createInvoiceSchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    projectId: z.uuid().optional(),
    dateFrom: dateSchema,
    dateTo: dateSchema,
    hourlyRate: z.number().positive().max(1_000_000).optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    notes: z.string().max(5000).nullable().optional(),
  })
  .strict()
  .refine(
    (data) => new Date(data.dateTo) >= new Date(data.dateFrom),
    {
      message: "dateTo must be on or after dateFrom",
      path: ["dateTo"],
    },
  );

export const updateInvoiceSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    status: invoiceStatusSchema.optional(),
    hourlyRate: z.number().positive().max(1_000_000).optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    currency: z.string().min(3).max(3).optional(),
    notes: z.string().max(5000).nullable().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.status !== undefined ||
      data.hourlyRate !== undefined ||
      data.discountPercent !== undefined ||
      data.currency !== undefined ||
      data.notes !== undefined,
    {
      message: "At least one field must be provided",
      path: [],
    },
  );

export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;
export type InvoiceResponse = z.infer<typeof invoiceResponseSchema>;
export type InvoiceListResponse = z.infer<typeof invoiceListResponseSchema>;
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
import { describe, expect, it } from "vitest";

import {
  createInvoiceSchema,
  invoiceListQuerySchema,
  invoiceListResponseSchema,
  invoiceResponseSchema,
  invoiceStatusSchema,
  updateInvoiceSchema,
} from "./invoices.js";

const validInvoiceResponse = {
  id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9010",
  workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
  projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9005",
  title: "Invoice 2026-04",
  status: "draft",
  dateFrom: "2026-04-01",
  dateTo: "2026-04-30",
  hourlyRate: 75,
  currency: "USD",
  discountPercent: 0,
  totalHours: 10,
  totalAmount: 750,
  notes: null,
  createdBy: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
  timeEntryCount: 1,
  timeEntries: [
    {
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9020",
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
      userId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
      startedAt: "2026-04-21T09:00:00.000Z",
      endedAt: "2026-04-21T11:00:00.000Z",
      durationSeconds: 7200,
      isBillable: true,
      description: null,
    },
  ],
  project: { id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9005", name: "Project Orion" },
  createdAt: "2026-04-30T18:00:00.000Z",
  updatedAt: "2026-04-30T18:00:00.000Z",
};

describe("invoiceStatusSchema", () => {
  it("accepts draft, sent, paid", () => {
    expect(invoiceStatusSchema.parse("draft")).toBe("draft");
    expect(invoiceStatusSchema.parse("sent")).toBe("sent");
    expect(invoiceStatusSchema.parse("paid")).toBe("paid");
  });

  it("rejects unknown status values", () => {
    expect(invoiceStatusSchema.safeParse("cancelled").success).toBe(false);
  });
});

describe("invoiceResponseSchema", () => {
  it("accepts a complete invoice with a linked project and entries", () => {
    const result = invoiceResponseSchema.parse(validInvoiceResponse);

    expect(result.status).toBe("draft");
    expect(result.project?.name).toBe("Project Orion");
    expect(result.timeEntries).toHaveLength(1);
  });

  it("accepts an invoice with a null project scope", () => {
    const result = invoiceResponseSchema.parse({
      ...validInvoiceResponse,
      projectId: null,
      project: null,
    });

    expect(result.project).toBeNull();
  });

  it("detail response includes timeEntries", () => {
    const result = invoiceResponseSchema.parse(validInvoiceResponse);

    expect(Array.isArray(result.timeEntries)).toBe(true);
  });

  it("rejects a negative totalHours", () => {
    const result = invoiceResponseSchema.safeParse({
      ...validInvoiceResponse,
      totalHours: -1,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["totalHours"]);
  });

  it("rejects a negative totalAmount by one cent", () => {
    const result = invoiceResponseSchema.safeParse({
      ...validInvoiceResponse,
      totalAmount: -0.01,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["totalAmount"]);
  });

  it("rejects an hourly rate over the snapshot max", () => {
    const result = invoiceResponseSchema.safeParse({
      ...validInvoiceResponse,
      hourlyRate: 100000000,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["hourlyRate"]);
  });

  it("rejects a negative timeEntryCount", () => {
    const result = invoiceResponseSchema.safeParse({
      ...validInvoiceResponse,
      timeEntryCount: -1,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["timeEntryCount"]);
  });

  it("accepts a 100 percent discount at the upper boundary", () => {
    const result = invoiceResponseSchema.parse({
      ...validInvoiceResponse,
      discountPercent: 100,
      totalAmount: 0,
    });

    expect(result.discountPercent).toBe(100);
  });

  it("rejects a discount just over 100", () => {
    const result = invoiceResponseSchema.safeParse({
      ...validInvoiceResponse,
      discountPercent: 100.01,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["discountPercent"]);
  });

  // Unlike createInvoiceSchema, the response contract has no uppercase
  // transform; the regex alone decides casing, so lowercase is accepted.
  it("accepts lowercase currency as stored", () => {
    const result = invoiceResponseSchema.parse({
      ...validInvoiceResponse,
      currency: "usd",
    });

    expect(result.currency).toBe("usd");
  });

  it("rejects a non-alphabetic currency", () => {
    const result = invoiceResponseSchema.safeParse({
      ...validInvoiceResponse,
      currency: "US1",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["currency"]);
  });
});

describe("invoiceListResponseSchema", () => {
  it("list response items do not include timeEntries", () => {
    const result = invoiceListResponseSchema.parse({
      items: [{ ...validInvoiceResponse, timeEntries: undefined }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    expect(result.items).toHaveLength(1);
    expect(Object.hasOwn(result.items[0] ?? {}, "timeEntries")).toBe(false);
  });

  // invoiceListItemSchema is a non-strict omit shape: a supplied timeEntries
  // key is stripped rather than rejected.
  it("strips a provided timeEntries array from list items", () => {
    const result = invoiceListResponseSchema.parse({
      items: [{ ...validInvoiceResponse, timeEntries: [] }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    expect(result.items).toHaveLength(1);
    expect(Object.hasOwn(result.items[0] ?? {}, "timeEntries")).toBe(false);
  });

  it("accepts an empty items array", () => {
    const result = invoiceListResponseSchema.parse({
      items: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    expect(result.items).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it("accepts meta with totalPages of 0", () => {
    const result = invoiceListResponseSchema.parse({
      items: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    expect(result.meta.totalPages).toBe(0);
  });
});

describe("createInvoiceSchema", () => {
  const validCreate = {
    title: "Invoice 2026-04",
    dateFrom: "2026-04-01",
    dateTo: "2026-04-30",
  };

  it("accepts a minimal create payload and defaults discount to 0", () => {
    const result = createInvoiceSchema.parse(validCreate);

    expect(result.discountPercent).toBe(0);
    expect(result.hourlyRate).toBeUndefined();
  });

  it("accepts an optional hourly rate, currency, discount, and notes", () => {
    const result = createInvoiceSchema.parse({
      ...validCreate,
      hourlyRate: 80,
      currency: "EUR",
      discountPercent: 10,
      notes: "Net 30",
    });

    expect(result.hourlyRate).toBe(80);
    expect(result.currency).toBe("EUR");
    expect(result.discountPercent).toBe(10);
  });

  it("rejects a discount over 100", () => {
    const result = createInvoiceSchema.safeParse({
      ...validCreate,
      discountPercent: 150,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["discountPercent"]);
  });

  it("rejects an unknown property", () => {
    const result = createInvoiceSchema.safeParse({
      ...validCreate,
      unknown: true,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("Unrecognized key");
  });

  it("rejects dateTo before dateFrom", () => {
    const result = createInvoiceSchema.safeParse({
      ...validCreate,
      dateFrom: "2026-04-30",
      dateTo: "2026-04-01",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["dateTo"]);
  });

  it("rejects a negative hourly rate", () => {
    const result = createInvoiceSchema.safeParse({
      ...validCreate,
      hourlyRate: -1,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["hourlyRate"]);
  });

  it("rejects a currency with wrong length", () => {
    expect(
      createInvoiceSchema.safeParse({ ...validCreate, currency: "US" }).success,
    ).toBe(false);
    expect(
      createInvoiceSchema.safeParse({ ...validCreate, currency: "USDD" })
        .success,
    ).toBe(false);
  });

  it("rejects an empty title", () => {
    const result = createInvoiceSchema.safeParse({
      ...validCreate,
      title: "",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["title"]);
  });

  it("accepts notes as null", () => {
    const result = createInvoiceSchema.parse({ ...validCreate, notes: null });

    expect(result.notes).toBeNull();
  });

  it("normalizes currency to uppercase", () => {
    const result = createInvoiceSchema.parse({
      ...validCreate,
      currency: "eur",
    });

    expect(result.currency).toBe("EUR");
  });

  it("accepts hourlyRate 0 for free invoicing", () => {
    const result = createInvoiceSchema.parse({ ...validCreate, hourlyRate: 0 });

    expect(result.hourlyRate).toBe(0);
  });

  it("accepts hourlyRate at the 99999999.99 max boundary", () => {
    const result = createInvoiceSchema.parse({
      ...validCreate,
      hourlyRate: 99999999.99,
    });

    expect(result.hourlyRate).toBe(99999999.99);
  });

  it("accepts hourlyRate with exactly two decimal places", () => {
    const result = createInvoiceSchema.parse({
      ...validCreate,
      hourlyRate: 75.99,
    });

    expect(result.hourlyRate).toBe(75.99);
  });

  it("rejects hourlyRate with a third decimal place", () => {
    const result = createInvoiceSchema.safeParse({
      ...validCreate,
      hourlyRate: 75.999,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["hourlyRate"]);
  });

  it("rejects hourlyRate over the max", () => {
    const result = createInvoiceSchema.safeParse({
      ...validCreate,
      hourlyRate: 100000000,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["hourlyRate"]);
  });

  it("accepts discountPercent boundaries of 0 and 100", () => {
    const zero = createInvoiceSchema.parse({
      ...validCreate,
      discountPercent: 0,
    });
    const full = createInvoiceSchema.parse({
      ...validCreate,
      discountPercent: 100,
    });

    expect(zero.discountPercent).toBe(0);
    expect(full.discountPercent).toBe(100);
  });

  it("rejects a discount just over 100", () => {
    const result = createInvoiceSchema.safeParse({
      ...validCreate,
      discountPercent: 100.01,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["discountPercent"]);
  });

  it("rejects a non-alphabetic currency", () => {
    expect(
      createInvoiceSchema.safeParse({ ...validCreate, currency: "US1" })
        .success,
    ).toBe(false);
  });

  it("rejects a one-character currency", () => {
    expect(
      createInvoiceSchema.safeParse({ ...validCreate, currency: "u" }).success,
    ).toBe(false);
  });

  it("accepts a title of exactly 255 characters", () => {
    const result = createInvoiceSchema.parse({
      ...validCreate,
      title: "x".repeat(255),
    });

    expect(result.title).toHaveLength(255);
  });

  it("rejects a title of 256 characters", () => {
    const result = createInvoiceSchema.safeParse({
      ...validCreate,
      title: "x".repeat(256),
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["title"]);
  });

  it("rejects a title made only of spaces", () => {
    const result = createInvoiceSchema.safeParse({
      ...validCreate,
      title: "   ",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["title"]);
  });

  it("accepts notes with exactly 5000 characters", () => {
    const result = createInvoiceSchema.parse({
      ...validCreate,
      notes: "x".repeat(5000),
    });

    expect(result.notes).toHaveLength(5000);
  });

  it("rejects notes over 5000 characters", () => {
    const result = createInvoiceSchema.safeParse({
      ...validCreate,
      notes: "x".repeat(5001),
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["notes"]);
  });

  it("accepts dateTo equal to dateFrom", () => {
    const result = createInvoiceSchema.parse({
      ...validCreate,
      dateFrom: "2026-04-21",
      dateTo: "2026-04-21",
    });

    expect(result.dateTo).toBe("2026-04-21");
  });

  it("rejects an invalid projectId", () => {
    const result = createInvoiceSchema.safeParse({
      ...validCreate,
      projectId: "not-a-uuid",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["projectId"]);
  });

  it("rejects a missing title", () => {
    const result = createInvoiceSchema.safeParse({
      dateFrom: validCreate.dateFrom,
      dateTo: validCreate.dateTo,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["title"]);
  });

  it("rejects a missing dateFrom", () => {
    const result = createInvoiceSchema.safeParse({
      title: validCreate.title,
      dateTo: validCreate.dateTo,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["dateFrom"]);
  });
});

describe("updateInvoiceSchema", () => {
  it("accepts a status update", () => {
    const result = updateInvoiceSchema.parse({ status: "sent" });

    expect(result.status).toBe("sent");
  });

  it("accepts a notes update", () => {
    const result = updateInvoiceSchema.parse({ notes: "Paid via wire" });

    expect(result.notes).toBe("Paid via wire");
  });

  it("accepts a title-only update", () => {
    const result = updateInvoiceSchema.parse({ title: "New Title" });

    expect(result.title).toBe("New Title");
  });

  it("rejects snapshot total fields", () => {
    const result = updateInvoiceSchema.safeParse({ totalAmount: 999 });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("Unrecognized key");
  });

  it("rejects hourly rate mutation", () => {
    const result = updateInvoiceSchema.safeParse({ hourlyRate: 100 });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("Unrecognized key");
  });

  it("requires at least one field", () => {
    const result = updateInvoiceSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("rejects unknown fields", () => {
    const result = updateInvoiceSchema.safeParse({ unknown: true, status: "paid" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("Unrecognized key");
  });

  it("accepts title, status, and notes together", () => {
    const result = updateInvoiceSchema.parse({
      title: "Retitle",
      status: "paid",
      notes: "Closed",
    });

    expect(result.title).toBe("Retitle");
    expect(result.status).toBe("paid");
    expect(result.notes).toBe("Closed");
  });

  it("accepts notes as null to clear them", () => {
    const result = updateInvoiceSchema.parse({ notes: null });

    expect(result.notes).toBeNull();
  });

  it("rejects a title made only of spaces", () => {
    const result = updateInvoiceSchema.safeParse({ title: "   " });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["title"]);
  });

  it("rejects an unknown status value", () => {
    const result = updateInvoiceSchema.safeParse({ status: "cancelled" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["status"]);
  });

  it("rejects discountPercent edits after creation", () => {
    const result = updateInvoiceSchema.safeParse({ discountPercent: 10 });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("Unrecognized key");
  });
});

describe("invoiceListQuerySchema", () => {
  it("coerces page and limit and applies defaults", () => {
    const result = invoiceListQuerySchema.parse({});

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("accepts project, status, and date filters", () => {
    const result = invoiceListQuerySchema.parse({
      projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9005",
      status: "paid",
      dateFrom: "2026-04-01",
      dateTo: "2026-04-30",
    });

    expect(result.status).toBe("paid");
  });

  it("rejects dateTo before dateFrom", () => {
    const result = invoiceListQuerySchema.safeParse({
      dateFrom: "2026-04-30",
      dateTo: "2026-04-01",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown query parameters", () => {
    const result = invoiceListQuerySchema.safeParse({ unknown: true });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("Unrecognized key");
  });

  it("rejects a page below 1", () => {
    const zero = invoiceListQuerySchema.safeParse({ page: 0 });

    expect(zero.success).toBe(false);
    expect(zero.error?.issues[0]?.path).toEqual(["page"]);

    const negative = invoiceListQuerySchema.safeParse({ page: -1 });

    expect(negative.success).toBe(false);
    expect(negative.error?.issues[0]?.path).toEqual(["page"]);
  });

  it("rejects a limit below 1 and above 100", () => {
    const zero = invoiceListQuerySchema.safeParse({ limit: 0 });

    expect(zero.success).toBe(false);
    expect(zero.error?.issues[0]?.path).toEqual(["limit"]);

    const over = invoiceListQuerySchema.safeParse({ limit: 101 });

    expect(over.success).toBe(false);
    expect(over.error?.issues[0]?.path).toEqual(["limit"]);
  });

  it("accepts a limit of 100 at the boundary", () => {
    const result = invoiceListQuerySchema.parse({ limit: 100 });

    expect(result.limit).toBe(100);
  });

  it("coerces numeric query params from strings", () => {
    const result = invoiceListQuerySchema.parse({ page: "5", limit: "50" });

    expect(result.page).toBe(5);
    expect(result.limit).toBe(50);
  });

  it("transforms an empty search into undefined and trims whitespace", () => {
    const empty = invoiceListQuerySchema.parse({ search: "" });

    expect(empty.search).toBeUndefined();

    const padded = invoiceListQuerySchema.parse({ search: "  orion  " });

    expect(padded.search).toBe("orion");
  });

  it("accepts a search of exactly 200 characters", () => {
    const result = invoiceListQuerySchema.parse({ search: "a".repeat(200) });

    expect(result.search).toHaveLength(200);
  });

  it("rejects a search over 200 characters", () => {
    const result = invoiceListQuerySchema.safeParse({
      search: "a".repeat(201),
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["search"]);
  });

  it("rejects an unknown status filter", () => {
    const result = invoiceListQuerySchema.safeParse({ status: "invalid" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["status"]);
  });

  it("rejects an invalid projectId filter", () => {
    const result = invoiceListQuerySchema.safeParse({ projectId: "not-a-uuid" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["projectId"]);
  });

  it("accepts dateTo equal to dateFrom", () => {
    const result = invoiceListQuerySchema.parse({
      dateFrom: "2026-04-21",
      dateTo: "2026-04-21",
    });

    expect(result.dateTo).toBe("2026-04-21");
  });
});
import { describe, expect, it } from "vitest";

import {
  createInvoiceSchema,
  invoiceListQuerySchema,
  invoiceResponseSchema,
  invoiceStatusSchema,
  updateInvoiceSchema,
} from "./invoices.js";

const validUuid = "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001";

const validInvoiceResponse = {
  id: validUuid,
  workspaceId: validUuid,
  projectId: validUuid,
  title: "March 2027 Invoice",
  status: "draft",
  dateFrom: "2027-03-01",
  dateTo: "2027-03-31",
  hourlyRate: 75,
  currency: "USD",
  discountPercent: 10,
  totalHours: 40,
  totalAmount: 2700,
  notes: "Net 30",
  createdBy: validUuid,
  createdAt: "2027-04-01T10:00:00.000Z",
  updatedAt: "2027-04-01T10:00:00.000Z",
  project: { id: validUuid, name: "Demo Client" },
  createdByUser: {
    id: validUuid,
    email: "admin@example.com",
    displayName: "Admin",
    avatarUrl: null,
  },
  timeEntryCount: 5,
};

describe("invoiceStatusSchema", () => {
  it("accepts draft, sent, paid", () => {
    expect(invoiceStatusSchema.parse("draft")).toBe("draft");
    expect(invoiceStatusSchema.parse("sent")).toBe("sent");
    expect(invoiceStatusSchema.parse("paid")).toBe("paid");
  });

  it("rejects unknown statuses", () => {
    expect(invoiceStatusSchema.safeParse("cancelled").success).toBe(false);
  });
});

describe("invoiceResponseSchema", () => {
  it("accepts a full invoice with project and creator", () => {
    const result = invoiceResponseSchema.parse(validInvoiceResponse);
    expect(result.status).toBe("draft");
    expect(result.project?.name).toBe("Demo Client");
    expect(result.timeEntryCount).toBe(5);
  });

  it("accepts a null project", () => {
    const result = invoiceResponseSchema.parse({
      ...validInvoiceResponse,
      projectId: null,
      project: null,
    });
    expect(result.project).toBeNull();
  });
});

describe("createInvoiceSchema", () => {
  const validCreate = {
    title: "March Invoice",
    dateFrom: "2027-03-01",
    dateTo: "2027-03-31",
  };

  it("accepts a minimal create payload", () => {
    const result = createInvoiceSchema.parse(validCreate);
    expect(result.title).toBe("March Invoice");
    expect(result.hourlyRate).toBeUndefined();
    expect(result.discountPercent).toBeUndefined();
  });

  it("accepts a full create payload with projectId and hourlyRate", () => {
    const result = createInvoiceSchema.parse({
      ...validCreate,
      projectId: validUuid,
      hourlyRate: 100,
      discountPercent: 15,
      notes: "Some notes",
    });
    expect(result.projectId).toBe(validUuid);
    expect(result.hourlyRate).toBe(100);
  });

  it("rejects dateTo before dateFrom", () => {
    const result = createInvoiceSchema.safeParse({
      ...validCreate,
      dateFrom: "2027-03-31",
      dateTo: "2027-03-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields", () => {
    const result = createInvoiceSchema.safeParse({
      ...validCreate,
      unknown: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = createInvoiceSchema.safeParse({
      ...validCreate,
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative hourlyRate", () => {
    const result = createInvoiceSchema.safeParse({
      ...validCreate,
      hourlyRate: -10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects discountPercent over 100", () => {
    const result = createInvoiceSchema.safeParse({
      ...validCreate,
      discountPercent: 101,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateInvoiceSchema", () => {
  it("accepts a status-only update", () => {
    const result = updateInvoiceSchema.parse({ status: "sent" });
    expect(result.status).toBe("sent");
  });

  it("accepts a notes-only update", () => {
    const result = updateInvoiceSchema.parse({ notes: "Updated notes" });
    expect(result.notes).toBe("Updated notes");
  });

  it("accepts null notes", () => {
    const result = updateInvoiceSchema.parse({ notes: null });
    expect(result.notes).toBeNull();
  });

  it("accepts rate and discount updates", () => {
    const result = updateInvoiceSchema.parse({
      hourlyRate: 90,
      discountPercent: 5,
    });
    expect(result.hourlyRate).toBe(90);
    expect(result.discountPercent).toBe(5);
  });

  it("rejects empty body", () => {
    const result = updateInvoiceSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields", () => {
    const result = updateInvoiceSchema.safeParse({
      status: "sent",
      unknown: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("invoiceListQuerySchema", () => {
  it("applies defaults for page and limit", () => {
    const result = invoiceListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("coerces string page and limit to numbers", () => {
    const result = invoiceListQuerySchema.parse({ page: "2", limit: "50" });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(50);
  });

  it("accepts projectId and status filters", () => {
    const result = invoiceListQuerySchema.parse({
      projectId: validUuid,
      status: "draft",
    });
    expect(result.projectId).toBe(validUuid);
    expect(result.status).toBe("draft");
  });

  it("rejects limit over 100", () => {
    const result = invoiceListQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields", () => {
    const result = invoiceListQuerySchema.safeParse({ unknown: true });
    expect(result.success).toBe(false);
  });
});
import { describe, expect, it } from "vitest";

import {
  reportDocumentSchema,
  timeReportRequestSchema,
  timeReportResponseSchema,
} from "./reports.js";

const projectId = "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001";
const taskId = "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002";
const userId = "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003";

describe("timeReportRequestSchema", () => {
  it("accepts valid report filters and applies defaults", () => {
    const result = timeReportRequestSchema.parse({
      projectId,
      userId,
      dateFrom: "2026-05-01T00:00:00.000Z",
      dateTo: "2026-06-01T00:00:00.000Z",
      search: " reports ",
    });

    expect(result).toMatchObject({
      page: 1,
      limit: 20,
      groupBy: ["project"],
      search: "reports",
      sortBy: "totalSeconds",
      sortOrder: "desc",
    });
  });

  it("parses a one-level groupBy path", () => {
    const result = timeReportRequestSchema.parse({ groupBy: ["user"] });

    expect(result.groupBy).toEqual(["user"]);
  });

  it("rejects the comma-separated string form", () => {
    // Requests carry JSON, so groupBy is an array and nothing else.
    const result = timeReportRequestSchema.safeParse({
      groupBy: "project,user",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a page or limit sent as a string", () => {
    // No coercion: JSON carries real numbers.
    expect(timeReportRequestSchema.safeParse({ page: "2" }).success).toBe(false);
    expect(timeReportRequestSchema.safeParse({ limit: "50" }).success).toBe(
      false,
    );
  });

  it("parses an array groupBy path preserving order", () => {
    const result = timeReportRequestSchema.parse({
      groupBy: ["user", "project"],
    });

    expect(result.groupBy).toEqual(["user", "project"]);
  });

  it("rejects unknown grouping dimensions", () => {
    const result = timeReportRequestSchema.safeParse({ groupBy: "member" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path[0]).toBe("groupBy");
  });

  it("rejects unknown dimensions inside a path", () => {
    const result = timeReportRequestSchema.safeParse({
      groupBy: "project,week",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path[0]).toBe("groupBy");
  });

  it("rejects duplicate grouping dimensions", () => {
    const result = timeReportRequestSchema.safeParse({
      groupBy: "project,project",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path[0]).toBe("groupBy");
  });

  it("rejects an empty groupBy path", () => {
    const result = timeReportRequestSchema.safeParse({ groupBy: "" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path[0]).toBe("groupBy");
  });

  it("rejects more than four grouping dimensions", () => {
    // The dimension enum has three members, so a fifth entry necessarily
    // duplicates; length is still checked first via a four-item unique path
    // plus one repeat.
    const result = timeReportRequestSchema.safeParse({
      groupBy: "project,user,task,project,user",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path[0]).toBe("groupBy");
  });

  it("rejects invalid sort values", () => {
    const result = timeReportRequestSchema.safeParse({ sortBy: "hours" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["sortBy"]);
  });

  it("rejects an inverted date range", () => {
    const result = timeReportRequestSchema.safeParse({
      dateFrom: "2026-06-01T00:00:00.000Z",
      dateTo: "2026-05-01T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["dateTo"]);
  });
});

describe("timeReportResponseSchema", () => {
  it("accepts unified rows across grouping paths", () => {
    const result = timeReportResponseSchema.parse({
      groupBy: ["project", "user", "task"],
      dateRange: {
        dateFrom: "2026-05-01T00:00:00.000Z",
        dateTo: "2026-06-01T00:00:00.000Z",
      },
      summary: {
        totalSeconds: 7200,
        billableSeconds: 3600,
        nonBillableSeconds: 3600,
        entryCount: 2,
        billableShare: 0.5,
      },
      items: [
        {
          project: { id: projectId, name: "Project Orion" },
          task: null,
          user: null,
          totalSeconds: 7200,
          billableSeconds: 3600,
          nonBillableSeconds: 3600,
          entryCount: 2,
          billableShare: 0.5,
          billable: null,
          firstStartedAt: "2026-05-01T10:00:00.000Z",
          lastStartedAt: "2026-05-02T10:00:00.000Z",
        },
        {
          project: { id: projectId, name: "Project Orion" },
          task: { id: taskId, title: "Improve reports filters" },
          user: {
            id: userId,
            email: "alexey@example.com",
            displayName: "Alexey T.",
            avatarUrl: null,
          },
          totalSeconds: 3600,
          billableSeconds: 3600,
          nonBillableSeconds: 0,
          entryCount: 1,
          billableShare: 1,
          billable: null,
          firstStartedAt: "2026-05-01T10:00:00.000Z",
          lastStartedAt: "2026-05-01T10:00:00.000Z",
        },
        {
          project: null,
          task: null,
          user: {
            id: userId,
            email: "alexey@example.com",
            displayName: "Alexey T.",
            avatarUrl: null,
          },
          totalSeconds: 3600,
          billableSeconds: 0,
          nonBillableSeconds: 3600,
          entryCount: 1,
          billableShare: 0,
          billable: null,
          firstStartedAt: "2026-05-02T10:00:00.000Z",
          lastStartedAt: "2026-05-02T10:00:00.000Z",
        },
      ],
      meta: {
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
      },
    });

    expect(result.items).toHaveLength(3);
    // billable stays null when the grouping path omits the billable dimension.
    expect(result.items.every((item) => item.billable === null)).toBe(true);
  });

  it("rejects a single-value response groupBy", () => {
    const result = timeReportResponseSchema.safeParse({
      groupBy: "project",
      dateRange: {
        dateFrom: "2026-05-01T00:00:00.000Z",
        dateTo: "2026-06-01T00:00:00.000Z",
      },
      summary: {
        totalSeconds: 0,
        billableSeconds: 0,
        nonBillableSeconds: 0,
        entryCount: 0,
        billableShare: null,
      },
      items: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    expect(result.success).toBe(false);
  });
});

describe("reportDocumentSchema", () => {
  const validDocument = () => ({
    masthead: { wordmark: "GiTiempo", tag: "TIME REPORT" },
    title: "Time report",
    period: "May 2026 · Acme",
    filters: "Projects: All · Members: All · Grouping: Project",
    stats: [{ label: "TRACKED HOURS", value: "10h 00m" }],
    columns: ["NAME", "HOURS", "BILLABLE", "BILL %"],
    rows: [
      {
        detail: null,
        label: "Project Orion",
        level: 0,
        isLeaf: false,
        hours: "10h 00m",
        billable: "08h 00m",
        share: "80%",
      },
    ],
    total: { label: "Total", hours: "10h 00m", billable: "08h 00m", share: "80%" },
    footerNote: "Generated with GiTiempo · May 1, 2026",
  });

  it("accepts a document with the four renderer columns", () => {
    const result = reportDocumentSchema.safeParse(validDocument());

    expect(result.success).toBe(true);
  });

  it("rejects a column count the renderer cannot lay out", () => {
    // The PDF renderer emits four fixed cells per row and four column widths;
    // a fifth header column would desync the table and throw in pdfmake, so the
    // schema must reject it before the document ever reaches the renderer.
    const tooMany = reportDocumentSchema.safeParse({
      ...validDocument(),
      columns: ["NAME", "HOURS", "BILLABLE", "BILL %", "EXTRA"],
    });
    const tooFew = reportDocumentSchema.safeParse({
      ...validDocument(),
      columns: ["NAME", "HOURS", "BILLABLE"],
    });

    expect(tooMany.success).toBe(false);
    expect(tooMany.error?.issues[0]?.path[0]).toBe("columns");
    expect(tooFew.success).toBe(false);
  });
});

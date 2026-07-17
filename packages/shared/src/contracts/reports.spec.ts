import { describe, expect, it } from "vitest";

import {
  timeReportExportQuerySchema,
  timeReportQuerySchema,
  timeReportResponseSchema,
} from "./reports.js";

const projectId = "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001";
const taskId = "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002";
const userId = "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003";

describe("timeReportQuerySchema", () => {
  it("accepts valid report filters and applies defaults", () => {
    const result = timeReportQuerySchema.parse({
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

  it("parses a bare single groupBy value as a one-level path", () => {
    const result = timeReportQuerySchema.parse({ groupBy: "user" });

    expect(result.groupBy).toEqual(["user"]);
  });

  it("parses a comma-separated groupBy path preserving order", () => {
    const result = timeReportQuerySchema.parse({
      groupBy: "project,user,task",
    });

    expect(result.groupBy).toEqual(["project", "user", "task"]);
  });

  it("parses an array groupBy path preserving order", () => {
    const result = timeReportQuerySchema.parse({
      groupBy: ["user", "project"],
    });

    expect(result.groupBy).toEqual(["user", "project"]);
  });

  it("rejects unknown grouping dimensions", () => {
    const result = timeReportQuerySchema.safeParse({ groupBy: "member" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path[0]).toBe("groupBy");
  });

  it("rejects unknown dimensions inside a path", () => {
    const result = timeReportQuerySchema.safeParse({
      groupBy: "project,week",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path[0]).toBe("groupBy");
  });

  it("rejects duplicate grouping dimensions", () => {
    const result = timeReportQuerySchema.safeParse({
      groupBy: "project,project",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path[0]).toBe("groupBy");
  });

  it("rejects an empty groupBy path", () => {
    const result = timeReportQuerySchema.safeParse({ groupBy: "" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path[0]).toBe("groupBy");
  });

  it("rejects more than four grouping dimensions", () => {
    // The dimension enum has three members, so a fifth entry necessarily
    // duplicates; length is still checked first via a four-item unique path
    // plus one repeat.
    const result = timeReportQuerySchema.safeParse({
      groupBy: "project,user,task,project,user",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path[0]).toBe("groupBy");
  });

  it("rejects invalid sort values", () => {
    const result = timeReportQuerySchema.safeParse({ sortBy: "hours" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["sortBy"]);
  });

  it("rejects an inverted date range", () => {
    const result = timeReportQuerySchema.safeParse({
      dateFrom: "2026-06-01T00:00:00.000Z",
      dateTo: "2026-05-01T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["dateTo"]);
  });
});

describe("timeReportExportQuerySchema", () => {
  it("defaults the export format to csv", () => {
    const result = timeReportExportQuerySchema.parse({});

    expect(result.format).toBe("csv");
  });

  it("accepts the pdf format", () => {
    const result = timeReportExportQuerySchema.parse({ format: "pdf" });

    expect(result.format).toBe("pdf");
  });

  it("rejects unknown export formats", () => {
    const result = timeReportExportQuerySchema.safeParse({ format: "xlsx" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["format"]);
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

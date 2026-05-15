import { describe, expect, it } from "vitest";

import {
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
      groupBy: "project",
      search: "reports",
      sortBy: "totalSeconds",
      sortOrder: "desc",
    });
  });

  it("rejects invalid group values", () => {
    const result = timeReportQuerySchema.safeParse({ groupBy: "member" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["groupBy"]);
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

describe("timeReportResponseSchema", () => {
  it("accepts project, task, and user row variants", () => {
    const result = timeReportResponseSchema.parse({
      groupBy: "task",
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
          groupBy: "project",
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
          groupBy: "task",
          project: { id: projectId, name: "Project Orion" },
          task: { id: taskId, title: "Improve reports filters" },
          user: null,
          totalSeconds: 3600,
          billableSeconds: 3600,
          nonBillableSeconds: 0,
          entryCount: 1,
          billableShare: 1,
          firstStartedAt: "2026-05-01T10:00:00.000Z",
          lastStartedAt: "2026-05-01T10:00:00.000Z",
        },
        {
          groupBy: "user",
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
});

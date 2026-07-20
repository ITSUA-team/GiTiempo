import { describe, expect, it } from "vitest";
import {
  createSavedReportSchema,
  savedReportConfigSchema,
  savedReportDateRangeSchema,
  updateSavedReportSchema,
} from "./saved-reports.js";

describe("savedReportDateRangeSchema", () => {
  it("accepts a relative period", () => {
    expect(
      savedReportDateRangeSchema.parse({
        kind: "relative",
        period: "this_month",
      }),
    ).toEqual({ kind: "relative", period: "this_month" });
  });

  it("accepts an absolute window", () => {
    const range = {
      dateFrom: "2026-05-01T00:00:00.000Z",
      dateTo: "2026-06-01T00:00:00.000Z",
      kind: "absolute" as const,
    };

    expect(savedReportDateRangeSchema.parse(range)).toEqual(range);
  });

  it("rejects an unknown period", () => {
    expect(() =>
      savedReportDateRangeSchema.parse({
        kind: "relative",
        period: "last_year",
      }),
    ).toThrow();
  });

  it("rejects an absolute window that ends before it starts", () => {
    expect(() =>
      savedReportDateRangeSchema.parse({
        dateFrom: "2026-06-01T00:00:00.000Z",
        dateTo: "2026-05-01T00:00:00.000Z",
        kind: "absolute",
      }),
    ).toThrow();
  });
});

describe("savedReportConfigSchema", () => {
  it("fills every default for a minimal config", () => {
    expect(savedReportConfigSchema.parse({})).toEqual({
      dateRange: { kind: "relative", period: "this_month" },
      filters: {
        activity: "any",
        billable: "any",
        billableShare: "any",
        global: "",
        hours: "any",
      },
      grouping: ["project"],
      memberId: null,
      projectId: null,
    });
  });

  it("keeps a config that names every field", () => {
    const config = {
      dateRange: { kind: "relative" as const, period: "last_7_days" as const },
      filters: {
        activity: "today" as const,
        billable: "withBillable" as const,
        billableShare: "gte90" as const,
        global: "orion",
        hours: "gte8" as const,
      },
      grouping: ["project" as const, "user" as const],
      memberId: "00000000-0000-4000-8000-000000000002",
      projectId: "00000000-0000-4000-8000-000000000001",
    };

    expect(savedReportConfigSchema.parse(config)).toEqual(config);
  });

  it("preserves grouping order", () => {
    expect(
      savedReportConfigSchema.parse({ grouping: ["user", "task", "project"] })
        .grouping,
    ).toEqual(["user", "task", "project"]);
  });

  it("strips keys it does not know, so older configs keep parsing", () => {
    const parsed = savedReportConfigSchema.parse({
      entries: "gte10",
      grouping: ["project"],
      retiredFilter: true,
    });

    expect(parsed).not.toHaveProperty("entries");
    expect(parsed).not.toHaveProperty("retiredFilter");
    expect(parsed.grouping).toEqual(["project"]);
  });

  it("defaults only the filter keys that are missing", () => {
    expect(
      savedReportConfigSchema.parse({ filters: { hours: "gte40" } }).filters,
    ).toEqual({
      activity: "any",
      billable: "any",
      billableShare: "any",
      global: "",
      hours: "gte40",
    });
  });

  it("rejects an unknown grouping dimension", () => {
    expect(() =>
      savedReportConfigSchema.parse({ grouping: ["project", "client"] }),
    ).toThrow();
  });

  it("rejects a duplicated grouping dimension", () => {
    expect(() =>
      savedReportConfigSchema.parse({ grouping: ["project", "project"] }),
    ).toThrow();
  });

  it("rejects more than four grouping levels", () => {
    expect(() =>
      savedReportConfigSchema.parse({
        grouping: ["project", "user", "task", "project"],
      }),
    ).toThrow();
  });

  it("rejects a filter value outside its vocabulary", () => {
    expect(() =>
      savedReportConfigSchema.parse({ filters: { hours: "gte100" } }),
    ).toThrow();
  });
});

describe("createSavedReportSchema", () => {
  it("trims the name and fills config defaults", () => {
    const parsed = createSavedReportSchema.parse({
      config: {},
      name: "  Monthly billing  ",
    });

    expect(parsed.name).toBe("Monthly billing");
    expect(parsed.config.grouping).toEqual(["project"]);
  });

  it("rejects an empty name", () => {
    expect(() =>
      createSavedReportSchema.parse({ config: {}, name: "   " }),
    ).toThrow();
  });

  it("rejects a name longer than 120 characters", () => {
    expect(() =>
      createSavedReportSchema.parse({ config: {}, name: "x".repeat(121) }),
    ).toThrow();
  });

  it("rejects unknown top-level keys", () => {
    expect(() =>
      createSavedReportSchema.parse({
        config: {},
        name: "Monthly billing",
        workspaceId: "00000000-0000-4000-8000-000000000001",
      }),
    ).toThrow();
  });
});

describe("updateSavedReportSchema", () => {
  it("accepts a rename alone", () => {
    expect(updateSavedReportSchema.parse({ name: "Client hours" })).toEqual({
      name: "Client hours",
    });
  });

  it("accepts a config alone", () => {
    expect(
      updateSavedReportSchema.parse({ config: {} }).config?.grouping,
    ).toEqual(["project"]);
  });

  it("rejects an empty update", () => {
    expect(() => updateSavedReportSchema.parse({})).toThrow();
  });
});

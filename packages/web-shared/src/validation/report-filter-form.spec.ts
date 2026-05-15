import { describe, expect, it } from "vitest";

import {
  normalizeReportDateRangeValue,
  reportFilterFormSchema,
} from "./report-filter-form";

const projectId = "11111111-1111-4111-8111-111111111111";
const userId = "33333333-3333-4333-8333-333333333333";

describe("reportFilterFormSchema", () => {
  it("normalizes PrimeVue date ranges and missing filters", () => {
    const start = new Date(2026, 4, 1);
    const end = new Date(2026, 4, 31);

    const result = reportFilterFormSchema.safeParse({
      dateRange: [start, end],
      groupBy: "project",
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data).toEqual({
      dateRange: [start, end],
      groupBy: "project",
      memberId: null,
      projectId: null,
    });
  });

  it("accepts backend export query filters", () => {
    const result = reportFilterFormSchema.safeParse({
      dateRange: null,
      groupBy: "user",
      memberId: userId,
      projectId,
    });

    expect(result.success).toBe(true);
  });

  it("rejects task grouping for admin report exports", () => {
    const result = reportFilterFormSchema.safeParse({
      dateRange: null,
      groupBy: "task",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.flatten().fieldErrors.groupBy).toContain(
      "Task grouping is not available for report exports.",
    );
  });

  it("maps invalid export dates back to the date range field", () => {
    const result = reportFilterFormSchema.safeParse({
      dateRange: [new Date(2026, 4, 3), new Date(2026, 4, 2)],
      groupBy: "project",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.flatten().fieldErrors.dateRange).toContain(
      "End date must be after the start date.",
    );
  });

  it("validates selected ids against the shared export contract", () => {
    const result = reportFilterFormSchema.safeParse({
      dateRange: null,
      groupBy: "project",
      projectId: "not-a-uuid",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.flatten().fieldErrors.projectId).toEqual(
      expect.any(Array),
    );
  });
});

describe("normalizeReportDateRangeValue", () => {
  it("normalizes single DatePicker values", () => {
    const start = new Date(2026, 4, 1);

    expect(normalizeReportDateRangeValue(start)).toEqual([start, null]);
    expect(normalizeReportDateRangeValue([])).toBeNull();
    expect(normalizeReportDateRangeValue(null)).toBeNull();
  });
});

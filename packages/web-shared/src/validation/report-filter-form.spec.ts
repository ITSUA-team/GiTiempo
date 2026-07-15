import { describe, expect, it } from "vitest";

import { normalizeReportDateRangeValue } from "./report-filter-form";

describe("normalizeReportDateRangeValue", () => {
  it("normalizes single DatePicker values", () => {
    const start = new Date(2026, 4, 1);

    expect(normalizeReportDateRangeValue(start)).toEqual([start, null]);
    expect(normalizeReportDateRangeValue([])).toBeNull();
    expect(normalizeReportDateRangeValue(null)).toBeNull();
  });
});

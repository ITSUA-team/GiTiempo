export type ReportFilterDateRange = [Date | null, Date | null] | null;
export type ReportDatePickerRangeValue =
  | Date
  | (Date | null)[]
  | null
  | undefined;

export function normalizeReportDateRangeValue(
  value: ReportDatePickerRangeValue,
): ReportFilterDateRange {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return [value, null];
  }

  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  return [value[0] ?? null, value[1] ?? null];
}

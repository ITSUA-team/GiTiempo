import { computed, type ComputedRef, type Ref } from 'vue';
import { formatLocalCalendarDate } from '@gitiempo/web-shared/time';

import type { ReportDateRange } from '@/validation/report-view-model';

/**
 * Default field width on desktop (matches the `sm:w-[220px]` class on the
 * DatePicker in ReportsTable).  The composable never shrinks below this.
 */
export const REPORT_DATE_PICKER_MIN_WIDTH_PX = 220;

/**
 * Safety cap so an unexpectedly long value can't push the field wider than
 * the results-header row comfortably allows.  The longest realistic date
 * range with the `M d, yy` format is ~27 characters ("Sep 29, 2026 - Sep 29,
 * 2026"), which needs well under 300 px of total field width.
 */
export const REPORT_DATE_PICKER_MAX_WIDTH_PX = 360;

// Left padding (ps-3 = 12 px) + 1 px border each side + PrimeVue's dynamic
// padding-inline-end when both the in-input calendar icon and clear icon are
// rendered (calc(0.75 rem * 3 + 1 rem * 2) = 68 px).  See giTiempoDatePickerPt.
const INPUT_NON_TEXT_PX = 12 + 2 + 68;

// Must match the DatePicker input font: font-medium (500) + text-[14px] +
// font-sans (Inter).
const MEASUREMENT_FONT = '500 14px "Inter", sans-serif';

const RANGE_SEPARATOR = ' - ';

let measureCanvas: HTMLCanvasElement | null = null;

function measureTextWidth(text: string): number {
  if (typeof document === 'undefined') return 0;
  if (!measureCanvas) measureCanvas = document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d');
  if (!ctx) return 0;
  ctx.font = MEASUREMENT_FONT;
  return Math.ceil(ctx.measureText(text).width);
}

/**
 * Formats a report date range into the same string PrimeVue's DatePicker
 * renders for `date-format="M d, yy"` with `selectionMode="range"`.
 */
export function formatReportDateRangeText(range: ReportDateRange): string {
  if (!range) return '';
  const [start, end] = range;
  if (!start && !end) return '';
  const startText = start ? formatLocalCalendarDate(start) : '';
  const endText = end ? formatLocalCalendarDate(end) : '';
  if (start && end) return `${startText}${RANGE_SEPARATOR}${endText}`;
  return startText || endText;
}

/**
 * Given the measured text width, returns the field width string (e.g.
 * `"300px"`) or `undefined` when the default width already fits.
 */
export function computeReportDatePickerWidth(
  textWidth: number,
): string | undefined {
  const required = textWidth + INPUT_NON_TEXT_PX;
  if (required <= REPORT_DATE_PICKER_MIN_WIDTH_PX) return undefined;
  return `${Math.min(required, REPORT_DATE_PICKER_MAX_WIDTH_PX)}px`;
}

/**
 * Reactive field width for the reports date picker.  Returns a CSS width
 * string only when the formatted date range needs more space than the
 * default 220 px; otherwise returns `undefined` so the Tailwind width class
 * applies unchanged.  Callers should skip the value on mobile viewports.
 */
export function useReportDatePickerWidth(
  dateRange: Ref<ReportDateRange>,
): ComputedRef<string | undefined> {
  return computed(() => {
    const text = formatReportDateRangeText(dateRange.value);
    if (!text) return undefined;
    return computeReportDatePickerWidth(measureTextWidth(text));
  });
}
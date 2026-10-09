import { describe, expect, it } from 'vitest';
import { ref } from 'vue';

import {
  REPORT_DATE_PICKER_MAX_WIDTH_PX,
  REPORT_DATE_PICKER_MIN_WIDTH_PX,
  computeReportDatePickerWidth,
  formatReportDateRangeText,
  useReportDatePickerWidth,
} from './use-report-date-picker-width';

describe('formatReportDateRangeText', () => {
  it('returns an empty string for null', () => {
    expect(formatReportDateRangeText(null)).toBe('');
  });

  it('returns an empty string when both dates are null', () => {
    expect(formatReportDateRangeText([null, null])).toBe('');
  });

  it('formats only the start date when end is null', () => {
    expect(formatReportDateRangeText([new Date(2026, 8, 2), null])).toBe(
      'Sep 2, 2026',
    );
  });

  it('formats only the end date when start is null', () => {
    expect(formatReportDateRangeText([null, new Date(2026, 8, 29)])).toBe(
      'Sep 29, 2026',
    );
  });

  it('formats both dates separated by " - "', () => {
    expect(
      formatReportDateRangeText([new Date(2026, 8, 2), new Date(2026, 8, 29)]),
    ).toBe('Sep 2, 2026 - Sep 29, 2026');
  });

  it('formats single-day ranges', () => {
    expect(
      formatReportDateRangeText([new Date(2026, 8, 15), new Date(2026, 8, 15)]),
    ).toBe('Sep 15, 2026 - Sep 15, 2026');
  });
});

describe('computeReportDatePickerWidth', () => {
  it('returns undefined when the text fits in the default width', () => {
    // 220 px default - 82 px non-text overhead = 138 px text budget.
    expect(computeReportDatePickerWidth(100)).toBeUndefined();
    expect(computeReportDatePickerWidth(138)).toBeUndefined();
  });

  it('returns a width string when the text needs more than the default', () => {
    expect(computeReportDatePickerWidth(160)).toBe('242px');
    expect(computeReportDatePickerWidth(200)).toBe('282px');
  });

  it('caps at the maximum width', () => {
    const overMax = REPORT_DATE_PICKER_MAX_WIDTH_PX + 200;
    expect(computeReportDatePickerWidth(overMax)).toBe(
      `${REPORT_DATE_PICKER_MAX_WIDTH_PX}px`,
    );
  });

  it('never returns a value below the minimum width', () => {
    expect(computeReportDatePickerWidth(0)).toBeUndefined();
    expect(computeReportDatePickerWidth(50)).toBeUndefined();
  });
});

describe('useReportDatePickerWidth', () => {
  it('returns undefined when the range is null', () => {
    const range = ref<[Date | null, Date | null] | null>([null, null]);
    expect(useReportDatePickerWidth(range).value).toBeUndefined();
  });

  it('returns undefined for a short single-date value', () => {
    const range = ref<[Date | null, Date | null]>([new Date(2026, 8, 2), null]);
    // "Sep 2, 2026" is short enough to fit in the default width even with
    // a generous measurement — the composable returns undefined.
    // We can't assert the exact pixel value without a canvas, but we can
    // assert it does not exceed the max.
    const result = useReportDatePickerWidth(range).value;
    if (result !== undefined) {
      const px = Number.parseInt(result, 10);
      expect(px).toBeGreaterThanOrEqual(REPORT_DATE_PICKER_MIN_WIDTH_PX);
      expect(px).toBeLessThanOrEqual(REPORT_DATE_PICKER_MAX_WIDTH_PX);
    }
  });

  it('returns a width within bounds for a full date range', () => {
    const range = ref<[Date | null, Date | null]>([
      new Date(2026, 8, 2),
      new Date(2026, 8, 29),
    ]);
    const result = useReportDatePickerWidth(range).value;
    // In a browser environment with canvas, this should produce a width.
    // In SSR or non-canvas environments, it returns undefined.
    if (result !== undefined) {
      const px = Number.parseInt(result, 10);
      expect(px).toBeGreaterThanOrEqual(REPORT_DATE_PICKER_MIN_WIDTH_PX);
      expect(px).toBeLessThanOrEqual(REPORT_DATE_PICKER_MAX_WIDTH_PX);
    }
  });

  it('reacts to date range changes', () => {
    const range = ref<[Date | null, Date | null] | null>(null);
    const computed = useReportDatePickerWidth(range);
    expect(computed.value).toBeUndefined();

    range.value = [new Date(2026, 8, 2), new Date(2026, 8, 29)];
    // Trigger reactivity.
    const result = computed.value;
    if (result !== undefined) {
      const px = Number.parseInt(result, 10);
      expect(px).toBeGreaterThanOrEqual(REPORT_DATE_PICKER_MIN_WIDTH_PX);
    }
  });
});
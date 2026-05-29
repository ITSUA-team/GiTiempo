import { describe, expect, it } from 'vitest';

import {
  addUtcDays,
  formatCompactDuration,
  formatElapsedDuration,
  formatPaddedHoursMinutesDuration,
  formatRelativeTime,
  formatRunningDuration,
  formatTrimmedHoursMinutesDuration,
  formatUtcDayLabel,
  formatUtcTime,
  formatUtcWeekday,
  getLocalIsoWeekRange,
  getUtcDateKey,
  isSameLocalDate,
  isSameLocalMonth,
  nextLocalDay,
  nextLocalDayStartIso,
  nextUtcDay,
  startOfLocalDay,
  startOfLocalDayIso,
  startOfLocalMonth,
  startOfUtcDay,
  startOfUtcIsoWeek,
} from './index';

describe('shared date-time helpers', () => {
  it('formats UTC keys, labels, times, and weekdays without local timezone drift', () => {
    const nowMs = Date.parse('2026-04-21T12:00:00.000Z');

    expect(getUtcDateKey('2026-04-21T23:59:00.000Z')).toBe('2026-04-21');
    expect(formatUtcTime('2026-04-21T00:05:00.000Z')).toBe('00:05');
    expect(formatUtcTime('2026-04-21T23:59:00.000Z')).toBe('23:59');
    expect(formatUtcWeekday('2026-04-22T09:00:00.000Z')).toBe('Wed');
    expect(formatUtcDayLabel('2026-04-21', nowMs)).toBe('Today, Apr 21');
    expect(formatUtcDayLabel('2026-04-20', nowMs)).toBe('Yesterday, Apr 20');
    expect(formatUtcDayLabel('2026-04-01', nowMs)).toBe('Apr 1');
  });

  it('calculates UTC day and ISO week boundaries', () => {
    const date = new Date('2026-04-26T23:30:00.000Z');

    expect(startOfUtcDay(date).toISOString()).toBe('2026-04-26T00:00:00.000Z');
    expect(nextUtcDay(date).toISOString()).toBe('2026-04-27T00:00:00.000Z');
    expect(startOfUtcIsoWeek(date).toISOString()).toBe(
      '2026-04-20T00:00:00.000Z',
    );
    expect(addUtcDays(startOfUtcIsoWeek(date), 7).toISOString()).toBe(
      '2026-04-27T00:00:00.000Z',
    );
  });

  it('calculates local DatePicker-style day and week boundaries', () => {
    const date = new Date(2026, 4, 13, 12, 30, 0);

    expect(startOfLocalDay(date).toISOString()).toBe(
      new Date(2026, 4, 13, 0, 0, 0, 0).toISOString(),
    );
    expect(nextLocalDay(date).toISOString()).toBe(
      new Date(2026, 4, 14, 0, 0, 0, 0).toISOString(),
    );
    expect(startOfLocalDayIso(date)).toBe(
      new Date(2026, 4, 13, 0, 0, 0, 0).toISOString(),
    );
    expect(nextLocalDayStartIso(date)).toBe(
      new Date(2026, 4, 14, 0, 0, 0, 0).toISOString(),
    );
    expect(startOfLocalMonth(date).toISOString()).toBe(
      new Date(2026, 4, 1, 0, 0, 0, 0).toISOString(),
    );
    expect(getLocalIsoWeekRange(date)).toEqual({
      dateFrom: new Date(2026, 4, 11, 0, 0, 0, 0).toISOString(),
      dateTo: date.toISOString(),
    });
  });

  it('compares local days and months', () => {
    expect(
      isSameLocalDate(
        new Date(2026, 4, 13, 1, 0, 0),
        new Date(2026, 4, 13, 23, 0, 0),
      ),
    ).toBe(true);
    expect(isSameLocalMonth(new Date(2026, 4, 1), new Date(2026, 4, 31))).toBe(
      true,
    );
  });

  it('formats compact, padded, trimmed, elapsed, and running durations', () => {
    const nowMs = Date.parse('2026-04-21T12:00:00.000Z');

    expect(formatCompactDuration(null)).toBe('0m');
    expect(formatCompactDuration(59)).toBe('1m');
    expect(formatCompactDuration(7200)).toBe('2h');
    expect(formatCompactDuration(8100)).toBe('2h 15m');
    expect(formatPaddedHoursMinutesDuration(59)).toBe('0m');
    expect(formatPaddedHoursMinutesDuration(7200)).toBe('2h 00m');
    expect(formatPaddedHoursMinutesDuration(8100)).toBe('2h 15m');
    expect(formatTrimmedHoursMinutesDuration(0)).toBe('0h');
    expect(formatTrimmedHoursMinutesDuration(7200)).toBe('2h');
    expect(formatTrimmedHoursMinutesDuration(8100)).toBe('2h 15m');
    expect(formatElapsedDuration(3661)).toBe('01:01:01');
    expect(formatElapsedDuration(-1)).toBe('00:00:00');
    expect(formatRunningDuration('2026-04-21T11:59:58.000Z', nowMs)).toBe(
      '00:00:02',
    );
    expect(formatRunningDuration('2026-04-21T12:00:05.000Z', nowMs)).toBe(
      '00:00:00',
    );
  });

  it('formats relative time labels', () => {
    const now = new Date('2026-05-13T12:00:00.000Z');

    expect(formatRelativeTime('invalid', now)).toBe('Unknown');
    expect(formatRelativeTime('2026-05-13T12:00:00.000Z', now)).toBe(
      'Just now',
    );
    expect(formatRelativeTime('2026-05-13T11:58:00.000Z', now)).toBe(
      '2 min ago',
    );
    expect(formatRelativeTime('2026-05-13T09:00:00.000Z', now)).toBe('3h ago');
    expect(formatRelativeTime('2026-05-10T12:00:00.000Z', now)).toBe('3d ago');
    expect(formatRelativeTime('2026-05-01T12:00:00.000Z', now)).toBe('May 1');
  });
});

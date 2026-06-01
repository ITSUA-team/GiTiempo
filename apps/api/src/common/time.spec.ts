import { describe, expect, it } from 'vitest';
import {
  startOfNextUtcMonth,
  startOfUtcDay,
  startOfUtcIsoWeek,
  startOfUtcMonth,
} from './time';

describe('UTC date-time helpers', () => {
  it('returns UTC day starts without local timezone drift', () => {
    expect(
      startOfUtcDay(new Date('2026-05-13T23:59:59.999Z')).toISOString(),
    ).toBe('2026-05-13T00:00:00.000Z');
  });

  it('returns Monday UTC starts for ISO weeks', () => {
    expect(
      startOfUtcIsoWeek(new Date('2026-05-13T12:00:00.000Z')).toISOString(),
    ).toBe('2026-05-11T00:00:00.000Z');
    expect(
      startOfUtcIsoWeek(new Date('2026-05-17T12:00:00.000Z')).toISOString(),
    ).toBe('2026-05-11T00:00:00.000Z');
    expect(
      startOfUtcIsoWeek(new Date('2026-01-01T12:00:00.000Z')).toISOString(),
    ).toBe('2025-12-29T00:00:00.000Z');
  });

  it('returns current and next UTC month starts', () => {
    const date = new Date('2026-12-31T23:59:59.999Z');

    expect(startOfUtcMonth(date).toISOString()).toBe(
      '2026-12-01T00:00:00.000Z',
    );
    expect(startOfNextUtcMonth(date).toISOString()).toBe(
      '2027-01-01T00:00:00.000Z',
    );
  });
});

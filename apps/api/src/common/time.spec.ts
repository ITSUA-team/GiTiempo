import { describe, expect, it } from 'vitest';

import {
  nextUtcMonth,
  startOfUtcDay,
  startOfUtcIsoWeek,
  startOfUtcMonth,
} from './time';

describe('API UTC date helpers', () => {
  it('calculates UTC day, ISO week, and month boundaries', () => {
    const date = new Date('2026-05-31T23:30:00.000Z');

    expect(startOfUtcDay(date).toISOString()).toBe('2026-05-31T00:00:00.000Z');
    expect(startOfUtcIsoWeek(date).toISOString()).toBe(
      '2026-05-25T00:00:00.000Z',
    );
    expect(startOfUtcMonth(date).toISOString()).toBe(
      '2026-05-01T00:00:00.000Z',
    );
    expect(nextUtcMonth(date).toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });
});

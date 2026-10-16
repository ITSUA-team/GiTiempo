import { describe, expect, it } from 'vitest';

import { formatDuration } from './format-duration';

describe('formatDuration', () => {
  it('formats zero seconds', () => {
    expect(formatDuration(0)).toBe('0h 0m');
  });

  it('formats exactly one hour', () => {
    expect(formatDuration(3600)).toBe('1h 0m');
  });

  it('formats one hour and one minute', () => {
    expect(formatDuration(3660)).toBe('1h 1m');
  });

  it('formats 90 minutes', () => {
    expect(formatDuration(5400)).toBe('1h 30m');
  });

  it('formats 28200 seconds without rounding to 8h', () => {
    expect(formatDuration(28200)).toBe('7h 50m');
  });

  it('formats a full day without day conversion', () => {
    expect(formatDuration(86400)).toBe('24h 0m');
  });
});
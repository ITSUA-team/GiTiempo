import { describe, expect, it } from 'vitest';
import {
  createSavedReportSchema,
  savedReportConfigSchema,
  savedReportDateRangeSchema,
  updateSavedReportSchema,
} from './saved-reports.js';

const dateRange = {
  dateFrom: '2026-05-01T00:00:00.000Z',
  dateTo: '2026-06-01T00:00:00.000Z',
  kind: 'absolute' as const,
};

describe('savedReportDateRangeSchema', () => {
  it('accepts an absolute window', () => {
    expect(savedReportDateRangeSchema.parse(dateRange)).toEqual(dateRange);
  });

  it('rejects a relative period and an inverted window', () => {
    expect(() =>
      savedReportDateRangeSchema.parse({ kind: 'relative', period: 'this_month' }),
    ).toThrow();
    expect(() =>
      savedReportDateRangeSchema.parse({ ...dateRange, dateFrom: dateRange.dateTo }),
    ).toThrow();
  });
});

describe('savedReportConfigSchema', () => {
  it('requires a date range but defaults omitted filters and scope', () => {
    const parsed = savedReportConfigSchema.parse({ dateRange });

    expect(parsed).toMatchObject({
      dateRange,
      filters: {
        activity: 'any',
        billable: 'any',
        billableShare: 'any',
        global: '',
        hours: 'any',
      },
      grouping: ['project'],
      memberId: null,
      projectId: null,
    });
    expect(() => savedReportConfigSchema.parse({})).toThrow();
  });

  it('preserves grouping order and strips unknown keys', () => {
    const parsed = savedReportConfigSchema.parse({
      dateRange,
      grouping: ['user', 'task', 'project'],
      retiredFilter: true,
    });

    expect(parsed.grouping).toEqual(['user', 'task', 'project']);
    expect(parsed).not.toHaveProperty('retiredFilter');
  });

  it('rejects invalid grouping and filter vocabulary', () => {
    expect(() =>
      savedReportConfigSchema.parse({ dateRange, grouping: ['project', 'client'] }),
    ).toThrow();
    expect(() =>
      savedReportConfigSchema.parse({ dateRange, filters: { hours: 'gte100' } }),
    ).toThrow();
  });
});

describe('saved report payloads', () => {
  it('trims names and accepts a config update', () => {
    expect(
      createSavedReportSchema.parse({ config: { dateRange }, name: '  Monthly billing  ' }),
    ).toMatchObject({ name: 'Monthly billing' });
    expect(updateSavedReportSchema.parse({ config: { dateRange } })).toMatchObject({
      config: { dateRange },
    });
  });

  it('rejects empty names, missing date ranges, and empty updates', () => {
    expect(() => createSavedReportSchema.parse({ config: { dateRange }, name: '   ' })).toThrow();
    expect(() => createSavedReportSchema.parse({ config: {}, name: 'Monthly billing' })).toThrow();
    expect(() => updateSavedReportSchema.parse({})).toThrow();
  });
});

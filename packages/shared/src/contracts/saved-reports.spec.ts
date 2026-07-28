import { describe, expect, it } from 'vitest';
import {
  createSavedReportSchema,
  savedReportConfigSchema,
  savedReportDateRangeSchema,
  savedReportSchema,
  storedSavedReportConfigSchema,
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
      savedReportDateRangeSchema.parse({
        ...dateRange,
        dateFrom: dateRange.dateTo,
        dateTo: dateRange.dateFrom,
      }),
    ).toThrow();
  });

  it('accepts an inclusive single-day window', () => {
    const singleDay = { ...dateRange, dateTo: dateRange.dateFrom };
    expect(savedReportDateRangeSchema.parse(singleDay)).toEqual(singleDay);
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

  it('rejects an invalid grouping and a retired filter value (strict transport)', () => {
    expect(() =>
      savedReportConfigSchema.parse({ dateRange, grouping: ['project', 'client'] }),
    ).toThrow();
    // Strict transport: a filter value outside the current vocabulary is a
    // validation error, never a silent degrade — the tolerant behaviour lives in
    // storedSavedReportConfigSchema, exercised below.
    expect(() =>
      savedReportConfigSchema.parse({
        dateRange,
        filters: { billable: 'withBillable' },
      }),
    ).toThrow();
  });
});

describe('storedSavedReportConfigSchema', () => {
  it('degrades a retired filter value to the neutral option on read', () => {
    // The persistence-read boundary tolerates a value outside the current
    // vocabulary (e.g. the retired withBillable option) so a preset saved
    // against an older contract keeps loading instead of failing.
    const parsed = storedSavedReportConfigSchema.parse({
      dateRange,
      filters: { hours: 'gte100', billable: 'withBillable' },
    });

    expect(parsed.filters.hours).toBe('any');
    expect(parsed.filters.billable).toBe('any');
  });

  it('keeps the structural parts strict', () => {
    // Tolerance is only for filter vocabularies; a missing date range or an
    // unknown grouping dimension is still rejected on read.
    expect(() => storedSavedReportConfigSchema.parse({})).toThrow();
    expect(() =>
      storedSavedReportConfigSchema.parse({ dateRange, grouping: ['client'] }),
    ).toThrow();
  });
});

describe('savedReportSchema', () => {
  const base = {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Monthly billing',
    createdBy: null,
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
  };

  it('accepts a preset with a valid config', () => {
    const parsed = savedReportSchema.parse({ ...base, config: { dateRange } });

    expect(parsed.config?.dateRange).toEqual(dateRange);
  });

  it('accepts a preset whose stored config could not be loaded (null)', () => {
    const parsed = savedReportSchema.parse({ ...base, config: null });

    expect(parsed.config).toBeNull();
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

  it('rejects a create or update config carrying a filter outside its vocabulary', () => {
    // Regression: billable:'not-a-real-filter' must be a validation error on the
    // write path, never silently coerced to 'any' (the tolerant read normalizer
    // must not leak into the transport contract).
    expect(() =>
      createSavedReportSchema.parse({
        config: { dateRange, filters: { billable: 'not-a-real-filter' } },
        name: 'Broken filter',
      }),
    ).toThrow();
    expect(() =>
      updateSavedReportSchema.parse({
        config: { dateRange, filters: { billable: 'not-a-real-filter' } },
      }),
    ).toThrow();
  });
});

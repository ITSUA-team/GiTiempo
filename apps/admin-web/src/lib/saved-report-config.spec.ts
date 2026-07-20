import { describe, expect, it } from 'vitest';
import type { SavedReportConfig } from '@gitiempo/shared';
import {
  applyConfigToState,
  buildConfigFromState,
  createDefaultSavedReportState,
  isSameSavedReportConfig,
  resolveRelativePeriod,
  toApiGrouping,
  toUiGrouping,
  type SavedReportState,
} from './saved-report-config';

// A Wednesday, so week-start maths is visible.
const NOW = new Date(2026, 6, 15, 13, 45);

const PROJECT_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_PROJECT_ID = '00000000-0000-4000-8000-000000000009';
const MEMBER_ID = '00000000-0000-4000-8000-000000000002';

function makeState(
  overrides: Partial<SavedReportState> = {},
): SavedReportState {
  return {
    ...createDefaultSavedReportState(NOW),
    ...overrides,
  };
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

describe('grouping vocabulary mapping', () => {
  it('maps the UI member dimension onto the API user dimension', () => {
    expect(toApiGrouping(['project', 'member', 'task'])).toEqual([
      'project',
      'user',
      'task',
    ]);
  });

  it('maps back, preserving order', () => {
    expect(toUiGrouping(['user', 'task', 'project'])).toEqual([
      'member',
      'task',
      'project',
    ]);
  });

  it('round-trips', () => {
    expect(toUiGrouping(toApiGrouping(['task', 'member']))).toEqual([
      'task',
      'member',
    ]);
  });
});

describe('resolveRelativePeriod', () => {
  it('resolves this_month from the first of the month to today', () => {
    const [start, end] = resolveRelativePeriod('this_month', NOW);

    expect(dateKey(start)).toBe('2026-07-01');
    expect(dateKey(end)).toBe('2026-07-15');
  });

  it('resolves previous_month to that whole month', () => {
    const [start, end] = resolveRelativePeriod('previous_month', NOW);

    expect(dateKey(start)).toBe('2026-06-01');
    expect(dateKey(end)).toBe('2026-06-30');
  });

  it('resolves this_week from Monday', () => {
    const [start, end] = resolveRelativePeriod('this_week', NOW);

    expect(dateKey(start)).toBe('2026-07-13');
    expect(dateKey(end)).toBe('2026-07-15');
  });

  it('treats Sunday as the end of its week, not the start', () => {
    const sunday = new Date(2026, 6, 19, 9, 0);
    const [start, end] = resolveRelativePeriod('this_week', sunday);

    expect(dateKey(start)).toBe('2026-07-13');
    expect(dateKey(end)).toBe('2026-07-19');
  });

  it('resolves last_7_days inclusive of today', () => {
    const [start, end] = resolveRelativePeriod('last_7_days', NOW);

    expect(dateKey(start)).toBe('2026-07-09');
    expect(dateKey(end)).toBe('2026-07-15');
  });

  it('resolves last_30_days inclusive of today', () => {
    const [start] = resolveRelativePeriod('last_30_days', NOW);

    expect(dateKey(start)).toBe('2026-06-16');
  });

  it('crosses a year boundary for previous_month', () => {
    const january = new Date(2026, 0, 10, 12, 0);
    const [start, end] = resolveRelativePeriod('previous_month', january);

    expect(dateKey(start)).toBe('2025-12-01');
    expect(dateKey(end)).toBe('2025-12-31');
  });

  it('starts every resolved window at local midnight', () => {
    const [start] = resolveRelativePeriod('this_month', NOW);

    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });
});

describe('buildConfigFromState', () => {
  it('stores the selected period rather than the resolved window', () => {
    const config = buildConfigFromState(
      makeState({
        dateRange: resolveRelativePeriod('this_month', NOW),
        period: 'this_month',
      }),
    );

    expect(config.dateRange).toEqual({
      kind: 'relative',
      period: 'this_month',
    });
  });

  it('stores an absolute window when no period is selected', () => {
    const config = buildConfigFromState(
      makeState({
        dateRange: [new Date(2026, 4, 1), new Date(2026, 5, 1)],
        period: null,
      }),
    );

    expect(config.dateRange.kind).toBe('absolute');
  });

  it('carries grouping in API vocabulary and the column filters', () => {
    const config = buildConfigFromState(
      makeState({
        filters: {
          activity: 'last7',
          billable: 'withBillable',
          billableShare: 'gte90',
          global: 'orion',
          hours: 'gte8',
          memberId: MEMBER_ID,
          projectId: PROJECT_ID,
        },
        grouping: ['project', 'member'],
      }),
    );

    expect(config.grouping).toEqual(['project', 'user']);
    expect(config.projectId).toBe(PROJECT_ID);
    expect(config.memberId).toBe(MEMBER_ID);
    expect(config.filters).toEqual({
      activity: 'last7',
      billable: 'withBillable',
      billableShare: 'gte90',
      global: 'orion',
      hours: 'gte8',
    });
  });

  it('falls back to this_month when there is no range at all', () => {
    const config = buildConfigFromState(
      makeState({ dateRange: null, period: null }),
    );

    expect(config.dateRange).toEqual({
      kind: 'relative',
      period: 'this_month',
    });
  });
});

describe('applyConfigToState', () => {
  const config: SavedReportConfig = {
    dateRange: { kind: 'relative', period: 'previous_month' },
    filters: {
      activity: 'today',
      billable: 'withoutBillable',
      billableShare: 'below50',
      global: 'api',
      hours: 'gte40',
    },
    grouping: ['user', 'project'],
    memberId: MEMBER_ID,
    projectId: PROJECT_ID,
  };

  it('resolves a relative period against now and keeps the period selected', () => {
    const { state } = applyConfigToState(config, { now: NOW });

    expect(state.period).toBe('previous_month');
    expect(dateKey(state.dateRange![0]!)).toBe('2026-06-01');
    expect(dateKey(state.dateRange![1]!)).toBe('2026-06-30');
  });

  it('restores grouping in UI vocabulary and every filter', () => {
    const { state } = applyConfigToState(config, { now: NOW });

    expect(state.grouping).toEqual(['member', 'project']);
    expect(state.filters).toEqual({
      activity: 'today',
      billable: 'withoutBillable',
      billableShare: 'below50',
      global: 'api',
      hours: 'gte40',
      memberId: MEMBER_ID,
      projectId: PROJECT_ID,
    });
  });

  it('clears the period for an absolute window', () => {
    const { state } = applyConfigToState(
      {
        ...config,
        dateRange: {
          dateFrom: '2026-05-01T00:00:00.000Z',
          dateTo: '2026-06-01T00:00:00.000Z',
          kind: 'absolute',
        },
      },
      { now: NOW },
    );

    expect(state.period).toBeNull();
    expect(state.dateRange).not.toBeNull();
  });

  it('drops a project that is no longer available and reports it', () => {
    const { fallbacks, state } = applyConfigToState(config, {
      availableMemberIds: [MEMBER_ID],
      availableProjectIds: [OTHER_PROJECT_ID],
      now: NOW,
    });

    expect(state.filters.projectId).toBeNull();
    expect(state.filters.memberId).toBe(MEMBER_ID);
    expect(fallbacks).toEqual(['project']);
  });

  it('drops a member that is no longer available and reports it', () => {
    const { fallbacks, state } = applyConfigToState(config, {
      availableMemberIds: [],
      availableProjectIds: [PROJECT_ID],
      now: NOW,
    });

    expect(state.filters.memberId).toBeNull();
    expect(fallbacks).toEqual(['member']);
  });

  it('reports both fallbacks when neither identity survives', () => {
    const { fallbacks } = applyConfigToState(config, {
      availableMemberIds: [],
      availableProjectIds: [],
      now: NOW,
    });

    expect(fallbacks).toEqual(['project', 'member']);
  });

  it('skips the availability check when no option lists are supplied', () => {
    const { fallbacks, state } = applyConfigToState(config, { now: NOW });

    expect(fallbacks).toEqual([]);
    expect(state.filters.projectId).toBe(PROJECT_ID);
  });
});

describe('dirty comparison', () => {
  it('treats a state round-trip as unchanged', () => {
    const state = makeState({
      dateRange: resolveRelativePeriod('this_month', NOW),
      period: 'this_month',
    });
    const saved = buildConfigFromState(state);
    const { state: restored } = applyConfigToState(saved, { now: NOW });

    expect(isSameSavedReportConfig(saved, buildConfigFromState(restored))).toBe(
      true,
    );
  });

  it('does not report a relative preset as changed on a later day', () => {
    const savedInJuly = buildConfigFromState(
      makeState({
        dateRange: resolveRelativePeriod('this_month', NOW),
        period: 'this_month',
      }),
    );

    const laterNow = new Date(2026, 8, 3, 10, 0);
    const { state } = applyConfigToState(savedInJuly, { now: laterNow });

    expect(
      isSameSavedReportConfig(savedInJuly, buildConfigFromState(state)),
    ).toBe(true);
  });

  it('reports a grouping change as changed', () => {
    const base = buildConfigFromState(makeState({ grouping: ['project'] }));
    const changed = buildConfigFromState(
      makeState({ grouping: ['project', 'member'] }),
    );

    expect(isSameSavedReportConfig(base, changed)).toBe(false);
  });

  it('treats grouping order as meaningful', () => {
    const left = buildConfigFromState(
      makeState({ grouping: ['project', 'member'] }),
    );
    const right = buildConfigFromState(
      makeState({ grouping: ['member', 'project'] }),
    );

    expect(isSameSavedReportConfig(left, right)).toBe(false);
  });

  it('reports a filter change as changed', () => {
    const base = makeState();
    const changed = makeState({
      filters: { ...base.filters, hours: 'gte40' },
    });

    expect(
      isSameSavedReportConfig(
        buildConfigFromState(base),
        buildConfigFromState(changed),
      ),
    ).toBe(false);
  });

  it('clears again when a filter is toggled back', () => {
    const base = makeState();
    const toggled = makeState({ filters: { ...base.filters, hours: 'gte40' } });
    const reverted = makeState({
      filters: { ...toggled.filters, hours: 'any' },
    });

    expect(
      isSameSavedReportConfig(
        buildConfigFromState(base),
        buildConfigFromState(reverted),
      ),
    ).toBe(true);
  });

  it('ignores surrounding whitespace in the search term', () => {
    const base = makeState({
      filters: { ...makeState().filters, global: 'orion' },
    });
    const padded = makeState({
      filters: { ...makeState().filters, global: '  orion  ' },
    });

    expect(
      isSameSavedReportConfig(
        buildConfigFromState(base),
        buildConfigFromState(padded),
      ),
    ).toBe(true);
  });

  it('distinguishes a relative period from an absolute window covering it', () => {
    const relative = buildConfigFromState(
      makeState({
        dateRange: resolveRelativePeriod('this_month', NOW),
        period: 'this_month',
      }),
    );
    const absolute = buildConfigFromState(
      makeState({
        dateRange: resolveRelativePeriod('this_month', NOW),
        period: null,
      }),
    );

    expect(isSameSavedReportConfig(relative, absolute)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import type { SavedReportConfig } from '@gitiempo/shared';
import {
  applyConfigToState,
  buildConfigFromState,
  createDefaultSavedReportState,
  describeSavedReportConfig,
  isSameSavedReportConfig,
  toApiGrouping,
  toUiGrouping,
  type SavedReportState,
} from './saved-report-config';

const NOW = new Date(2026, 6, 15, 13, 45);
const PROJECT_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_PROJECT_ID = '00000000-0000-4000-8000-000000000009';
const MEMBER_ID = '00000000-0000-4000-8000-000000000002';

function makeState(
  overrides: Partial<SavedReportState> = {},
): SavedReportState {
  return { ...createDefaultSavedReportState(NOW), ...overrides };
}

function makeConfig(
  overrides: Partial<SavedReportConfig> = {},
): SavedReportConfig {
  return {
    dateRange: {
      dateFrom: '2026-06-01T00:00:00.000Z',
      dateTo: '2026-06-30T00:00:00.000Z',
      kind: 'absolute',
    },
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
    ...overrides,
  };
}

describe('grouping vocabulary mapping', () => {
  it('maps UI members to API users and preserves order on round-trip', () => {
    expect(toApiGrouping(['project', 'member', 'task'])).toEqual([
      'project',
      'user',
      'task',
    ]);
    expect(toUiGrouping(toApiGrouping(['project', 'member', 'task']))).toEqual([
      'project',
      'member',
      'task',
    ]);
  });
});

describe('buildConfigFromState', () => {
  it('stores the chosen absolute window', () => {
    const config = buildConfigFromState(
      makeState({
        dateRange: [
          new Date('2026-05-01T00:00:00.000Z'),
          new Date('2026-06-01T00:00:00.000Z'),
        ],
      }),
      NOW,
    );

    expect(config.dateRange).toEqual({
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-06-01T00:00:00.000Z',
      kind: 'absolute',
    });
  });

  it('uses the report default as an absolute fallback when the control is empty', () => {
    const config = buildConfigFromState(makeState({ dateRange: null }), NOW);

    expect(config.dateRange.kind).toBe('absolute');
    expect(new Date(config.dateRange.dateFrom).getTime()).toBeLessThan(
      new Date(config.dateRange.dateTo).getTime(),
    );
  });

  it('carries grouping in API vocabulary and table filters', () => {
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
      NOW,
    );

    expect(config.grouping).toEqual(['project', 'user']);
    expect(config.filters).toMatchObject({ global: 'orion', hours: 'gte8' });
    expect(config.projectId).toBe(PROJECT_ID);
    expect(config.memberId).toBe(MEMBER_ID);
  });
});

describe('applyConfigToState', () => {
  it('restores its absolute date range, grouping, and filters', () => {
    const { state } = applyConfigToState(makeConfig());

    expect(state.dateRange).toEqual([
      new Date('2026-06-01T00:00:00.000Z'),
      new Date('2026-06-30T00:00:00.000Z'),
    ]);
    expect(state.grouping).toEqual(['member', 'project']);
    expect(state.filters.memberId).toBe(MEMBER_ID);
  });

  it('drops unavailable identities and reports each fallback', () => {
    const { fallbacks, state } = applyConfigToState(makeConfig(), {
      availableMemberIds: [],
      availableProjectIds: [OTHER_PROJECT_ID],
    });

    expect(fallbacks).toEqual(['project', 'member']);
    expect(state.filters).toMatchObject({ memberId: null, projectId: null });
  });
});

describe('dirty comparison', () => {
  it('treats an absolute state round-trip as unchanged', () => {
    const state = makeState({
      dateRange: [
        new Date('2026-05-01T00:00:00.000Z'),
        new Date('2026-06-01T00:00:00.000Z'),
      ],
    });
    const saved = buildConfigFromState(state, NOW);
    const { state: restored } = applyConfigToState(saved);

    expect(isSameSavedReportConfig(saved, buildConfigFromState(restored, NOW))).toBe(
      true,
    );
  });

  it('reports date-range, grouping, and filter changes', () => {
    const base = buildConfigFromState(makeState(), NOW);
    const changedRange = buildConfigFromState(
      makeState({
        dateRange: [
          new Date('2026-06-01T00:00:00.000Z'),
          new Date('2026-06-02T00:00:00.000Z'),
        ],
      }),
      NOW,
    );
    const changedGrouping = buildConfigFromState(
      makeState({ grouping: ['project', 'member'] }),
      NOW,
    );
    const changedFilter = buildConfigFromState(
      makeState({ filters: { ...makeState().filters, hours: 'gte40' } }),
      NOW,
    );

    expect(isSameSavedReportConfig(base, changedRange)).toBe(false);
    expect(isSameSavedReportConfig(base, changedGrouping)).toBe(false);
    expect(isSameSavedReportConfig(base, changedFilter)).toBe(false);
  });
});

describe('describeSavedReportConfig', () => {
  it('labels the absolute window, grouping path, and active filters', () => {
    const items = describeSavedReportConfig(
      makeConfig({
        filters: { ...makeConfig().filters, global: '', hours: 'any' },
        grouping: ['project', 'user', 'task'],
        memberId: null,
      }),
    );

    expect(items).toEqual([
      { icon: 'pi pi-calendar', label: 'Jun 1 – Jun 30' },
      { icon: 'pi pi-sitemap', label: 'Project › Member › Task' },
      { icon: 'pi pi-filter', label: '4 filters' },
    ]);
  });
});

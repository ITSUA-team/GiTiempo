import { describe, expect, it } from 'vitest';
import type { TimeReportResponse } from '@gitiempo/shared';
import {
  nextLocalDayStartIso,
  startOfLocalDayIso,
} from '@gitiempo/web-shared/time';

import {
  buildReportTree,
  createDefaultReportTableFilters,
  filterReportRows,
  flattenReportTree,
  getReportExportBlockedReason,
  sumReportRows,
  toReportTableRows,
  toTimeReportExportQuery,
  toTimeReportQuery,
  type ReportTableFilters,
  type ReportTableRow,
} from './report-view-model';

const projectId = '11111111-1111-4111-8111-111111111111';
const otherProjectId = '11111111-1111-4111-8111-111111111112';
const userId = '33333333-3333-4333-8333-333333333333';
const otherUserId = '33333333-3333-4333-8333-333333333334';

function makeLeafRow(overrides: Partial<ReportTableRow>): ReportTableRow {
  return {
    billableSeconds: 3600,
    billableShare: 1,
    entryCount: 1,
    id: `${projectId}:no-task:${userId}`,
    lastStartedAt: '2026-05-02T10:00:00.000Z',
    memberIds: [userId],
    memberName: 'Alex Admin',
    nonBillableSeconds: 0,
    projectIds: [projectId],
    projectName: 'Project Orion',
    taskId: null,
    taskName: null,
    totalSeconds: 3600,
    ...overrides,
  };
}

const response: TimeReportResponse = {
  dateRange: {
    dateFrom: '2026-05-01T00:00:00.000Z',
    dateTo: '2026-06-01T00:00:00.000Z',
  },
  groupBy: ['user'],
  items: [
    {
      billableSeconds: 3600,
      billableShare: 0.5,
      entryCount: 2,
      firstStartedAt: '2026-05-01T10:00:00.000Z',
      lastStartedAt: '2026-05-02T10:00:00.000Z',
      nonBillableSeconds: 3600,
      project: null,
      task: null,
      totalSeconds: 7200,
      user: {
        avatarUrl: null,
        displayName: 'Alex Admin',
        email: 'alex@example.com',
        id: userId,
      },
    },
  ],
  meta: { limit: 100, page: 1, total: 1, totalPages: 1 },
  summary: {
    billableSeconds: 3600,
    billableShare: 0.5,
    entryCount: 2,
    nonBillableSeconds: 3600,
    totalSeconds: 7200,
  },
};

describe('report-view-model', () => {
  it('validates report query generation with shared Zod schemas', () => {
    const query = toTimeReportQuery(
      {
        dateRange: [new Date(2026, 4, 1), new Date(2026, 4, 2)],
        groupBy: ['project', 'user'],
        memberId: userId,
        projectId,
      },
      1,
      100,
    );

    expect(query).toMatchObject({
      groupBy: ['project', 'user'],
      limit: 100,
      page: 1,
      projectId,
      sortBy: 'totalSeconds',
      sortOrder: 'desc',
      userId,
    });
  });

  it('keeps report query and export date boundaries aligned', () => {
    const filters = {
      dateRange: [new Date(2026, 4, 1, 12), new Date(2026, 4, 2, 12)] as [
        Date,
        Date,
      ],
      groupBy: ['project'] as ['project'],
      memberId: null,
      projectId,
    };
    const expectedDateWindow = {
      dateFrom: startOfLocalDayIso(filters.dateRange[0]),
      dateTo: nextLocalDayStartIso(filters.dateRange[1]),
    };

    expect(toTimeReportQuery(filters, 2, 50)).toMatchObject({
      ...expectedDateWindow,
      limit: 50,
      page: 2,
      projectId,
    });
    expect(toTimeReportExportQuery(filters)).toMatchObject({
      ...expectedDateWindow,
      projectId,
    });
  });

  it('rejects invalid report date ranges before API calls', () => {
    expect(() =>
      toTimeReportQuery(
        {
          dateRange: [new Date(2026, 4, 3), new Date(2026, 4, 2)],
          groupBy: ['project'],
          memberId: null,
          projectId: null,
        },
        1,
        100,
      ),
    ).toThrow('End date must be after the start date.');
  });

  it('rejects invalid DatePicker dates before API calls', () => {
    expect(() =>
      toTimeReportQuery(
        {
          dateRange: [new Date(Number.NaN), new Date(2026, 4, 2)],
          groupBy: ['project'],
          memberId: null,
          projectId: null,
        },
        1,
        100,
      ),
    ).toThrow();
  });

  it('maps backend report rows into validated table rows', () => {
    const rows = toReportTableRows(response, {
      memberOptions: [],
      projectOptions: [{ label: 'Project Orion', value: projectId }],
      selectedMemberId: null,
      selectedProjectId: projectId,
    });

    expect(rows).toEqual([
      expect.objectContaining({
        id: `${projectId}:no-task:${userId}`,
        lastStartedAt: '2026-05-02T10:00:00.000Z',
        memberIds: [userId],
        memberName: 'Alex Admin',
        projectIds: [projectId],
        projectName: 'Project Orion',
        taskId: null,
        taskName: null,
        totalSeconds: 7200,
      }),
    ]);
  });

  it('validates table filters before local row filtering', () => {
    const row = makeLeafRow({});
    const invalidFilters = {
      ...createDefaultReportTableFilters(),
      hours: 'invalid',
    } as unknown as ReportTableFilters;

    expect(() => filterReportRows([row], invalidFilters)).toThrow();
  });

  it('filters non-billable rows without changing billable display values', () => {
    const filters = createDefaultReportTableFilters();
    filters.billable = 'withoutBillable';
    const rows: ReportTableRow[] = [
      makeLeafRow({
        billableSeconds: 1800,
        billableShare: 0.5,
        nonBillableSeconds: 1800,
      }),
      makeLeafRow({
        id: `${projectId}:no-task:${otherUserId}`,
        memberIds: [otherUserId],
        memberName: 'Nina PM',
      }),
    ];

    expect(filterReportRows(rows, filters)).toEqual([rows[0]]);
  });

  it('searches report rows using formatted duration labels', () => {
    const filters = createDefaultReportTableFilters();
    filters.global = '1h 01m';
    const rows: ReportTableRow[] = [
      makeLeafRow({
        billableShare: 0.98,
        memberIds: [],
        memberName: 'Member scope',
        nonBillableSeconds: 60,
        totalSeconds: 3660,
      }),
      makeLeafRow({
        billableSeconds: 1800,
        id: `${otherProjectId}:no-task:all-members`,
        memberIds: [],
        memberName: 'Member scope',
        projectIds: [otherProjectId],
        projectName: 'Billing API',
        totalSeconds: 1800,
      }),
    ];

    expect(filterReportRows(rows, filters)).toEqual([rows[0]]);

    filters.global = '1h 00m';

    expect(filterReportRows(rows, filters)).toEqual([rows[0]]);
  });

  it('searches report rows by task title', () => {
    const filters = createDefaultReportTableFilters();
    filters.global = 'checkout';
    const rows: ReportTableRow[] = [
      makeLeafRow({ taskId: 'task-1', taskName: 'Checkout revamp' }),
      makeLeafRow({
        id: `${projectId}:task-2:${userId}`,
        taskId: 'task-2',
        taskName: 'API integration',
      }),
    ];

    expect(filterReportRows(rows, filters)).toEqual([rows[0]]);
  });
});

describe('buildReportTree', () => {
  const leaves: ReportTableRow[] = [
    // Orion / Alex on two tasks
    makeLeafRow({
      id: `${projectId}:task-1:${userId}`,
      lastStartedAt: '2026-05-02T10:00:00.000Z',
      taskId: 'task-1',
      taskName: 'API integration',
      totalSeconds: 3600,
      billableSeconds: 3600,
      entryCount: 2,
    }),
    makeLeafRow({
      id: `${projectId}:task-2:${userId}`,
      billableSeconds: 0,
      billableShare: null,
      lastStartedAt: '2026-05-05T10:00:00.000Z',
      nonBillableSeconds: 1800,
      taskId: 'task-2',
      taskName: 'Checkout revamp',
      totalSeconds: 1800,
    }),
    // Orion / Nina on one task
    makeLeafRow({
      id: `${projectId}:task-1:${otherUserId}`,
      lastStartedAt: '2026-05-03T10:00:00.000Z',
      memberIds: [otherUserId],
      memberName: 'Nina PM',
      taskId: 'task-1',
      taskName: 'API integration',
      totalSeconds: 7200,
      billableSeconds: 7200,
    }),
    // Billing API / Nina
    makeLeafRow({
      id: `${otherProjectId}:task-3:${otherUserId}`,
      lastStartedAt: '2026-05-01T10:00:00.000Z',
      memberIds: [otherUserId],
      memberName: 'Nina PM',
      projectIds: [otherProjectId],
      projectName: 'Billing API',
      taskId: 'task-3',
      taskName: 'Webhooks',
      totalSeconds: 900,
      billableSeconds: 900,
    }),
  ];

  it('groups leaves per level and sums subtotals bottom-up', () => {
    const tree = buildReportTree(leaves, ['project', 'member', 'task']);

    expect(tree).toHaveLength(2);
    const [orion, billing] = tree;
    // heaviest project first
    expect(orion!.label).toBe('Project Orion');
    expect(orion!.totalSeconds).toBe(12600);
    expect(orion!.billableSeconds).toBe(10800);
    expect(orion!.entryCount).toBe(4);
    expect(orion!.billableShare).toBeCloseTo(10800 / 12600);
    expect(orion!.lastStartedAt).toBe('2026-05-05T10:00:00.000Z');
    expect(orion!.childCountLabel).toBe('2 members');
    expect(billing!.totalSeconds).toBe(900);
    expect(billing!.childCountLabel).toBe('1 member');

    const [nina, alex] = orion!.children;
    // siblings order by tracked time
    expect(nina!.label).toBe('Nina PM');
    expect(nina!.totalSeconds).toBe(7200);
    expect(alex!.label).toBe('Alex Admin');
    expect(alex!.totalSeconds).toBe(5400);
    expect(alex!.childCountLabel).toBe('2 tasks');

    const alexTasks = alex!.children.map((node) => node.label);
    expect(alexTasks).toEqual(['API integration', 'Checkout revamp']);
    expect(alex!.children.every((node) => node.isLeaf)).toBe(true);
  });

  it('builds a flat single-level tree for one dimension', () => {
    const tree = buildReportTree(leaves, ['member']);

    expect(tree).toHaveLength(2);
    expect(tree[0]!.label).toBe('Nina PM');
    expect(tree[0]!.totalSeconds).toBe(8100);
    expect(tree[0]!.isLeaf).toBe(true);
    expect(tree[0]!.childCountLabel).toBeNull();
  });

  it('rebuilds subtotals from filtered leaves only', () => {
    const filters = createDefaultReportTableFilters();
    filters.memberId = userId;
    const filtered = filterReportRows(leaves, filters);
    const tree = buildReportTree(filtered, ['project', 'member']);

    expect(tree).toHaveLength(1);
    expect(tree[0]!.totalSeconds).toBe(5400);
    expect(tree[0]!.childCountLabel).toBe('1 member');
  });

  it('returns an empty tree for no rows', () => {
    expect(buildReportTree([], ['project'])).toEqual([]);
  });
});

describe('flattenReportTree', () => {
  const tree = buildReportTree(
    [
      makeLeafRow({
        id: `${projectId}:task-1:${userId}`,
        taskId: 'task-1',
        taskName: 'API integration',
      }),
      makeLeafRow({
        id: `${otherProjectId}:task-3:${otherUserId}`,
        memberIds: [otherUserId],
        memberName: 'Nina PM',
        projectIds: [otherProjectId],
        projectName: 'Billing API',
        taskId: 'task-3',
        taskName: 'Webhooks',
        totalSeconds: 900,
        billableSeconds: 900,
      }),
    ],
    ['project', 'member'],
  );

  it('flattens depth-first with everything expanded by default', () => {
    const rows = flattenReportTree(tree, new Set());

    expect(rows.map((row) => [row.level, row.label])).toEqual([
      [0, 'Project Orion'],
      [1, 'Alex Admin'],
      [0, 'Billing API'],
      [1, 'Nina PM'],
    ]);
    expect(rows[0]!.hasChildren).toBe(true);
    expect(rows[1]!.isLeaf).toBe(true);
  });

  it('keeps collapsed nodes visible while hiding their subtree', () => {
    const collapsed = new Set([tree[0]!.id]);
    const rows = flattenReportTree(tree, collapsed);

    expect(rows.map((row) => row.label)).toEqual([
      'Project Orion',
      'Billing API',
      'Nina PM',
    ]);
    // subtotals stay on the collapsed row
    expect(rows[0]!.totalSeconds).toBe(3600);
  });
});

describe('sumReportRows', () => {
  it('sums totals and keeps the latest activity date', () => {
    const totals = sumReportRows([
      makeLeafRow({ lastStartedAt: '2026-05-01T10:00:00.000Z' }),
      makeLeafRow({
        billableSeconds: 0,
        billableShare: null,
        lastStartedAt: '2026-05-09T10:00:00.000Z',
        nonBillableSeconds: 1800,
        totalSeconds: 1800,
      }),
    ]);

    expect(totals).toEqual({
      billableSeconds: 3600,
      billableShare: 3600 / 5400,
      entryCount: 2,
      lastStartedAt: '2026-05-09T10:00:00.000Z',
      nonBillableSeconds: 1800,
      totalSeconds: 5400,
    });
  });
});

describe('getReportExportBlockedReason', () => {
  it('lets identity-only filters export under any grouping', () => {
    const filters = createDefaultReportTableFilters();
    filters.projectId = projectId;

    expect(getReportExportBlockedReason(filters, ['project'])).toBeNull();
    expect(getReportExportBlockedReason(filters, ['member'])).toBeNull();
    expect(
      getReportExportBlockedReason(filters, ['project', 'member', 'task']),
    ).toBeNull();
  });

  it('blocks label and aggregate filters regardless of grouping', () => {
    const searching = createDefaultReportTableFilters();
    searching.global = '1h 00m';
    const byHours = createDefaultReportTableFilters();
    byHours.hours = 'gte8';

    expect(getReportExportBlockedReason(searching, ['member'])).toContain(
      'cannot be exported',
    );
    expect(getReportExportBlockedReason(byHours, ['project'])).toContain(
      'cannot be exported',
    );
  });

  it('blocks a member filter only when no member level is grouped', () => {
    const filters = createDefaultReportTableFilters();
    filters.memberId = userId;

    // Rows without member identity total everyone on screen while a
    // userId-scoped export would return only this member's entries.
    expect(getReportExportBlockedReason(filters, ['project'])).toContain(
      'member grouping level',
    );
    expect(
      getReportExportBlockedReason(filters, ['project', 'task']),
    ).toContain('member grouping level');
    // Any grouping that includes a member level carries per-member sums.
    expect(getReportExportBlockedReason(filters, ['member'])).toBeNull();
    expect(
      getReportExportBlockedReason(filters, ['project', 'member']),
    ).toBeNull();
  });
});

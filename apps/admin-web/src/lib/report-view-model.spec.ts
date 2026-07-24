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
  filterReportTreeGroups,
  flattenReportTree,
  sumReportRows,
  sumReportTreeTotals,
  toReportTableRows,
  toTimeReportExportRequest,
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
    billable: null,
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
      billable: null,
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
    expect(toTimeReportExportRequest(filters)).toMatchObject({
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

  it('filters groups below the billable-hours threshold, keeping subtrees', () => {
    const filters = createDefaultReportTableFilters();
    filters.billable = 'gte8';
    const rows: ReportTableRow[] = [
      // Project Orion: 5h billable — under the 8h threshold, so it drops out.
      makeLeafRow({
        billableSeconds: 5 * 60 * 60,
        totalSeconds: 6 * 60 * 60,
      }),
      // Billing API: 10h billable — kept.
      makeLeafRow({
        billableSeconds: 10 * 60 * 60,
        id: `${otherProjectId}:no-task:${otherUserId}`,
        memberIds: [otherUserId],
        memberName: 'Nina PM',
        projectIds: [otherProjectId],
        projectName: 'Billing API',
        totalSeconds: 12 * 60 * 60,
      }),
    ];
    const tree = buildReportTree(rows, ['project']);

    const visible = filterReportTreeGroups(tree, filters);

    expect(visible.map((node) => node.label)).toEqual(['Billing API']);
  });

  it('splits leaves into billable and non-billable groups when grouped by billable', () => {
    const rows: ReportTableRow[] = [
      makeLeafRow({
        billableSeconds: 3600,
        billableShare: 2 / 3,
        nonBillableSeconds: 1800,
        totalSeconds: 5400,
      }),
    ];

    const tree = buildReportTree(rows, ['project', 'billable']);

    expect(tree).toHaveLength(1);
    const project = tree[0]!;
    // Heavier billable bucket sorts first.
    expect(project.children.map((child) => child.label)).toEqual([
      'Billable',
      'Non-billable',
    ]);
    const [billable, nonBillable] = project.children;
    expect(billable).toMatchObject({
      dimension: 'billable',
      totalSeconds: 3600,
      billableSeconds: 3600,
      nonBillableSeconds: 0,
    });
    expect(nonBillable).toMatchObject({
      dimension: 'billable',
      totalSeconds: 1800,
      billableSeconds: 0,
      nonBillableSeconds: 1800,
    });
    // The parent still totals both buckets.
    expect(project.totalSeconds).toBe(5400);
  });

  it('drops the empty bucket for a fully billable leaf', () => {
    const rows: ReportTableRow[] = [
      makeLeafRow({
        billableSeconds: 3600,
        billableShare: 1,
        nonBillableSeconds: 0,
        totalSeconds: 3600,
      }),
    ];

    const tree = buildReportTree(rows, ['billable']);

    expect(tree.map((node) => node.label)).toEqual(['Billable']);
    expect(tree[0]!.dimension).toBe('billable');
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

  it('filters groups by the hours their rows display, keeping subtrees', () => {
    const filters = createDefaultReportTableFilters();
    filters.hours = 'gte8';
    // Orion's displayed 12h come from two 6h leaves — a leaf-level comparison
    // would wrongly hide it.
    const rows: ReportTableRow[] = [
      makeLeafRow({ totalSeconds: 6 * 3600, billableSeconds: 3600 }),
      makeLeafRow({
        billableSeconds: 3600,
        id: `${projectId}:no-task:${otherUserId}`,
        memberIds: [otherUserId],
        memberName: 'Nina PM',
        totalSeconds: 6 * 3600,
      }),
      makeLeafRow({
        id: `${otherProjectId}:no-task:${otherUserId}`,
        memberIds: [otherUserId],
        memberName: 'Nina PM',
        projectIds: [otherProjectId],
        projectName: 'Billing API',
      }),
    ];
    const tree = buildReportTree(rows, ['project', 'member']);

    const visible = filterReportTreeGroups(tree, filters);

    expect(visible.map((node) => node.label)).toEqual(['Project Orion']);
    // the qualifying group keeps its whole subtree
    expect(visible[0]!.children).toHaveLength(2);

    filters.hours = 'gte40';
    expect(filterReportTreeGroups(tree, filters)).toEqual([]);
  });

  it('filters groups by their displayed billable share', () => {
    const filters = createDefaultReportTableFilters();
    const rows: ReportTableRow[] = [
      makeLeafRow({ billableShare: 0.95, billableSeconds: 3420 }),
      makeLeafRow({
        billableSeconds: 1440,
        billableShare: 0.4,
        id: `${otherProjectId}:no-task:${otherUserId}`,
        memberIds: [otherUserId],
        nonBillableSeconds: 2160,
        projectIds: [otherProjectId],
        projectName: 'Billing API',
      }),
    ];
    const tree = buildReportTree(rows, ['project']);

    filters.billableShare = 'gte90';
    expect(
      filterReportTreeGroups(tree, filters).map((node) => node.label),
    ).toEqual(['Project Orion']);

    filters.billableShare = 'below50';
    expect(
      filterReportTreeGroups(tree, filters).map((node) => node.label),
    ).toEqual(['Billing API']);

    filters.billableShare = 'any';
    expect(filterReportTreeGroups(tree, filters)).toHaveLength(2);
  });

  it('filters groups by last activity windows relative to now', () => {
    const now = new Date('2026-05-20T12:00:00.000Z');
    const filters = createDefaultReportTableFilters();
    const rows: ReportTableRow[] = [
      makeLeafRow({ lastStartedAt: '2026-05-20T08:00:00.000Z' }),
      makeLeafRow({
        id: `${otherProjectId}:no-task:${otherUserId}`,
        lastStartedAt: '2026-05-16T08:00:00.000Z',
        memberIds: [otherUserId],
        projectIds: [otherProjectId],
        projectName: 'Billing API',
      }),
      makeLeafRow({
        id: `task-3:${userId}`,
        lastStartedAt: '2026-04-25T08:00:00.000Z',
        projectIds: ['project-3'],
        projectName: 'Workspace Ops',
      }),
    ];
    const tree = buildReportTree(rows, ['project']);

    filters.activity = 'today';
    expect(
      filterReportTreeGroups(tree, filters, now).map((node) => node.label),
    ).toEqual(['Project Orion']);

    filters.activity = 'last7';
    // equal totals fall back to alphabetical sibling order
    expect(
      filterReportTreeGroups(tree, filters, now).map((node) => node.label),
    ).toEqual(['Billing API', 'Project Orion']);

    filters.activity = 'last30';
    expect(filterReportTreeGroups(tree, filters, now)).toHaveLength(3);
  });

  it('sums totals over the visible top-level groups', () => {
    const rows: ReportTableRow[] = [
      makeLeafRow({}),
      makeLeafRow({
        billableSeconds: 0,
        billableShare: null,
        id: `${otherProjectId}:no-task:${otherUserId}`,
        lastStartedAt: '2026-05-09T10:00:00.000Z',
        nonBillableSeconds: 1800,
        projectIds: [otherProjectId],
        projectName: 'Billing API',
        totalSeconds: 1800,
      }),
    ];
    const tree = buildReportTree(rows, ['project']);

    expect(sumReportTreeTotals(tree)).toEqual({
      billableSeconds: 3600,
      billableShare: 3600 / 5400,
      entryCount: 2,
      lastStartedAt: '2026-05-09T10:00:00.000Z',
      nonBillableSeconds: 1800,
      totalSeconds: 5400,
    });
    expect(sumReportTreeTotals([])).toMatchObject({
      totalSeconds: 0,
      billableShare: null,
    });
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

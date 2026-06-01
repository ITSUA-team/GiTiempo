import { describe, expect, it } from 'vitest';
import type { TimeReportResponse } from '@gitiempo/shared';
import {
  nextLocalDayStartIso,
  startOfLocalDayIso,
} from '@gitiempo/web-shared/time';

import {
  createDefaultReportTableFilters,
  filterReportRows,
  formatReportDuration,
  toReportTableRows,
  toTimeReportExportQuery,
  toTimeReportQuery,
  type ReportTableFilters,
  type ReportTableRow,
} from './report-view-model';

const projectId = '11111111-1111-4111-8111-111111111111';
const userId = '33333333-3333-4333-8333-333333333333';

const response: TimeReportResponse = {
  dateRange: {
    dateFrom: '2026-05-01T00:00:00.000Z',
    dateTo: '2026-06-01T00:00:00.000Z',
  },
  groupBy: 'user',
  items: [
    {
      billableSeconds: 3600,
      billableShare: 0.5,
      entryCount: 2,
      firstStartedAt: '2026-05-01T10:00:00.000Z',
      groupBy: 'user',
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
        groupBy: 'user',
        memberId: userId,
        projectId,
      },
      1,
      100,
    );

    expect(query).toMatchObject({
      groupBy: 'user',
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
      groupBy: 'project' as const,
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

  it('formats report durations with padded hour-minute labels', () => {
    expect(formatReportDuration(-1)).toBe('0m');
    expect(formatReportDuration(59)).toBe('0m');
    expect(formatReportDuration(3600)).toBe('1h 00m');
    expect(formatReportDuration(3660)).toBe('1h 01m');
  });

  it('rejects invalid report date ranges before API calls', () => {
    expect(() =>
      toTimeReportQuery(
        {
          dateRange: [new Date(2026, 4, 3), new Date(2026, 4, 2)],
          groupBy: 'project',
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
          groupBy: 'project',
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
        id: `user:${projectId}:no-task:${userId}`,
        memberIds: [userId],
        memberName: 'Alex Admin',
        projectIds: [projectId],
        projectName: 'Project Orion',
        totalSeconds: 7200,
      }),
    ]);
  });

  it('validates table filters before local row filtering', () => {
    const row: ReportTableRow = {
      billableSeconds: 3600,
      billableShare: 1,
      entryCount: 1,
      groupBy: 'user',
      id: `user:${projectId}:no-task:${userId}`,
      memberIds: [userId],
      memberName: 'Alex Admin',
      nonBillableSeconds: 0,
      projectIds: [projectId],
      projectName: 'Project Orion',
      totalSeconds: 3600,
    };
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
      {
        billableSeconds: 1800,
        billableShare: 0.5,
        entryCount: 1,
        groupBy: 'user',
        id: `user:${projectId}:no-task:${userId}`,
        memberIds: [userId],
        memberName: 'Alex Admin',
        nonBillableSeconds: 1800,
        projectIds: [projectId],
        projectName: 'Project Orion',
        totalSeconds: 3600,
      },
      {
        billableSeconds: 3600,
        billableShare: 1,
        entryCount: 1,
        groupBy: 'user',
        id: `user:${projectId}:no-task:other-user`,
        memberIds: ['33333333-3333-4333-8333-333333333334'],
        memberName: 'Nina PM',
        nonBillableSeconds: 0,
        projectIds: [projectId],
        projectName: 'Project Orion',
        totalSeconds: 3600,
      },
    ];

    expect(filterReportRows(rows, filters)).toEqual([rows[0]]);
  });

  it('searches report rows using formatted duration labels', () => {
    const filters = createDefaultReportTableFilters();
    filters.global = '1h 01m';
    const rows: ReportTableRow[] = [
      {
        billableSeconds: 3600,
        billableShare: 0.98,
        entryCount: 1,
        groupBy: 'project',
        id: `project:${projectId}:no-task:all-members`,
        memberIds: [],
        memberName: 'Member scope',
        nonBillableSeconds: 60,
        projectIds: [projectId],
        projectName: 'Project Orion',
        totalSeconds: 3660,
      },
      {
        billableSeconds: 1800,
        billableShare: 1,
        entryCount: 1,
        groupBy: 'project',
        id: 'project:other:no-task:all-members',
        memberIds: [],
        memberName: 'Member scope',
        nonBillableSeconds: 0,
        projectIds: ['11111111-1111-4111-8111-111111111112'],
        projectName: 'Billing API',
        totalSeconds: 1800,
      },
    ];

    expect(filterReportRows(rows, filters)).toEqual([rows[0]]);

    filters.global = '1h 00m';

    expect(filterReportRows(rows, filters)).toEqual([rows[0]]);
  });
});

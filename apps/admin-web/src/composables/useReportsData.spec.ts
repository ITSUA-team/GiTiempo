/* eslint-disable vue/one-component-per-file */
import { defineComponent, shallowRef } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ProjectListResponse,
  ProjectResponse,
  TimeEntryListResponse,
  TimeEntryResponse,
} from '@gitiempo/shared';

import {
  buildReportsCsv,
  createDefaultReportTableFilters,
  createReportsCsvDownload,
  deriveMemberOptions,
  deriveReportRows,
  deriveReportSummary,
  filterReportRows,
  formatReportDuration,
  formatReportPercent,
  useReportsData,
} from './useReportsData';

const workspaceId = '44444444-4444-4444-8444-444444444444';
const projectOrionId = '11111111-1111-4111-8111-111111111111';
const projectBillingId = '11111111-1111-4111-8111-111111111112';
const taskOrionId = '22222222-2222-4222-8222-222222222222';
const taskBillingId = '22222222-2222-4222-8222-222222222223';
const alexId = '33333333-3333-4333-8333-333333333333';
const ninaId = '33333333-3333-4333-8333-333333333334';

function createProject(
  id: string,
  name: string,
  members: ProjectResponse['members'] = [],
  totalHours = 1,
): ProjectResponse {
  return {
    color: null,
    createdAt: '2026-05-01T10:00:00.000Z',
    description: null,
    id,
    isActive: true,
    members,
    name,
    source: 'manual',
    totalHours,
    updatedAt: '2026-05-01T10:00:00.000Z',
    visibility: 'public',
    workspaceId,
  };
}

function createEntry({
  billable,
  durationSeconds,
  entryId,
  projectId,
  projectName,
  taskId,
  userId,
  userName,
}: {
  billable: boolean;
  durationSeconds: number;
  entryId: string;
  projectId: string;
  projectName: string;
  taskId: string;
  userId: string;
  userName: string;
}): TimeEntryResponse {
  return {
    createdAt: '2026-05-01T10:00:00.000Z',
    description: null,
    durationSeconds,
    endedAt: '2026-05-01T12:00:00.000Z',
    id: entryId,
    isBillable: billable,
    project: { id: projectId, name: projectName },
    projectId,
    source: 'manual',
    startedAt: '2026-05-01T10:00:00.000Z',
    task: { id: taskId, title: 'Implementation' },
    taskId,
    updatedAt: '2026-05-01T12:00:00.000Z',
    user: {
      avatarUrl: null,
      displayName: userName,
      email: `${userName.toLowerCase().replaceAll(' ', '.')}@example.com`,
      id: userId,
    },
    userId,
    workspaceId,
  };
}

const projects: ProjectListResponse = [
  createProject(projectOrionId, 'Project Orion', [
    {
      avatarUrl: null,
      displayName: 'Alex Admin',
      email: 'alex@example.com',
      role: 'admin',
      userId: alexId,
    },
  ]),
  createProject(projectBillingId, 'Billing API', [
    {
      avatarUrl: null,
      displayName: 'Nina PM',
      email: 'nina@example.com',
      role: 'pm',
      userId: ninaId,
    },
  ]),
];

const entries: TimeEntryResponse[] = [
  createEntry({
    billable: true,
    durationSeconds: 7200,
    entryId: '55555555-5555-4555-8555-555555555551',
    projectId: projectOrionId,
    projectName: 'Project Orion',
    taskId: taskOrionId,
    userId: alexId,
    userName: 'Alex Admin',
  }),
  createEntry({
    billable: false,
    durationSeconds: 3600,
    entryId: '55555555-5555-4555-8555-555555555552',
    projectId: projectOrionId,
    projectName: 'Project Orion',
    taskId: taskOrionId,
    userId: ninaId,
    userName: 'Nina PM',
  }),
  createEntry({
    billable: true,
    durationSeconds: 1800,
    entryId: '55555555-5555-4555-8555-555555555553',
    projectId: projectBillingId,
    projectName: 'Billing, API',
    taskId: taskBillingId,
    userId: ninaId,
    userName: 'Nina PM',
  }),
];

function emptyResponse(page = 1): TimeEntryListResponse {
  return {
    items: [],
    meta: { limit: 100, page, total: 0, totalPages: 0 },
  };
}

describe('reports data helpers', () => {
  it('derives scoped member options from visible project members and loaded rows', () => {
    expect(deriveMemberOptions(projects, entries)).toEqual([
      { label: 'Alex Admin', value: alexId },
      { label: 'Nina PM', value: ninaId },
    ]);
  });

  it('derives grouped rows and summary totals from time-entry responses', () => {
    const rows = deriveReportRows(entries, 'project');
    const summary = deriveReportSummary(entries);

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          billableSeconds: 1800,
          memberName: '1 member',
          projectName: 'Billing, API',
          totalSeconds: 1800,
        }),
        expect.objectContaining({
          billableSeconds: 7200,
          memberName: '2 members',
          projectName: 'Project Orion',
          totalSeconds: 10800,
        }),
      ]),
    );
    expect(formatReportDuration(summary.totalSeconds)).toBe('3h 30m');
    expect(formatReportDuration(summary.avgPerMemberSeconds)).toBe('1h 45m');
    expect(formatReportPercent(summary.billableShare)).toBe('71%');
    expect(summary.topProjectName).toBe('Project Orion');
  });

  it('filters visible report rows and builds escaped CSV output', () => {
    const rows = deriveReportRows(entries, 'project');
    const filters = createDefaultReportTableFilters();

    filters.global = 'billing';
    filters.billable = 'withBillable';

    const visibleRows = filterReportRows(rows, filters);
    const csv = buildReportsCsv(visibleRows);
    const download = createReportsCsvDownload(
      visibleRows,
      new Date('2026-05-13T12:00:00.000Z'),
    );

    expect(visibleRows).toHaveLength(1);
    expect(csv).toContain('"Billing, API",1 member,30m,30m,100%,1');
    expect(download.filename).toBe('gitiempo-reports-2026-05-13.csv');
  });
});

describe('useReportsData', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-13T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads active projects with tracked hours by default and debounces project/date refreshes', async () => {
    const accessToken = shallowRef('access-token');
    const listProjects = vi.fn().mockResolvedValue(projects);
    const listProjectEntries = vi.fn().mockResolvedValue(emptyResponse());
    let reports!: ReturnType<typeof useReportsData>;

    mount(
      defineComponent({
        setup() {
          reports = useReportsData({
            accessToken,
            projectsClient: { listProjects },
            reportsClient: { listProjectEntries },
          });
          return () => null;
        },
      }),
    );

    await flushPromises();

    expect(listProjects).toHaveBeenCalledTimes(1);
    expect(listProjectEntries).toHaveBeenCalledTimes(2);
    expect(listProjectEntries).toHaveBeenCalledWith(
      'access-token',
      projectBillingId,
      expect.objectContaining({
        dateFrom: new Date(2026, 4, 1).toISOString(),
        dateTo: new Date(2026, 4, 14).toISOString(),
        limit: 100,
        page: 1,
      }),
    );
    expect(listProjectEntries).toHaveBeenCalledWith(
      'access-token',
      projectOrionId,
      expect.objectContaining({
        dateFrom: new Date(2026, 4, 1).toISOString(),
        dateTo: new Date(2026, 4, 14).toISOString(),
        limit: 100,
        page: 1,
      }),
    );
    expect(reports.selectedProjectId.value).toBeNull();
    expect(reports.loadError.value).toBeNull();

    listProjectEntries.mockClear();
    reports.selectedProjectId.value = projectOrionId;
    reports.dateRange.value = [
      new Date('2026-05-01T12:00:00.000Z'),
      new Date('2026-05-02T12:00:00.000Z'),
    ];
    const expectedDateFrom = new Date(2026, 4, 1).toISOString();
    const expectedDateTo = new Date(2026, 4, 3).toISOString();

    await vi.advanceTimersByTimeAsync(299);
    expect(listProjectEntries).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();

    expect(listProjectEntries).toHaveBeenCalledTimes(1);
    expect(listProjectEntries).toHaveBeenCalledWith(
      'access-token',
      projectOrionId,
      expect.objectContaining({
        dateFrom: expectedDateFrom,
        dateTo: expectedDateTo,
        limit: 100,
        page: 1,
      }),
    );
  });

  it('keeps request errors distinct from empty report results', async () => {
    const accessToken = shallowRef('access-token');
    const listProjects = vi.fn().mockResolvedValue(projects.slice(0, 1));
    const listProjectEntries = vi.fn().mockRejectedValue(new Error('No scope'));
    const onError = vi.fn();
    let reports!: ReturnType<typeof useReportsData>;

    mount(
      defineComponent({
        setup() {
          reports = useReportsData({
            accessToken,
            onError,
            projectsClient: { listProjects },
            reportsClient: { listProjectEntries },
          });
          return () => null;
        },
      }),
    );

    await flushPromises();

    expect(reports.loadError.value).toBe('No scope');
    expect(reports.isEmpty.value).toBe(false);
    expect(onError).toHaveBeenCalledWith(
      'No scope',
      expect.any(Error),
      'load-reports',
    );
  });

  it('normalizes throttler errors into an actionable reports message', async () => {
    const accessToken = shallowRef('access-token');
    const listProjects = vi.fn().mockResolvedValue(projects.slice(0, 1));
    const listProjectEntries = vi
      .fn()
      .mockRejectedValue(new Error('ThrottlerException: Too Many Requests'));
    const onError = vi.fn();
    let reports!: ReturnType<typeof useReportsData>;

    mount(
      defineComponent({
        setup() {
          reports = useReportsData({
            accessToken,
            onError,
            projectsClient: { listProjects },
            reportsClient: { listProjectEntries },
          });
          return () => null;
        },
      }),
    );

    await flushPromises();

    expect(reports.loadError.value).toBe(
      'Too many report requests. Select a project and shorter date range, then try again.',
    );
    expect(onError).toHaveBeenCalledWith(
      'Too many report requests. Select a project and shorter date range, then try again.',
      expect.any(Error),
      'load-reports',
    );
  });
});

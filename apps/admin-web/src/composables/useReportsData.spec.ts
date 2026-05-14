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

import { useReportsData } from './useReportsData';

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
    totalHours: 1,
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
    projectName: 'Billing API',
    taskId: taskBillingId,
    userId: ninaId,
    userName: 'Nina PM',
  }),
];

function createEntryResponse(items: TimeEntryResponse[]): TimeEntryListResponse {
  return {
    items,
    meta: { limit: 100, page: 1, total: items.length, totalPages: 1 },
  };
}

describe('useReportsData', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-13T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads frontend table rows as project-member time breakdowns', async () => {
    const accessToken = shallowRef('access-token');
    const listProjects = vi.fn().mockResolvedValue(projects);
    const listProjectEntries = vi.fn(
      async (
        _accessToken: string,
        projectId: string,
      ): Promise<TimeEntryListResponse> =>
        createEntryResponse(entries.filter((entry) => entry.projectId === projectId)),
    );
    const exportTimeReport = vi.fn();
    const getTimeReport = vi.fn();
    let reports!: ReturnType<typeof useReportsData>;

    mount(
      defineComponent({
        setup() {
          reports = useReportsData({
            accessToken,
            projectsClient: { listProjects },
            reportsClient: { exportTimeReport, getTimeReport, listProjectEntries },
          });
          return () => null;
        },
      }),
    );

    await flushPromises();

    expect(getTimeReport).not.toHaveBeenCalled();
    expect(listProjectEntries).toHaveBeenCalledTimes(2);
    expect(reports.rows.value).toEqual([
      expect.objectContaining({
        memberName: 'Nina PM',
        projectName: 'Billing API',
        totalSeconds: 1800,
      }),
      expect.objectContaining({
        memberName: 'Alex Admin',
        projectName: 'Project Orion',
        totalSeconds: 7200,
      }),
      expect.objectContaining({
        memberName: 'Nina PM',
        projectName: 'Project Orion',
        totalSeconds: 3600,
      }),
    ]);
    expect(reports.summary.value.totalSeconds).toBe(12600);
  });

  it('debounces project/date table refreshes without applying export group-by to the table', async () => {
    const accessToken = shallowRef('access-token');
    const listProjects = vi.fn().mockResolvedValue(projects);
    const listProjectEntries = vi.fn().mockResolvedValue(createEntryResponse([]));
    const exportTimeReport = vi.fn();
    const getTimeReport = vi.fn();
    let reports!: ReturnType<typeof useReportsData>;

    mount(
      defineComponent({
        setup() {
          reports = useReportsData({
            accessToken,
            projectsClient: { listProjects },
            reportsClient: { exportTimeReport, getTimeReport, listProjectEntries },
          });
          return () => null;
        },
      }),
    );

    await flushPromises();
    listProjectEntries.mockClear();

    reports.selectedProjectId.value = projectOrionId;
    reports.groupBy.value = 'user';
    reports.dateRange.value = [
      new Date('2026-05-01T12:00:00.000Z'),
      new Date('2026-05-02T12:00:00.000Z'),
    ];

    await vi.advanceTimersByTimeAsync(299);
    expect(listProjectEntries).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();

    expect(listProjectEntries).toHaveBeenCalledTimes(1);
    expect(listProjectEntries).toHaveBeenCalledWith(
      'access-token',
      projectOrionId,
      expect.objectContaining({
        dateFrom: new Date(2026, 4, 1).toISOString(),
        dateTo: new Date(2026, 4, 3).toISOString(),
        limit: 100,
        page: 1,
      }),
    );
  });

  it('exports through the reports API using explicit export setup controls', async () => {
    const accessToken = shallowRef('access-token');
    const listProjects = vi.fn().mockResolvedValue(projects);
    const listProjectEntries = vi.fn().mockResolvedValue(createEntryResponse(entries));
    const exportTimeReport = vi.fn().mockResolvedValue({
      blob: new Blob(['csv'], { type: 'text/csv' }),
      filename: 'time-report.csv',
    });
    const getTimeReport = vi.fn();
    let reports!: ReturnType<typeof useReportsData>;

    mount(
      defineComponent({
        setup() {
          reports = useReportsData({
            accessToken,
            projectsClient: { listProjects },
            reportsClient: { exportTimeReport, getTimeReport, listProjectEntries },
          });
          return () => null;
        },
      }),
    );

    await flushPromises();

    const result = await reports.exportCurrentReport({
      dateRange: null,
      groupBy: 'user',
      memberId: ninaId,
      projectId: projectBillingId,
    });

    expect(result?.filename).toBe('time-report.csv');
    expect(exportTimeReport).toHaveBeenCalledWith(
      'access-token',
      expect.objectContaining({
        groupBy: 'user',
        projectId: projectBillingId,
        sortBy: 'totalSeconds',
        sortOrder: 'desc',
        userId: ninaId,
      }),
    );
  });

  it('blocks invalid table date ranges before refresh and export requests', async () => {
    const accessToken = shallowRef('access-token');
    const listProjects = vi.fn().mockResolvedValue(projects);
    const listProjectEntries = vi.fn().mockResolvedValue(createEntryResponse([]));
    const exportTimeReport = vi.fn();
    const getTimeReport = vi.fn();
    let reports!: ReturnType<typeof useReportsData>;

    mount(
      defineComponent({
        setup() {
          reports = useReportsData({
            accessToken,
            projectsClient: { listProjects },
            reportsClient: { exportTimeReport, getTimeReport, listProjectEntries },
          });
          return () => null;
        },
      }),
    );

    await flushPromises();
    listProjectEntries.mockClear();

    reports.dateRange.value = [
      new Date('2026-05-03T12:00:00.000Z'),
      new Date('2026-05-02T12:00:00.000Z'),
    ];

    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();

    expect(listProjectEntries).not.toHaveBeenCalled();
    await expect(
      reports.exportCurrentReport({
        dateRange: reports.dateRange.value,
        groupBy: 'project',
        memberId: null,
        projectId: null,
      }),
    ).rejects.toThrow('End date must be after the start date.');
    expect(exportTimeReport).not.toHaveBeenCalled();
  });

  it('keeps request errors distinct from empty report results', async () => {
    const accessToken = shallowRef('access-token');
    const listProjects = vi.fn().mockResolvedValue(projects.slice(0, 1));
    const listProjectEntries = vi.fn().mockRejectedValue(new Error('No scope'));
    const exportTimeReport = vi.fn();
    const getTimeReport = vi.fn();
    const onError = vi.fn();
    let reports!: ReturnType<typeof useReportsData>;

    mount(
      defineComponent({
        setup() {
          reports = useReportsData({
            accessToken,
            onError,
            projectsClient: { listProjects },
            reportsClient: { exportTimeReport, getTimeReport, listProjectEntries },
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
});

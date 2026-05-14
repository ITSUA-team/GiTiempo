/* eslint-disable vue/one-component-per-file */
import { defineComponent, shallowRef } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ProjectListResponse,
  ProjectResponse,
  TimeReportResponse,
  TimeReportUserRow,
} from '@gitiempo/shared';

import { useReportsData } from './useReportsData';

const workspaceId = '44444444-4444-4444-8444-444444444444';
const projectOrionId = '11111111-1111-4111-8111-111111111111';
const projectBillingId = '11111111-1111-4111-8111-111111111112';
const alexId = '33333333-3333-4333-8333-333333333333';
const ninaId = '33333333-3333-4333-8333-333333333334';

function createProject(
  id: string,
  name: string,
  members: ProjectResponse['members'] = [],
  overrides: Partial<ProjectResponse> = {},
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
    ...overrides,
  };
}

function createUserReportRow({
  billableSeconds,
  displayName,
  email,
  entryCount,
  totalSeconds,
  userId,
}: {
  billableSeconds: number;
  displayName: string;
  email: string;
  entryCount: number;
  totalSeconds: number;
  userId: string;
}): TimeReportUserRow {
  return {
    billableSeconds,
    billableShare: totalSeconds > 0 ? billableSeconds / totalSeconds : null,
    entryCount,
    firstStartedAt: '2026-05-01T10:00:00.000Z',
    groupBy: 'user',
    lastStartedAt: '2026-05-01T12:00:00.000Z',
    nonBillableSeconds: Math.max(0, totalSeconds - billableSeconds),
    project: null,
    task: null,
    totalSeconds,
    user: {
      avatarUrl: null,
      displayName,
      email,
      id: userId,
    },
  };
}

function createReportResponse(items: TimeReportUserRow[]): TimeReportResponse {
  const totalSeconds = items.reduce((total, item) => total + item.totalSeconds, 0);
  const billableSeconds = items.reduce(
    (total, item) => total + item.billableSeconds,
    0,
  );

  return {
    dateRange: {
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-06-01T00:00:00.000Z',
    },
    groupBy: 'user',
    items,
    meta: { limit: 100, page: 1, total: items.length, totalPages: 1 },
    summary: {
      billableSeconds,
      billableShare: totalSeconds > 0 ? billableSeconds / totalSeconds : null,
      entryCount: items.reduce((total, item) => total + item.entryCount, 0),
      nonBillableSeconds: Math.max(0, totalSeconds - billableSeconds),
      totalSeconds,
    },
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
    {
      avatarUrl: null,
      displayName: 'Nina PM',
      email: 'nina@example.com',
      role: 'pm',
      userId: ninaId,
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

const reportRowsByProject = new Map<string, TimeReportUserRow[]>([
  [
    projectOrionId,
    [
      createUserReportRow({
        billableSeconds: 7200,
        displayName: 'Alex Admin',
        email: 'alex@example.com',
        entryCount: 1,
        totalSeconds: 7200,
        userId: alexId,
      }),
      createUserReportRow({
        billableSeconds: 0,
        displayName: 'Nina PM',
        email: 'nina@example.com',
        entryCount: 1,
        totalSeconds: 3600,
        userId: ninaId,
      }),
    ],
  ],
  [
    projectBillingId,
    [
      createUserReportRow({
        billableSeconds: 1800,
        displayName: 'Nina PM',
        email: 'nina@example.com',
        entryCount: 1,
        totalSeconds: 1800,
        userId: ninaId,
      }),
    ],
  ],
]);

function createReportsClientMocks() {
  return {
    exportTimeReport: vi.fn(),
    getTimeReport: vi.fn(async (_token: string, query: { projectId?: string }) =>
      createReportResponse(reportRowsByProject.get(query.projectId ?? '') ?? []),
    ),
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

  it('loads backend-generated project-member report rows', async () => {
    const accessToken = shallowRef('access-token');
    const listProjects = vi.fn().mockResolvedValue(projects);
    const reportsClient = createReportsClientMocks();
    let reports!: ReturnType<typeof useReportsData>;

    mount(
      defineComponent({
        setup() {
          reports = useReportsData({
            accessToken,
            projectsClient: { listProjects },
            reportsClient,
          });
          return () => null;
        },
      }),
    );

    await flushPromises();

    expect(reportsClient.getTimeReport).toHaveBeenCalledTimes(2);
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
    expect(reports.summary.value.entryCount).toBe(3);
  });

  it('keeps active public and assigned private projects in PM-visible report scope', async () => {
    const accessToken = shallowRef('access-token');
    const scopedProjects: ProjectListResponse = [
      createProject(projectOrionId, 'Public Roadmap', [
        {
          avatarUrl: null,
          displayName: 'Alex Admin',
          email: 'alex@example.com',
          role: 'admin',
          userId: alexId,
        },
      ]),
      createProject(
        projectBillingId,
        'Private Assigned',
        [
          {
            avatarUrl: null,
            displayName: 'Nina PM',
            email: 'nina@example.com',
            role: 'pm',
            userId: ninaId,
          },
        ],
        { visibility: 'private' },
      ),
    ];
    const listProjects = vi.fn().mockResolvedValue(scopedProjects);
    const reportsClient = createReportsClientMocks();
    let reports!: ReturnType<typeof useReportsData>;

    mount(
      defineComponent({
        setup() {
          reports = useReportsData({
            accessToken,
            projectsClient: { listProjects },
            reportsClient,
          });
          return () => null;
        },
      }),
    );

    await flushPromises();

    expect(reports.projectOptions.value).toEqual([
      { label: 'Private Assigned', value: projectBillingId },
      { label: 'Public Roadmap', value: projectOrionId },
    ]);
    expect(reportsClient.getTimeReport).toHaveBeenCalledWith(
      'access-token',
      expect.objectContaining({ projectId: projectOrionId }),
    );
    expect(reportsClient.getTimeReport).toHaveBeenCalledWith(
      'access-token',
      expect.objectContaining({ projectId: projectBillingId }),
    );
  });

  it('debounces project/date table refreshes without applying export group-by to the table', async () => {
    const accessToken = shallowRef('access-token');
    const listProjects = vi.fn().mockResolvedValue(projects);
    const reportsClient = createReportsClientMocks();
    let reports!: ReturnType<typeof useReportsData>;

    mount(
      defineComponent({
        setup() {
          reports = useReportsData({
            accessToken,
            projectsClient: { listProjects },
            reportsClient,
          });
          return () => null;
        },
      }),
    );

    await flushPromises();
    reportsClient.getTimeReport.mockClear();

    reports.selectedProjectId.value = projectOrionId;
    reports.groupBy.value = 'project';
    reports.dateRange.value = [
      new Date('2026-05-01T12:00:00.000Z'),
      new Date('2026-05-02T12:00:00.000Z'),
    ];

    await vi.advanceTimersByTimeAsync(299);
    expect(reportsClient.getTimeReport).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();

    expect(reportsClient.getTimeReport).toHaveBeenCalledTimes(1);
    expect(reportsClient.getTimeReport).toHaveBeenCalledWith(
      'access-token',
      expect.objectContaining({
        dateFrom: new Date(2026, 4, 1).toISOString(),
        dateTo: new Date(2026, 4, 3).toISOString(),
        groupBy: 'user',
        limit: 100,
        page: 1,
        projectId: projectOrionId,
      }),
    );
  });

  it('exports through the reports API using explicit export setup controls', async () => {
    const accessToken = shallowRef('access-token');
    const listProjects = vi.fn().mockResolvedValue(projects);
    const reportsClient = createReportsClientMocks();
    reportsClient.exportTimeReport.mockResolvedValue({
      blob: new Blob(['csv'], { type: 'text/csv' }),
      filename: 'time-report.csv',
    });
    let reports!: ReturnType<typeof useReportsData>;

    mount(
      defineComponent({
        setup() {
          reports = useReportsData({
            accessToken,
            projectsClient: { listProjects },
            reportsClient,
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
    expect(reportsClient.exportTimeReport).toHaveBeenCalledWith(
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
    const reportsClient = createReportsClientMocks();
    let reports!: ReturnType<typeof useReportsData>;

    mount(
      defineComponent({
        setup() {
          reports = useReportsData({
            accessToken,
            projectsClient: { listProjects },
            reportsClient,
          });
          return () => null;
        },
      }),
    );

    await flushPromises();
    reportsClient.getTimeReport.mockClear();

    reports.dateRange.value = [
      new Date('2026-05-03T12:00:00.000Z'),
      new Date('2026-05-02T12:00:00.000Z'),
    ];

    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();

    expect(reportsClient.getTimeReport).not.toHaveBeenCalled();
    await expect(
      reports.exportCurrentReport({
        dateRange: reports.dateRange.value,
        groupBy: 'project',
        memberId: null,
        projectId: null,
      }),
    ).rejects.toThrow('End date must be after the start date.');
    expect(reportsClient.exportTimeReport).not.toHaveBeenCalled();
  });

  it('keeps request errors distinct from empty report results', async () => {
    const accessToken = shallowRef('access-token');
    const listProjects = vi.fn().mockResolvedValue(projects.slice(0, 1));
    const reportsClient = createReportsClientMocks();
    reportsClient.getTimeReport.mockRejectedValue(new Error('No scope'));
    const onError = vi.fn();
    let reports!: ReturnType<typeof useReportsData>;

    mount(
      defineComponent({
        setup() {
          reports = useReportsData({
            accessToken,
            onError,
            projectsClient: { listProjects },
            reportsClient,
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

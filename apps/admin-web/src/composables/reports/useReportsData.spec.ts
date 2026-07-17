/* eslint-disable vue/one-component-per-file */
import { defineComponent, ref, shallowRef } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ProjectListResponse,
  ProjectResponse,
  TimeReportResponse,
  TimeReportRow,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';

import { createTestQueryPlugin } from '@/test/query-client';
import { useReportsData } from './useReportsData';

const workspaceId = '44444444-4444-4444-8444-444444444444';
const projectOrionId = '11111111-1111-4111-8111-111111111111';
const projectBillingId = '11111111-1111-4111-8111-111111111112';
const alexId = '33333333-3333-4333-8333-333333333333';
const ninaId = '33333333-3333-4333-8333-333333333334';
const zoeId = '33333333-3333-4333-8333-333333333335';

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
    totalSeconds: 3600,
    updatedAt: '2026-05-01T10:00:00.000Z',
    visibility: 'public',
    workspaceId,
    ...overrides,
    defaultBillableForTasks: overrides.defaultBillableForTasks ?? true,
  };
}

function createLeafReportRow({
  billableSeconds,
  displayName,
  email,
  entryCount,
  project,
  totalSeconds,
  userId,
}: {
  billableSeconds: number;
  displayName: string;
  email: string;
  entryCount: number;
  project: { id: string; name: string };
  totalSeconds: number;
  userId: string;
}): TimeReportRow {
  return {
    billableSeconds,
    billableShare: totalSeconds > 0 ? billableSeconds / totalSeconds : null,
    entryCount,
    firstStartedAt: '2026-05-01T10:00:00.000Z',
    lastStartedAt: '2026-05-01T12:00:00.000Z',
    nonBillableSeconds: Math.max(0, totalSeconds - billableSeconds),
    project,
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

function createReportResponse(items: TimeReportRow[]): TimeReportResponse {
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
    groupBy: ['project', 'user', 'task'],
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

const workspaceMembers: WorkspaceMemberListResponse = [
  {
    avatarUrl: null,
    displayName: 'Alex Admin',
    email: 'alex@example.com',
    id: '55555555-5555-4555-8555-555555555551',
    joinedAt: '2026-05-01T10:00:00.000Z',
    lastActiveAt: null,
    projectsAssignedCount: 1,
    role: 'admin',
    userId: alexId,
    workspaceId,
  },
  {
    avatarUrl: null,
    displayName: 'Nina PM',
    email: 'nina@example.com',
    id: '55555555-5555-4555-8555-555555555552',
    joinedAt: '2026-05-01T10:00:00.000Z',
    lastActiveAt: null,
    projectsAssignedCount: 2,
    role: 'pm',
    userId: ninaId,
    workspaceId,
  },
  {
    avatarUrl: null,
    displayName: 'Zoe Analyst',
    email: 'zoe@example.com',
    id: '55555555-5555-4555-8555-555555555553',
    joinedAt: '2026-05-01T10:00:00.000Z',
    lastActiveAt: null,
    projectsAssignedCount: 0,
    role: 'member',
    userId: zoeId,
    workspaceId,
  },
];

const reportRowsByProject = new Map<string, TimeReportRow[]>([
  [
    projectOrionId,
    [
      createLeafReportRow({
        billableSeconds: 7200,
        displayName: 'Alex Admin',
        email: 'alex@example.com',
        entryCount: 1,
        project: { id: projectOrionId, name: 'Project Orion' },
        totalSeconds: 7200,
        userId: alexId,
      }),
      createLeafReportRow({
        billableSeconds: 0,
        displayName: 'Nina PM',
        email: 'nina@example.com',
        entryCount: 1,
        project: { id: projectOrionId, name: 'Project Orion' },
        totalSeconds: 3600,
        userId: ninaId,
      }),
    ],
  ],
  [
    projectBillingId,
    [
      createLeafReportRow({
        billableSeconds: 1800,
        displayName: 'Nina PM',
        email: 'nina@example.com',
        entryCount: 1,
        project: { id: projectBillingId, name: 'Billing API' },
        totalSeconds: 1800,
        userId: ninaId,
      }),
    ],
  ],
]);

function mountWithQuery(component: Parameters<typeof mount>[0]) {
  return mount(component, {
    global: {
      plugins: [createTestQueryPlugin()],
    },
  });
}

function createReportsClientMocks() {
  return {
    exportTimeReport: vi.fn(),
    getTimeReport: vi.fn(async (query: { projectId?: string }) =>
      createReportResponse(reportRowsByProject.get(query.projectId ?? '') ?? []),
    ),
  };
}

function createMembersClientMocks(members = workspaceMembers) {
  return {
    listMembers: vi.fn().mockResolvedValue(members),
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

  function createScope(role: 'admin' | 'pm' = 'admin') {
    return shallowRef({
      role,
      userId: 'user-1',
      workspaceId: 'workspace-1',
    });
  }

  it('loads finest-granularity leaf rows once for every grouping', async () => {
    const enabled = ref(true);
    const listProjects = vi.fn().mockResolvedValue(projects);
    const membersClient = createMembersClientMocks();
    const reportsClient = createReportsClientMocks();
    let reports!: ReturnType<typeof useReportsData>;

    mountWithQuery(
      defineComponent({
        setup() {
          reports = useReportsData({
            enabled,
            membersClient,
            projectsClient: { listProjects },
            reportsClient,
            scope: createScope(),
          });
          return () => null;
        },
      }),
    );

    await flushPromises();

    expect(reportsClient.getTimeReport).toHaveBeenCalledTimes(2);
    expect(membersClient.listMembers).toHaveBeenCalledTimes(1);
    expect(reports.memberOptions.value).toEqual([
      { label: 'Alex Admin', value: alexId },
      { label: 'Nina PM', value: ninaId },
      { label: 'Zoe Analyst', value: zoeId },
    ]);
    // Rows are project-member-task leaves; the table folds them into the
    // configured grouping tree, so every path presents from this one fetch.
    expect(reports.grouping.value).toEqual(['project']);
    expect(reports.rows.value).toEqual([
      expect.objectContaining({
        memberIds: [ninaId],
        memberName: 'Nina PM',
        projectName: 'Billing API',
        totalSeconds: 1800,
      }),
      expect.objectContaining({
        memberIds: [alexId],
        memberName: 'Alex Admin',
        projectName: 'Project Orion',
        totalSeconds: 7200,
      }),
      expect.objectContaining({
        memberIds: [ninaId],
        memberName: 'Nina PM',
        projectName: 'Project Orion',
        totalSeconds: 3600,
      }),
    ]);
    expect(reports.summary.value.totalSeconds).toBe(12600);
    expect(reports.summary.value.entryCount).toBe(3);
  });

  it('keeps active public and assigned private projects in PM-visible report scope', async () => {
    const enabled = ref(true);
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
    const membersClient = createMembersClientMocks();
    const reportsClient = createReportsClientMocks();
    let reports!: ReturnType<typeof useReportsData>;

    mountWithQuery(
      defineComponent({
        setup() {
          reports = useReportsData({
            enabled,
            membersClient,
            projectsClient: { listProjects },
            reportsClient,
            scope: createScope('pm'),
          });
          return () => null;
        },
      }),
    );

    await flushPromises();

    expect(membersClient.listMembers).not.toHaveBeenCalled();
    expect(reports.projectOptions.value).toEqual([
      { label: 'Private Assigned', value: projectBillingId },
      { label: 'Public Roadmap', value: projectOrionId },
    ]);
    expect(reports.memberOptions.value).toEqual([
      { label: 'Alex Admin', value: alexId },
      { label: 'Nina PM', value: ninaId },
    ]);
    expect(reportsClient.getTimeReport).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: projectOrionId }),
    );
    expect(reportsClient.getTimeReport).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: projectBillingId }),
    );
  });

  it('refetches rows and scopes export when the date range changes', async () => {
    const enabled = ref(true);
    const listProjects = vi.fn().mockResolvedValue(projects);
    const membersClient = createMembersClientMocks();
    const reportsClient = createReportsClientMocks();
    reportsClient.exportTimeReport.mockResolvedValue({
      blob: new Blob(['csv'], { type: 'text/csv' }),
      filename: 'time-report.csv',
    });
    let reports!: ReturnType<typeof useReportsData>;

    mountWithQuery(
      defineComponent({
        setup() {
          reports = useReportsData({
            enabled,
            membersClient,
            projectsClient: { listProjects },
            reportsClient,
            scope: createScope(),
          });
          return () => null;
        },
      }),
    );

    await flushPromises();
    reportsClient.getTimeReport.mockClear();

    reports.dateRange.value = [
      new Date('2026-05-01T12:00:00.000Z'),
      new Date('2026-05-02T12:00:00.000Z'),
    ];

    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();

    expect(reportsClient.getTimeReport).toHaveBeenCalledWith(
      expect.objectContaining({
        dateFrom: new Date(2026, 4, 1).toISOString(),
        dateTo: new Date(2026, 4, 3).toISOString(),
      }),
    );

    // Export scope is always stated explicitly; there is no default that could
    // silently export an unfiltered report.
    await reports.exportCurrentReport({
      dateRange: reports.dateRange.value,
      groupBy: ['project'],
      memberId: null,
      projectId: null,
    });
    await flushPromises();

    expect(reportsClient.exportTimeReport).toHaveBeenCalledWith(
      expect.objectContaining({
        dateFrom: new Date(2026, 4, 1).toISOString(),
        dateTo: new Date(2026, 4, 3).toISOString(),
        groupBy: ['project'],
      }),
    );
  });

  it('keeps loaded leaf rows without refetching when grouping changes', async () => {
    const enabled = ref(true);
    const listProjects = vi.fn().mockResolvedValue(projects);
    const membersClient = createMembersClientMocks();
    const reportsClient = createReportsClientMocks();
    let reports!: ReturnType<typeof useReportsData>;

    mountWithQuery(
      defineComponent({
        setup() {
          reports = useReportsData({
            enabled,
            membersClient,
            projectsClient: { listProjects },
            reportsClient,
            scope: createScope(),
          });
          return () => null;
        },
      }),
    );

    await flushPromises();
    const projectTotal = reports.summary.value.totalSeconds;
    reportsClient.getTimeReport.mockClear();

    reports.grouping.value = ['member', 'project'];
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();

    // Every grouping path is presented from the same leaf rows, so changing it
    // must not re-walk the project loop for identical data.
    expect(reportsClient.getTimeReport).not.toHaveBeenCalled();
    expect(reports.rows.value).toHaveLength(3);
    // Regrouping must not move the totals.
    expect(reports.summary.value.totalSeconds).toBe(projectTotal);
  });

  it('exports through the reports API using explicit export setup controls', async () => {
    const enabled = ref(true);
    const listProjects = vi.fn().mockResolvedValue(projects);
    const membersClient = createMembersClientMocks();
    const reportsClient = createReportsClientMocks();
    reportsClient.exportTimeReport.mockResolvedValue({
      blob: new Blob(['csv'], { type: 'text/csv' }),
      filename: 'time-report.csv',
    });
    let reports!: ReturnType<typeof useReportsData>;

    mountWithQuery(
      defineComponent({
        setup() {
          reports = useReportsData({
            enabled,
            membersClient,
            projectsClient: { listProjects },
            reportsClient,
            scope: createScope(),
          });
          return () => null;
        },
      }),
    );

    await flushPromises();

    const result = await reports.exportCurrentReport({
      dateRange: null,
      groupBy: ['user'],
      memberId: ninaId,
      projectId: projectBillingId,
    });

    expect(result?.filename).toBe('time-report.csv');
    expect(reportsClient.exportTimeReport).toHaveBeenCalledWith(
      expect.objectContaining({
        groupBy: ['user'],
        projectId: projectBillingId,
        sortBy: 'totalSeconds',
        sortOrder: 'desc',
        userId: ninaId,
      }),
    );
  });

  it('blocks invalid setup date ranges before export without refreshing table data', async () => {
    const enabled = ref(true);
    const listProjects = vi.fn().mockResolvedValue(projects);
    const membersClient = createMembersClientMocks();
    const reportsClient = createReportsClientMocks();
    let reports!: ReturnType<typeof useReportsData>;

    mountWithQuery(
      defineComponent({
        setup() {
          reports = useReportsData({
            enabled,
            membersClient,
            projectsClient: { listProjects },
            reportsClient,
            scope: createScope(),
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
        groupBy: ['project'],
        memberId: null,
        projectId: null,
      }),
    ).rejects.toThrow('End date must be after the start date.');
    expect(reportsClient.exportTimeReport).not.toHaveBeenCalled();
  });

  it('keeps admin reports in request-error state when workspace member options fail', async () => {
    const enabled = ref(true);
    const listProjects = vi.fn().mockResolvedValue(projects);
    const membersClient = {
      listMembers: vi.fn().mockRejectedValue(new Error('Members unavailable')),
    };
    const reportsClient = createReportsClientMocks();
    const onError = vi.fn();
    let reports!: ReturnType<typeof useReportsData>;

    mountWithQuery(
      defineComponent({
        setup() {
          reports = useReportsData({
            enabled,
            membersClient,
            onError,
            projectsClient: { listProjects },
            reportsClient,
            scope: createScope(),
          });
          return () => null;
        },
      }),
    );

    await flushPromises();

    expect(reports.loadError.value).toBe('Members unavailable');
    expect(reports.isEmpty.value).toBe(false);
    expect(onError).toHaveBeenCalledWith(
      'Members unavailable',
      expect.any(Error),
      'load-reports',
    );
  });

  it('keeps request errors distinct from empty report results', async () => {
    const enabled = ref(true);
    const listProjects = vi.fn().mockResolvedValue(projects.slice(0, 1));
    const membersClient = createMembersClientMocks();
    const reportsClient = createReportsClientMocks();
    reportsClient.getTimeReport.mockRejectedValue(new Error('No scope'));
    const onError = vi.fn();
    let reports!: ReturnType<typeof useReportsData>;

    mountWithQuery(
      defineComponent({
        setup() {
          reports = useReportsData({
            enabled,
            membersClient,
            onError,
            projectsClient: { listProjects },
            reportsClient,
            scope: createScope(),
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

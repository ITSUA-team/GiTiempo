import { defineComponent, onMounted, shallowRef } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import type {
  ManagementProjectSummaryResponse,
  ProjectResponse,
  TimeReportProjectRow,
  TimeReportResponse,
  WorkspaceInviteResponse,
  WorkspaceMemberResponse,
} from '@gitiempo/shared';

import { ADMIN_DASHBOARD_REPORT_PAGE_LIMIT } from '@/constants/admin-dashboard';
import { getDashboardWeekRange } from '@/lib/admin-dashboard-view-model';
import { createTestQueryPlugin } from '@/test/query-client';
import { useAdminDashboardData } from './useAdminDashboardData';

const workspaceId = '33333333-3333-4333-8333-333333333333';
const now = new Date('2026-05-13T12:00:00.000Z');

function createMember(
  id: string,
  displayName: string,
  lastActiveAt: string | null,
): WorkspaceMemberResponse {
  return {
    avatarUrl: null,
    displayName,
    email: `${id}@example.com`,
    id,
    joinedAt: '2026-05-01T10:00:00.000Z',
    lastActiveAt,
    projectsAssignedCount: 1,
    role: 'member',
    userId: `${id}-user`,
    workspaceId,
  };
}

function createInvite(
  id: string,
  createdAt: string,
): WorkspaceInviteResponse {
  return {
    createdAt,
    email: `${id}@example.com`,
    expiresAt: '2026-05-20T10:00:00.000Z',
    id,
    invitedBy: '55555555-5555-4555-8555-555555555555',
    role: 'member',
    status: 'pending',
    workspaceId,
  };
}

function createProject(
  id: string,
  name: string,
  updatedAt: string,
): ProjectResponse {
  return {
    color: null,
    createdAt: '2026-05-01T10:00:00.000Z',
    description: null,
    id,
    isActive: true,
    members: [],
    name,
    source: 'manual',
    totalHours: 12,
    updatedAt,
    visibility: 'public',
    workspaceId,
  };
}

function createReportRow(
  projectId: string,
  name: string,
  lastStartedAt: string | null,
): TimeReportProjectRow {
  return {
    billableSeconds: 7200,
    billableShare: 1,
    entryCount: 1,
    firstStartedAt: lastStartedAt,
    groupBy: 'project',
    lastStartedAt,
    nonBillableSeconds: 0,
    project: { id: projectId, name },
    task: null,
    totalSeconds: 7200,
    user: null,
  };
}

function createReport(items: TimeReportProjectRow[]): TimeReportResponse {
  const totalSeconds = items.reduce((total, item) => total + item.totalSeconds, 0);

  return {
    dateRange: getDashboardWeekRange(now),
    groupBy: 'project',
    items,
    meta: {
      limit: ADMIN_DASHBOARD_REPORT_PAGE_LIMIT,
      page: 1,
      total: items.length,
      totalPages: 1,
    },
    summary: {
      billableSeconds: totalSeconds,
      billableShare: totalSeconds > 0 ? 1 : null,
      entryCount: items.length,
      nonBillableSeconds: 0,
      totalSeconds,
    },
  };
}

export function createDashboardClients({
  invites = [createInvite('invite-1', '2026-05-13T10:00:00.000Z')],
  members = [createMember('alex', 'Alex Admin', '2026-05-13T11:58:00.000Z')],
  projectSummary = {
    activeProjects: 1,
    privateProjects: 0,
    publicProjects: 1,
  },
  projects = [createProject('project-1', 'Project Orion', '2026-05-13T09:00:00.000Z')],
  report = createReport([
    createReportRow('project-1', 'Project Orion', '2026-05-13T11:42:00.000Z'),
  ]),
}: {
  invites?: WorkspaceInviteResponse[];
  members?: WorkspaceMemberResponse[];
  projectSummary?: ManagementProjectSummaryResponse;
  projects?: ProjectResponse[];
  report?: TimeReportResponse;
} = {}) {
  return {
    membersClient: {
      listInvites: vi.fn().mockResolvedValue(invites),
      listMembers: vi.fn().mockResolvedValue(members),
    },
    projectsClient: {
      getManagementSummary: vi.fn().mockResolvedValue(projectSummary),
      listProjects: vi.fn().mockResolvedValue(projects),
    },
    reportsClient: {
      getTimeReport: vi.fn().mockResolvedValue(report),
    },
  };
}

function mountDashboard(
  options: Partial<Parameters<typeof useAdminDashboardData>[0]> = {},
) {
  let dashboard!: ReturnType<typeof useAdminDashboardData>;

  mount(
    defineComponent({
      setup() {
        dashboard = useAdminDashboardData({
          accessToken: shallowRef('access-token'),
          now: () => now,
          scope: shallowRef({
            role: 'admin',
            userId: 'user-1',
            workspaceId: 'workspace-1',
          }),
          ...options,
        });
        onMounted(dashboard.refresh);
        return () => null;
      },
    }),
    {
      global: {
        plugins: [createTestQueryPlugin()],
      },
    },
  );

  return dashboard;
}

describe('useAdminDashboardData', () => {
  it('loads dashboard stats and recent activity through existing clients', async () => {
    const clients = createDashboardClients();
    const dashboard = mountDashboard(clients);

    await flushPromises();

    expect(clients.membersClient.listMembers).toHaveBeenCalledWith();
    expect(clients.membersClient.listInvites).toHaveBeenCalledWith();
    expect(clients.projectsClient.getManagementSummary).toHaveBeenCalledWith();
    expect(clients.projectsClient.listProjects).toHaveBeenCalledWith();
    expect(clients.reportsClient.getTimeReport).toHaveBeenCalledWith(
      expect.objectContaining({
        ...getDashboardWeekRange(now),
        groupBy: 'project',
        limit: ADMIN_DASHBOARD_REPORT_PAGE_LIMIT,
        page: 1,
        sortBy: 'lastStartedAt',
        sortOrder: 'desc',
      }),
    );
    expect(dashboard.loadError.value).toBeNull();
    expect(dashboard.isInitialLoading.value).toBe(false);
    expect(dashboard.stats.value.map((stat) => stat.label)).toEqual([
      'Active Members',
      'Hours This Week',
      'Pending Invites',
      'Active Projects',
    ]);
    expect(dashboard.allActivityRows.value.map((row) => row.type)).toEqual([
      'member',
      'time',
      'invite',
      'project',
    ]);
  });

  it('loads PM dashboard stats and activity without admin-only member or invite clients', async () => {
    const clients = createDashboardClients();
    const dashboard = mountDashboard({
      ...clients,
      role: shallowRef('pm'),
    });

    await flushPromises();

    expect(clients.membersClient.listMembers).not.toHaveBeenCalled();
    expect(clients.membersClient.listInvites).not.toHaveBeenCalled();
    expect(dashboard.loadError.value).toBeNull();
    expect(dashboard.stats.value.map((stat) => stat.label)).toEqual([
      'Active Projects',
      'Hours This Week',
      'Public Projects',
      'Private Projects',
    ]);
    expect(dashboard.allActivityRows.value.map((row) => row.type)).toEqual([
      'time',
      'project',
    ]);
  });

  it('keeps request failures retryable and reports the failure once', async () => {
    const clients = createDashboardClients();
    const onError = vi.fn();
    clients.membersClient.listMembers
      .mockRejectedValueOnce(new Error('No scope'))
      .mockResolvedValueOnce([]);

    const dashboard = mountDashboard({ ...clients, onError });
    await flushPromises();

    expect(dashboard.loadError.value).toBe('No scope');
    expect(dashboard.initialLoaded.value).toBe(false);
    expect(onError).toHaveBeenCalledWith(
      'No scope',
      expect.any(Error),
      'load-dashboard',
    );

    await dashboard.refresh();
    await flushPromises();

    expect(clients.membersClient.listMembers).toHaveBeenCalledTimes(2);
    expect(dashboard.loadError.value).toBeNull();
    expect(dashboard.initialLoaded.value).toBe(true);
  });

  it('does not call dashboard clients when the access token is absent', async () => {
    const clients = createDashboardClients();
    const dashboard = mountDashboard({
      ...clients,
      accessToken: shallowRef(null),
    });

    await flushPromises();

    expect(clients.membersClient.listMembers).not.toHaveBeenCalled();
    expect(clients.membersClient.listInvites).not.toHaveBeenCalled();
    expect(clients.projectsClient.getManagementSummary).not.toHaveBeenCalled();
    expect(clients.projectsClient.listProjects).not.toHaveBeenCalled();
    expect(clients.reportsClient.getTimeReport).not.toHaveBeenCalled();
    expect(dashboard.isInitialLoading.value).toBe(false);
    expect(dashboard.loadError.value).toBe('Sign in to view the dashboard.');
  });

  it('does not call dashboard clients when the workspace role is absent', async () => {
    const clients = createDashboardClients();
    const dashboard = mountDashboard({
      ...clients,
      role: shallowRef(null),
    });

    await flushPromises();

    expect(clients.membersClient.listMembers).not.toHaveBeenCalled();
    expect(clients.membersClient.listInvites).not.toHaveBeenCalled();
    expect(clients.projectsClient.getManagementSummary).not.toHaveBeenCalled();
    expect(clients.projectsClient.listProjects).not.toHaveBeenCalled();
    expect(clients.reportsClient.getTimeReport).not.toHaveBeenCalled();
    expect(dashboard.isInitialLoading.value).toBe(false);
    expect(dashboard.loadError.value).toBe(
      'Workspace role is required to view the dashboard.',
    );
  });

  it('exposes a successful empty activity source distinctly', async () => {
    const clients = createDashboardClients({
      invites: [],
      members: [],
      projects: [],
      report: createReport([]),
    });
    const dashboard = mountDashboard(clients);

    await flushPromises();

    expect(dashboard.loadError.value).toBeNull();
    expect(dashboard.allActivityRows.value).toEqual([]);
  });
});

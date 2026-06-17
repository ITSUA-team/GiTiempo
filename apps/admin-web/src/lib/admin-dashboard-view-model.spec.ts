import { describe, expect, it } from 'vitest';
import type {
  ManagementProjectSummaryResponse,
  ProjectResponse,
  TimeReportProjectRow,
  TimeReportResponse,
  WorkspaceInviteResponse,
  WorkspaceMemberResponse,
} from '@gitiempo/shared';

import {
  deriveDashboardActivityRows,
  deriveDashboardStats,
  formatRelativeTime,
} from './admin-dashboard-view-model';

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
  status: WorkspaceInviteResponse['status'] = 'pending',
): WorkspaceInviteResponse {
  return {
    createdAt,
    email: `${id}@example.com`,
    expiresAt: '2026-05-20T10:00:00.000Z',
    id,
    invitedBy: '55555555-5555-4555-8555-555555555555',
    role: 'member',
    status,
    workspaceId,
  };
}

function createProject(
  id: string,
  name: string,
  updatedAt: string,
  createdAt = '2026-05-01T10:00:00.000Z',
): ProjectResponse {
  return {
    color: null,
    createdAt,
    defaultBillableForTasks: true,
    description: null,
    id,
    isActive: true,
    members: [],
    name,
    source: 'manual',
    totalSeconds: 43200,
    updatedAt,
    visibility: 'public',
    workspaceId,
  };
}

function createReportRow(
  projectId: string,
  name: string,
  lastStartedAt: string | null,
  totalSeconds = 7200,
): TimeReportProjectRow {
  return {
    billableSeconds: totalSeconds,
    billableShare: totalSeconds > 0 ? 1 : null,
    entryCount: totalSeconds > 0 ? 1 : 0,
    firstStartedAt: lastStartedAt,
    groupBy: 'project',
    lastStartedAt,
    nonBillableSeconds: 0,
    project: { id: projectId, name },
    task: null,
    totalSeconds,
    user: null,
  };
}

function createReport(items: TimeReportProjectRow[]): TimeReportResponse {
  const totalSeconds = items.reduce((total, item) => total + item.totalSeconds, 0);

  return {
    dateRange: {
      dateFrom: '2026-05-11T00:00:00.000Z',
      dateTo: '2026-05-13T12:00:00.000Z',
    },
    groupBy: 'project',
    items,
    meta: { limit: 100, page: 1, total: items.length, totalPages: 1 },
    summary: {
      billableSeconds: totalSeconds,
      billableShare: totalSeconds > 0 ? 1 : null,
      entryCount: items.reduce((total, item) => total + item.entryCount, 0),
      nonBillableSeconds: 0,
      totalSeconds,
    },
  };
}

const projectSummary: ManagementProjectSummaryResponse = {
  activeProjects: 2,
  privateProjects: 1,
  publicProjects: 1,
};

describe('admin dashboard view model', () => {
  it('derives API-backed stats without unsupported invoice values', () => {
    const stats = deriveDashboardStats(
      {
        invites: [
          createInvite('pending', '2026-05-13T10:00:00.000Z'),
          createInvite('accepted', '2026-05-12T10:00:00.000Z', 'accepted'),
        ],
        members: [
          createMember('alex', 'Alex Admin', '2026-05-13T09:00:00.000Z'),
          createMember('nina', 'Nina PM', null),
        ],
        projectSummary,
        projects: [
          createProject('project-1', 'Project Orion', '2026-05-12T10:00:00.000Z'),
          createProject(
            'project-2',
            'Billing API',
            '2026-04-28T10:00:00.000Z',
            '2026-04-28T10:00:00.000Z',
          ),
        ],
        report: createReport([
          createReportRow('project-1', 'Project Orion', '2026-05-13T08:00:00.000Z', 9000),
        ]),
      },
      now,
    );

    expect(stats).toEqual([
      { description: '1 tracked today', label: 'Active Members', value: 2 },
      { description: 'Across all projects', label: 'Hours This Week', value: '2h 30m' },
      { description: 'Awaiting acceptance', label: 'Pending Invites', value: 1 },
      { description: '1 added this month', label: 'Active Projects', value: 2 },
    ]);
    expect(stats.map((stat) => stat.label)).not.toContain('Open Invoices');
  });

  it('derives PM-safe stats without member or invite data', () => {
    const stats = deriveDashboardStats(
      {
        projectSummary,
        projects: [
          createProject('project-1', 'Project Orion', '2026-05-12T10:00:00.000Z'),
        ],
        report: createReport([
          createReportRow('project-1', 'Project Orion', '2026-05-13T08:00:00.000Z', 7200),
        ]),
      },
      now,
      'pm',
    );

    expect(stats).toEqual([
      { description: 'Visible project scope', label: 'Active Projects', value: 2 },
      { description: 'In visible project scope', label: 'Hours This Week', value: '2h' },
      { description: 'Visible public projects', label: 'Public Projects', value: 1 },
      { description: 'Assigned private projects', label: 'Private Projects', value: 1 },
    ]);
  });

  it('derives recent activity newest first from current endpoint timestamps', () => {
    const rows = deriveDashboardActivityRows(
      {
        invites: [createInvite('invite-1', '2026-05-13T10:00:00.000Z')],
        members: [createMember('alex', 'Alex Admin', '2026-05-13T11:58:00.000Z')],
        projectSummary,
        projects: [
          createProject('project-1', 'Project Orion', '2026-05-13T09:00:00.000Z'),
        ],
        report: createReport([
          createReportRow('project-1', 'Project Orion', '2026-05-13T11:42:00.000Z', 12000),
        ]),
      },
      now,
    );

    expect(rows.map((row) => row.type)).toEqual([
      'member',
      'time',
      'invite',
      'project',
    ]);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        activity: 'Alex Admin was active in the workspace',
        timeLabel: '2 min ago',
      }),
    );
    expect(rows[1]?.activity).toBe('3h 20m tracked on Project Orion');
  });

  it('returns an empty activity list when current data has no timestamps', () => {
    const rows = deriveDashboardActivityRows(
      {
        invites: [],
        members: [],
        projectSummary,
        projects: [],
        report: createReport([]),
      },
      now,
    );

    expect(rows).toEqual([]);
  });

  it('derives PM-safe activity from project and report timestamps only', () => {
    const rows = deriveDashboardActivityRows(
      {
        projectSummary,
        projects: [
          createProject('project-1', 'Project Orion', '2026-05-13T09:00:00.000Z'),
        ],
        report: createReport([
          createReportRow('project-1', 'Project Orion', '2026-05-13T11:42:00.000Z', 7200),
        ]),
      },
      now,
    );

    expect(rows.map((row) => row.type)).toEqual(['time', 'project']);
  });

  it('formats relative time labels compactly', () => {
    expect(formatRelativeTime('2026-05-13T11:59:40.000Z', now)).toBe('Just now');
  });
});

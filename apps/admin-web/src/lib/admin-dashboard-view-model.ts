import type {
  ManagementProjectSummaryResponse,
  ProjectListResponse,
  ProjectResponse,
  TimeReportResponse,
  TimeReportRow,
  WorkspaceInviteListResponse,
  WorkspaceInviteResponse,
  WorkspaceMemberListResponse,
  WorkspaceMemberResponse,
  WorkspaceRole,
} from '@gitiempo/shared';

export type AdminDashboardActivityType = 'invite' | 'member' | 'project' | 'time';

export interface AdminDashboardStatCard {
  description: string;
  label: string;
  value: number | string;
}

export interface AdminDashboardActivityRow {
  activity: string;
  id: string;
  occurredAt: string;
  timeLabel: string;
  timestamp: number;
  type: AdminDashboardActivityType;
  typeLabel: string;
}

interface DashboardDataInput {
  invites: WorkspaceInviteListResponse;
  members: WorkspaceMemberListResponse;
  projectSummary: ManagementProjectSummaryResponse;
  projects: ProjectListResponse;
  report: TimeReportResponse;
}

const roleLabels: Record<WorkspaceRole, string> = {
  admin: 'Admin',
  member: 'Member',
  pm: 'PM',
};

const activityTypeLabels: Record<AdminDashboardActivityType, string> = {
  invite: 'Invite',
  member: 'Member',
  project: 'Project',
  time: 'Time',
};

function parseTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function isSameLocalDate(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function isSameLocalMonth(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth()
  );
}

function getMemberDisplayName(member: WorkspaceMemberResponse): string {
  return member.displayName?.trim() || member.email;
}

function getInviteDescription(invite: WorkspaceInviteResponse): string {
  return `Invite sent to ${invite.email} with ${roleLabels[invite.role]} role`;
}

function getProjectDescription(project: ProjectResponse): string {
  if (project.createdAt === project.updatedAt) {
    return `${project.name} was created`;
  }

  return `${project.name} was updated`;
}

function getReportActivityProjectLabel(row: TimeReportRow): string {
  if (row.groupBy === 'task') {
    return `${row.project.name} / ${row.task.title}`;
  }

  if (row.groupBy === 'project') {
    return row.project.name;
  }

  return row.user.displayName?.trim() || row.user.email;
}

function getReportActivityText(row: TimeReportRow): string {
  const duration = formatDashboardHours(row.totalSeconds);

  if (row.groupBy === 'user') {
    return `${getReportActivityProjectLabel(row)} tracked ${duration}`;
  }

  return `${duration} tracked on ${getReportActivityProjectLabel(row)}`;
}

function createActivityRow({
  activity,
  id,
  now,
  occurredAt,
  type,
}: {
  activity: string;
  id: string;
  now: Date;
  occurredAt: string | null;
  type: AdminDashboardActivityType;
}): AdminDashboardActivityRow | null {
  const timestamp = parseTimestamp(occurredAt);

  if (timestamp === null || !occurredAt) {
    return null;
  }

  return {
    activity,
    id,
    occurredAt,
    timeLabel: formatRelativeTime(occurredAt, now),
    timestamp,
    type,
    typeLabel: activityTypeLabels[type],
  };
}

function getTrackedTodayDescription(count: number): string {
  if (count === 0) {
    return 'No activity today';
  }

  return `${count} tracked today`;
}

function getPendingInvitesDescription(count: number): string {
  if (count === 0) {
    return 'No pending invites';
  }

  return 'Awaiting acceptance';
}

function getAddedProjectsDescription(count: number): string {
  if (count === 0) {
    return 'No new projects this month';
  }

  return `${count} added this month`;
}

export function formatDashboardHours(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const totalMinutes = Math.floor(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return minutes === 0 ? '0h' : `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatRelativeTime(value: string, now = new Date()): string {
  const timestamp = parseTimestamp(value);

  if (timestamp === null) {
    return 'Unknown';
  }

  const diffMs = Math.max(0, now.getTime() - timestamp);
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return 'Just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(timestamp));
}

export function getDashboardWeekRange(now = new Date()): {
  dateFrom: string;
  dateTo: string;
} {
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);
  startOfWeek.setHours(0, 0, 0, 0);

  return {
    dateFrom: startOfWeek.toISOString(),
    dateTo: now.toISOString(),
  };
}

export function deriveDashboardStats(
  { invites, members, projectSummary, projects, report }: DashboardDataInput,
  now = new Date(),
): AdminDashboardStatCard[] {
  const trackedToday = members.filter((member) => {
    const timestamp = parseTimestamp(member.lastActiveAt);
    return timestamp !== null && isSameLocalDate(new Date(timestamp), now);
  }).length;
  const pendingInvites = invites.filter((invite) => invite.status === 'pending').length;
  const projectsAddedThisMonth = projects.filter((project) => {
    const timestamp = parseTimestamp(project.createdAt);
    return timestamp !== null && isSameLocalMonth(new Date(timestamp), now);
  }).length;

  return [
    {
      description: getTrackedTodayDescription(trackedToday),
      label: 'Active Members',
      value: members.length,
    },
    {
      description: 'Across all projects',
      label: 'Hours This Week',
      value: formatDashboardHours(report.summary.totalSeconds),
    },
    {
      description: getPendingInvitesDescription(pendingInvites),
      label: 'Pending Invites',
      value: pendingInvites,
    },
    {
      description: getAddedProjectsDescription(projectsAddedThisMonth),
      label: 'Active Projects',
      value: projectSummary.activeProjects,
    },
  ];
}

export function deriveDashboardActivityRows(
  { invites, members, projects, report }: DashboardDataInput,
  now = new Date(),
  limit = 5,
): AdminDashboardActivityRow[] {
  const rows = [
    ...members.map((member) =>
      createActivityRow({
        activity: `${getMemberDisplayName(member)} was active in the workspace`,
        id: `member:${member.id}:last-active`,
        now,
        occurredAt: member.lastActiveAt,
        type: 'member',
      }),
    ),
    ...invites.map((invite) =>
      createActivityRow({
        activity: getInviteDescription(invite),
        id: `invite:${invite.id}:created`,
        now,
        occurredAt: invite.createdAt,
        type: 'invite',
      }),
    ),
    ...projects.map((project) =>
      createActivityRow({
        activity: getProjectDescription(project),
        id: `project:${project.id}:updated`,
        now,
        occurredAt: project.updatedAt,
        type: 'project',
      }),
    ),
    ...report.items.map((row) =>
      createActivityRow({
        activity: getReportActivityText(row),
        id: `time:${row.groupBy}:${getReportActivityProjectLabel(row)}:${row.lastStartedAt ?? 'none'}`,
        now,
        occurredAt: row.lastStartedAt,
        type: 'time',
      }),
    ),
  ].filter((row): row is AdminDashboardActivityRow => row !== null);

  return rows
    .sort((a, b) => b.timestamp - a.timestamp || a.activity.localeCompare(b.activity))
    .slice(0, limit);
}

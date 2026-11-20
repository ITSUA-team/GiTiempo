import type { SyncedGitHubIssue, TimeEntryResponse } from '@gitiempo/shared';
import {
  addLocalDays,
  formatCompactDuration,
  nextLocalDay,
  nextLocalMonthStart,
  startOfLocalDay,
  startOfLocalIsoWeek,
  startOfLocalMonth,
} from '@gitiempo/web-shared/time';

import {
  getEntryTrackedSecondsWithinRange,
} from '@/lib/time-entry-display';
import {
  formatTimeEntryDuration,
  formatTimeEntryTimeRange,
} from '@/lib/time-formatters';

export interface DashboardStat {
  description: string;
  label: string;
  value: string;
}

export interface DashboardFocusItem {
  description: string;
  entryCount: number;
  githubIssue: SyncedGitHubIssue | null;
  label: string;
  projectId?: string;
  shareLabel: string;
  sharePercent: number;
  taskId?: string;
  title: string;
}

export interface DashboardWeeklyFocus {
  project: DashboardFocusItem | null;
  task: DashboardFocusItem | null;
}

export interface DashboardRecentEntryTimer {
  endedAt: string | null;
  id: string;
  task: Pick<TimeEntryResponse['task'], 'title'>;
  taskId: string;
}

export interface DashboardRecentEntryRow {
  description: string | null;
  durationLabel: string;
  entry: TimeEntryResponse;
  githubIssue: SyncedGitHubIssue | null;
  id: string;
  isHighlighted: boolean;
  projectName: string;
  timerEntry: DashboardRecentEntryTimer;
  taskTitle: string;
  timeRangeLabel: string;
}

interface FocusAccumulator {
  descriptionLabel?: string;
  entryCount: number;
  githubIssue: SyncedGitHubIssue | null;
  id: string;
  label: string;
  seconds: number;
  title: string;
}

export interface DashboardFocusWindow {
  dateFrom: string;
  dateTo: string;
}

export type DashboardFocusPeriod = 'day' | 'week' | 'month';

function toFocusPeriodLabel(period: DashboardFocusPeriod): string {
  switch (period) {
    case 'day':
      return 'today';
    case 'month':
      return 'this month';
    default:
      return 'this week';
  }
}

export function getDashboardPeriodWindow(
  period: DashboardFocusPeriod,
  nowMs: number,
): DashboardFocusWindow {
  const nowDate = new Date(nowMs);

  switch (period) {
    case 'day':
      return {
        dateFrom: startOfLocalDay(nowDate).toISOString(),
        dateTo: nextLocalDay(nowDate).toISOString(),
      };
    case 'month':
      return {
        dateFrom: startOfLocalMonth(nowDate).toISOString(),
        dateTo: nextLocalMonthStart(nowDate).toISOString(),
      };
    default:
      return getDashboardWeekWindow(nowMs);
  }
}

export function getDashboardWeekWindow(nowMs: number): DashboardFocusWindow {
  const weekStart = startOfLocalIsoWeek(new Date(nowMs));

  return {
    dateFrom: weekStart.toISOString(),
    dateTo: addLocalDays(weekStart, 7).toISOString(),
  };
}

export function buildDashboardStats(
  entries: TimeEntryResponse[],
  nowMs: number,
): DashboardStat[] {
  const nowDate = new Date(nowMs);
  const todayStartMs = startOfLocalDay(nowDate).getTime();
  const tomorrowStartMs = nextLocalDay(nowDate).getTime();
  const weekStartMs = startOfLocalIsoWeek(nowDate).getTime();
  const nextWeekStartMs = addLocalDays(startOfLocalIsoWeek(nowDate), 7).getTime();

  let todayTrackedSeconds = 0;
  let weekTrackedSeconds = 0;
  let weekEntryCount = 0;
  const todayProjectIds = new Set<string>();
  const weekProjectIds = new Set<string>();

  for (const entry of entries) {
    const todaySeconds = getEntryTrackedSecondsWithinRange(
      entry,
      todayStartMs,
      tomorrowStartMs,
      nowMs,
    );
    const weekSeconds = getEntryTrackedSecondsWithinRange(
      entry,
      weekStartMs,
      nextWeekStartMs,
      nowMs,
    );

    if (todaySeconds > 0) {
      todayTrackedSeconds += todaySeconds;
      todayProjectIds.add(entry.project.id);
    }

    if (weekSeconds > 0) {
      weekTrackedSeconds += weekSeconds;
      weekEntryCount += 1;
      weekProjectIds.add(entry.project.id);
    }
  }

  return [
    {
      description:
        todayProjectIds.size === 1
          ? '1 project tracked today'
          : `${todayProjectIds.size} projects tracked today`,
      label: 'Today',
      value: formatCompactDuration(todayTrackedSeconds),
    },
    {
      description: `${toEntryLabel(weekEntryCount)} tracked this week`,
      label: 'This Week',
      value: formatCompactDuration(weekTrackedSeconds),
    },
    {
      description:
        weekProjectIds.size === 1
          ? '1 project received tracked time'
          : `${weekProjectIds.size} projects received tracked time`,
      label: 'Projects This Week',
      value: String(weekProjectIds.size),
    },
  ];
}

export function buildDashboardWeeklyFocus(
  entries: TimeEntryResponse[],
  nowMs: number,
  period: DashboardFocusPeriod = 'week',
): DashboardWeeklyFocus {
  const focusWindow = getDashboardPeriodWindow(period, nowMs);
  const windowStartMs = Date.parse(focusWindow.dateFrom);
  const windowEndMs = Date.parse(focusWindow.dateTo);
  const periodLabel = toFocusPeriodLabel(period);
  const projectMap = new Map<string, FocusAccumulator>();
  const taskMap = new Map<string, FocusAccumulator>();
  let totalTrackedSeconds = 0;

  for (const entry of entries) {
    const trackedSeconds = getEntryTrackedSecondsWithinRange(
      entry,
      windowStartMs,
      windowEndMs,
      nowMs,
    );

    if (trackedSeconds <= 0) {
      continue;
    }

    totalTrackedSeconds += trackedSeconds;

    const projectStats = projectMap.get(entry.project.id) ?? {
      entryCount: 0,
      githubIssue: null,
      id: entry.project.id,
      label: 'Top Project',
      seconds: 0,
      title: entry.project.name,
    };
    projectStats.entryCount += 1;
    projectStats.seconds += trackedSeconds;
    projectMap.set(entry.project.id, projectStats);

    const taskStats = taskMap.get(entry.task.id) ?? {
      descriptionLabel: entry.project.name,
      entryCount: 0,
      githubIssue: entry.githubIssue,
      id: entry.task.id,
      label: 'Top Task',
      seconds: 0,
      title: entry.task.title,
    };
    taskStats.entryCount += 1;
    taskStats.seconds += trackedSeconds;
    taskMap.set(entry.task.id, taskStats);
  }

  const topProject = pickTopFocusItem(projectMap.values());
  const topTask = pickTopFocusItem(taskMap.values());

  return {
    project: topProject
      ? {
          description: `${formatCompactDuration(topProject.seconds)} tracked across ${toEntryLabel(topProject.entryCount)}`,
          entryCount: topProject.entryCount,
          githubIssue: topProject.githubIssue,
          label: topProject.label,
          projectId: topProject.id,
          shareLabel: `${toSharePercent(topProject.seconds, totalTrackedSeconds)}% of your tracked time ${periodLabel}`,
          sharePercent: toSharePercent(topProject.seconds, totalTrackedSeconds),
          title: topProject.title,
        }
      : null,
    task: topTask
      ? {
          description: `${topTask.descriptionLabel} • ${formatCompactDuration(topTask.seconds)} tracked`,
          entryCount: topTask.entryCount,
          githubIssue: topTask.githubIssue,
          label: topTask.label,
          shareLabel: `${toEntryLabel(topTask.entryCount)} contributed to this focus`,
          sharePercent: toSharePercent(topTask.seconds, totalTrackedSeconds),
          taskId: topTask.id,
          title: topTask.title,
        }
      : null,
  };
}

export function mapDashboardRecentEntryRows(
  entries: TimeEntryResponse[],
  nowMs: number,
): DashboardRecentEntryRow[] {
  return entries.map((entry) => ({
    description: entry.description,
    durationLabel: formatTimeEntryDuration(entry, nowMs),
    entry,
    githubIssue: entry.githubIssue,
    id: entry.id,
    isHighlighted: entry.endedAt === null,
    projectName: entry.project.name,
    timerEntry: {
      endedAt: entry.endedAt,
      id: entry.id,
      task: {
        title: entry.task.title,
      },
      taskId: entry.taskId,
    },
    taskTitle: entry.task.title,
    timeRangeLabel: formatTimeEntryTimeRange(entry),
  }));
}

function toSharePercent(seconds: number, totalSeconds: number): number {
  if (seconds <= 0 || totalSeconds <= 0) {
    return 0;
  }

  return Math.max(1, Math.min(100, Math.round((seconds / totalSeconds) * 100)));
}

function toEntryLabel(count: number): string {
  return count === 1 ? '1 entry' : `${count} entries`;
}

function pickTopFocusItem(
  items: Iterable<FocusAccumulator>,
): FocusAccumulator | null {
  let winner: FocusAccumulator | null = null;

  for (const candidate of items) {
    if (
      winner === null ||
      candidate.seconds > winner.seconds ||
      (candidate.seconds === winner.seconds &&
        candidate.entryCount > winner.entryCount) ||
      (candidate.seconds === winner.seconds &&
        candidate.entryCount === winner.entryCount &&
        candidate.title.localeCompare(winner.title) < 0)
    ) {
      winner = candidate;
    }
  }

  return winner;
}

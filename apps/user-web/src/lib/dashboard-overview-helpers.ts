import type { TimeEntryResponse } from "@gitiempo/shared";

import {
  addUtcDays,
  formatCompactDuration,
  formatRecentEntryDuration,
  formatRecentEntryTimeRange,
  getEntryTrackedSecondsWithinRange,
  startOfUtcDay,
  startOfUtcIsoWeek,
} from "@/lib/time-entry-display";

export interface DashboardStat {
  description: string;
  label: string;
  value: string;
}

export interface DashboardFocusItem {
  description: string;
  entryCount: number;
  label: string;
  shareLabel: string;
  sharePercent: number;
  title: string;
}

export interface DashboardWeeklyFocus {
  project: DashboardFocusItem | null;
  task: DashboardFocusItem | null;
}

export interface DashboardRecentEntryRow {
  durationLabel: string;
  id: string;
  isHighlighted: boolean;
  projectName: string;
  taskTitle: string;
  timeRangeLabel: string;
}

interface FocusAccumulator {
  descriptionLabel?: string;
  entryCount: number;
  label: string;
  seconds: number;
  title: string;
}

export function getDashboardWeekWindow(nowMs: number): { dateFrom: string; dateTo: string } {
  const nowDate = new Date(nowMs);
  const weekStart = startOfUtcIsoWeek(nowDate);

  return {
    dateFrom: weekStart.toISOString(),
    dateTo: addUtcDays(weekStart, 7).toISOString(),
  };
}

export function buildDashboardStats(entries: TimeEntryResponse[], nowMs: number): DashboardStat[] {
  const nowDate = new Date(nowMs);
  const todayStartMs = startOfUtcDay(nowDate).getTime();
  const tomorrowStartMs = addUtcDays(startOfUtcDay(nowDate), 1).getTime();
  const weekStartMs = startOfUtcIsoWeek(nowDate).getTime();
  const nextWeekStartMs = addUtcDays(startOfUtcIsoWeek(nowDate), 7).getTime();

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
          ? "1 project tracked today"
          : `${todayProjectIds.size} projects tracked today`,
      label: "Today",
      value: formatCompactDuration(todayTrackedSeconds),
    },
    {
      description: `${toEntryLabel(weekEntryCount)} tracked this week`,
      label: "This Week",
      value: formatCompactDuration(weekTrackedSeconds),
    },
    {
      description:
        weekProjectIds.size === 1
          ? "1 project received tracked time"
          : `${weekProjectIds.size} projects received tracked time`,
      label: "Projects This Week",
      value: String(weekProjectIds.size),
    },
  ];
}

export function buildDashboardWeeklyFocus(
  entries: TimeEntryResponse[],
  nowMs: number,
): DashboardWeeklyFocus {
  const nowDate = new Date(nowMs);
  const weekStartMs = startOfUtcIsoWeek(nowDate).getTime();
  const nextWeekStartMs = addUtcDays(startOfUtcIsoWeek(nowDate), 7).getTime();
  const projectMap = new Map<string, FocusAccumulator>();
  const taskMap = new Map<string, FocusAccumulator>();
  let totalTrackedSeconds = 0;

  for (const entry of entries) {
    const trackedSeconds = getEntryTrackedSecondsWithinRange(
      entry,
      weekStartMs,
      nextWeekStartMs,
      nowMs,
    );

    if (trackedSeconds <= 0) {
      continue;
    }

    totalTrackedSeconds += trackedSeconds;

    const projectStats = projectMap.get(entry.project.id) ?? {
      entryCount: 0,
      label: "Top Project",
      seconds: 0,
      title: entry.project.name,
    };
    projectStats.entryCount += 1;
    projectStats.seconds += trackedSeconds;
    projectMap.set(entry.project.id, projectStats);

    const taskStats = taskMap.get(entry.task.id) ?? {
      descriptionLabel: entry.project.name,
      entryCount: 0,
      label: "Top Task",
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
          label: topProject.label,
          shareLabel: `${toSharePercent(topProject.seconds, totalTrackedSeconds)}% of your tracked time this week`,
          sharePercent: toSharePercent(topProject.seconds, totalTrackedSeconds),
          title: topProject.title,
        }
      : null,
    task: topTask
      ? {
          description: `${topTask.descriptionLabel} • ${formatCompactDuration(topTask.seconds)} tracked`,
          entryCount: topTask.entryCount,
          label: topTask.label,
          shareLabel: `${toEntryLabel(topTask.entryCount)} contributed to this focus`,
          sharePercent: toSharePercent(topTask.seconds, totalTrackedSeconds),
          title: topTask.title,
        }
      : null,
  };
}

export function mapDashboardRecentEntryRows(
  entries: TimeEntryResponse[],
  nowMs: number,
): DashboardRecentEntryRow[] {
  return entries.map((entry, index) => ({
    durationLabel: formatRecentEntryDuration(entry, nowMs),
    id: entry.id,
    isHighlighted: index === 0,
    projectName: entry.project.name,
    taskTitle: entry.task.title,
    timeRangeLabel: formatRecentEntryTimeRange(entry),
  }));
}

function toSharePercent(seconds: number, totalSeconds: number): number {
  if (seconds <= 0 || totalSeconds <= 0) {
    return 0;
  }

  return Math.max(1, Math.min(100, Math.round((seconds / totalSeconds) * 100)));
}

function toEntryLabel(count: number): string {
  return count === 1 ? "1 entry" : `${count} entries`;
}

function pickTopFocusItem(items: Iterable<FocusAccumulator>): FocusAccumulator | null {
  let winner: FocusAccumulator | null = null;

  for (const candidate of items) {
    if (
      winner === null ||
      candidate.seconds > winner.seconds ||
      (candidate.seconds === winner.seconds && candidate.entryCount > winner.entryCount) ||
      (
        candidate.seconds === winner.seconds &&
        candidate.entryCount === winner.entryCount &&
        candidate.title.localeCompare(winner.title) < 0
      )
    ) {
      winner = candidate;
    }
  }

  return winner;
}

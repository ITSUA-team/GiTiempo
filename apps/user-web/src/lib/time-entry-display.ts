import type { TimeEntryResponse } from '@gitiempo/shared';
import { formatUtcDayLabel, getUtcDateKey } from '@gitiempo/web-shared/time';

import {
  formatTimeEntryDuration,
  formatTimeEntryTimeRange,
} from '@/lib/time-formatters';

export {
  addUtcDays,
  formatCompactDuration,
  formatElapsedDuration,
  formatRunningDuration,
  formatTimeEntryDuration,
  formatTimeEntryTimeRange,
  formatUtcDayLabel,
  formatUtcTime,
  getUtcDateKey,
  nextUtcDay,
  startOfUtcDay,
  startOfUtcIsoWeek,
} from '@/lib/time-formatters';

export interface TimeEntriesDayGroup {
  dateKey: string;
  heading: string;
  items: TimeEntryResponse[];
}

export function groupTimeEntriesByUtcDay(
  entries: TimeEntryResponse[],
  nowMs: number,
): TimeEntriesDayGroup[] {
  const groups = new Map<string, TimeEntryResponse[]>();

  for (const entry of entries) {
    const key = getUtcDateKey(entry.startedAt);
    const currentItems = groups.get(key) ?? [];

    currentItems.push(entry);
    groups.set(key, currentItems);
  }

  return Array.from(groups.entries()).map(([dateKey, items]) => ({
    dateKey,
    heading: formatUtcDayLabel(dateKey, nowMs),
    items,
  }));
}

export function getEntryTrackedSecondsWithinRange(
  entry: TimeEntryResponse,
  rangeStartMs: number,
  rangeEndMs: number,
  nowMs: number,
): number {
  const startedAtMs = new Date(entry.startedAt).getTime();
  const endedAtMs =
    entry.endedAt === null ? nowMs : new Date(entry.endedAt).getTime();
  const overlapStartMs = Math.max(startedAtMs, rangeStartMs);
  const overlapEndMs = Math.min(endedAtMs, rangeEndMs);

  if (overlapEndMs <= overlapStartMs) {
    return 0;
  }

  return Math.floor((overlapEndMs - overlapStartMs) / 1000);
}

export function formatRecentEntryDuration(
  entry: TimeEntryResponse,
  nowMs: number,
): string {
  return formatTimeEntryDuration(entry, nowMs);
}

export function formatRecentEntryTimeRange(entry: TimeEntryResponse): string {
  return formatTimeEntryTimeRange(entry);
}

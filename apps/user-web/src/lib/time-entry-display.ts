import type { TimeEntryResponse } from '@gitiempo/shared';
import { formatLocalDayLabel, getLocalDateKey } from '@gitiempo/web-shared/time';

export {
  addLocalDays,
  formatCompactDuration,
  formatElapsedDuration,
  formatLocalDayLabel,
  formatLocalTime,
  formatRunningDuration,
  formatTimeEntryDuration,
  formatTimeEntryTimeRange,
  getLocalDateKey,
  nextLocalDay,
  startOfLocalDay,
  startOfLocalIsoWeek,
} from '@/lib/time-formatters';

export interface TimeEntriesDayGroup {
  dateKey: string;
  heading: string;
  items: TimeEntryResponse[];
  totalSeconds: number;
}

export function getTimeEntryDurationSeconds(
  entry: TimeEntryResponse,
  nowMs: number,
): number {
  const startedAtMs = new Date(entry.startedAt).getTime();
  const endedAtMs =
    entry.endedAt === null ? nowMs : new Date(entry.endedAt).getTime();

  if (entry.endedAt !== null && entry.durationSeconds !== null) {
    return entry.durationSeconds;
  }

  return Math.max(0, Math.floor((endedAtMs - startedAtMs) / 1000));
}

export function groupTimeEntriesByLocalDay(
  entries: TimeEntryResponse[],
  nowMs: number,
): TimeEntriesDayGroup[] {
  const groups = new Map<string, TimeEntryResponse[]>();

  for (const entry of entries) {
    const key = getLocalDateKey(entry.startedAt);
    const currentItems = groups.get(key) ?? [];

    currentItems.push(entry);
    groups.set(key, currentItems);
  }

  return Array.from(groups.entries()).map(([dateKey, items]) => ({
    dateKey,
    heading: formatLocalDayLabel(dateKey, nowMs),
    items,
    totalSeconds: items.reduce(
      (total, entry) => total + getTimeEntryDurationSeconds(entry, nowMs),
      0,
    ),
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

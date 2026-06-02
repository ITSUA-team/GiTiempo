import type { TimeEntryResponse } from '@gitiempo/shared';
import {
  formatCompactDuration,
  formatRunningDuration,
  formatUtcTime,
} from '@gitiempo/web-shared/time';

export {
  addUtcDays,
  formatCompactDuration,
  formatElapsedDuration,
  formatRunningDuration,
  formatUtcDayLabel,
  formatUtcTime,
  getUtcDateKey,
  nextUtcDay,
  startOfUtcDay,
  startOfUtcIsoWeek,
} from '@gitiempo/web-shared/time';

export function formatTimeEntryDuration(
  entry: TimeEntryResponse,
  nowMs: number,
): string {
  if (entry.endedAt === null) {
    return formatRunningDuration(entry.startedAt, nowMs);
  }

  return formatCompactDuration(entry.durationSeconds);
}

export function formatTimeEntryTimeRange(
  entry: Pick<TimeEntryResponse, 'endedAt' | 'startedAt'>,
): string {
  const start = formatUtcTime(entry.startedAt);

  if (entry.endedAt === null) {
    return `${start} - Running`;
  }

  return `${start} - ${formatUtcTime(entry.endedAt)}`;
}

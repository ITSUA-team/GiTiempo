import type { TimeEntryResponse } from '@gitiempo/shared';
import {
  formatLocalCalendarDate,
  formatLocalTime,
  formatCompactDuration,
  formatRunningDuration,
} from '@gitiempo/web-shared/time';

export {
  addLocalDays,
  formatCompactDuration,
  formatElapsedDuration,
  formatLocalDayLabel,
  formatLocalTime,
  formatLocalWeekday,
  formatRunningDuration,
  getLocalDateKey,
  nextLocalDay,
  startOfLocalDay,
  startOfLocalIsoWeek,
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
  const start = formatLocalTime(entry.startedAt);

  if (entry.endedAt === null) {
    return `${start} - Running`;
  }

  return `${start} - ${formatLocalTime(entry.endedAt)}`;
}

export function formatLocalTimestampLabel(isoDateTime: string): string {
  return `${formatLocalCalendarDate(isoDateTime)}, ${formatLocalTime(isoDateTime)}`;
}

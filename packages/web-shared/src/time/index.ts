import {
  addDays,
  differenceInMinutes,
  differenceInSeconds,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

const utcTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  timeZone: 'UTC',
});
const utcMonthDayFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const utcWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  weekday: 'short',
});

export function getUtcDateKey(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}

export function formatUtcTime(isoDateTime: string): string {
  return utcTimeFormatter.format(new Date(isoDateTime));
}

export function formatUtcWeekday(isoDateTime: string): string {
  return utcWeekdayFormatter.format(new Date(isoDateTime));
}

export function formatUtcDayLabel(dateKey: string, nowMs: number): string {
  const target = dateFromUtcDateKey(dateKey);
  const todayKey = getUtcDateKey(new Date(nowMs).toISOString());
  const yesterdayKey = getUtcDateKey(
    addUtcDays(new Date(nowMs), -1).toISOString(),
  );
  const dateLabel = utcMonthDayFormatter.format(target);

  if (dateKey === todayKey) {
    return `Today, ${dateLabel}`;
  }

  if (dateKey === yesterdayKey) {
    return `Yesterday, ${dateLabel}`;
  }

  return dateLabel;
}

export function formatCompactDuration(
  totalSeconds: number | null | undefined,
): string {
  if (!totalSeconds || totalSeconds <= 0) {
    return '0m';
  }

  const { hours, minutes } = getRoundedDownDurationParts(totalSeconds);

  if (hours === 0) {
    return `${Math.max(1, minutes)}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatPaddedHoursMinutesDuration(totalSeconds: number): string {
  const { hours, minutes } = getRoundedDurationParts(totalSeconds);

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function formatTrimmedHoursMinutesDuration(
  totalSeconds: number,
): string {
  const { hours, minutes } = getRoundedDurationParts(totalSeconds);

  if (hours === 0) {
    return minutes === 0 ? '0h' : `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatElapsedDuration(totalSeconds: number): string {
  const elapsedSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(
    2,
    '0',
  );
  const seconds = String(elapsedSeconds % 60).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}

export function formatRunningDuration(
  startedAt: string,
  nowMs: number,
): string {
  return formatElapsedDuration(
    differenceInSeconds(new Date(nowMs), new Date(startedAt)),
  );
}

export function formatRelativeTime(value: string, now = new Date()): string {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return 'Unknown';
  }

  const diffMinutes = Math.max(0, differenceInMinutes(now, timestamp));

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

  return format(timestamp, 'MMM d');
}

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function nextUtcDay(date: Date): Date {
  return addUtcDays(date, 1);
}

export function startOfUtcIsoWeek(date: Date): Date {
  const utcDay = date.getUTCDay();
  const diffToMonday = utcDay === 0 ? 6 : utcDay - 1;

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() - diffToMonday,
    ),
  );
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + days,
    ),
  );
}

export function startOfLocalDay(date: Date): Date {
  return startOfDay(date);
}

export function nextLocalDay(date: Date): Date {
  return addDays(startOfLocalDay(date), 1);
}

export function startOfLocalMonth(date: Date): Date {
  return startOfMonth(date);
}

export function startOfLocalDayIso(date: Date): string {
  return startOfLocalDay(date).toISOString();
}

export function nextLocalDayStartIso(date: Date): string {
  return nextLocalDay(date).toISOString();
}

export function getLocalIsoWeekRange(now = new Date()): {
  dateFrom: string;
  dateTo: string;
} {
  return {
    dateFrom: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
    dateTo: now.toISOString(),
  };
}

export function isSameLocalDate(first: Date, second: Date): boolean {
  return isSameDay(first, second);
}

export function isSameLocalMonth(first: Date, second: Date): boolean {
  return isSameMonth(first, second);
}

function dateFromUtcDateKey(dateKey: string): Date {
  const [year = 0, month = 1, day = 1] = dateKey.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

function getRoundedDownDurationParts(totalSeconds: number): {
  hours: number;
  minutes: number;
} {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const totalMinutes = Math.floor(safeSeconds / 60);

  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

function getRoundedDurationParts(totalSeconds: number): {
  hours: number;
  minutes: number;
} {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const totalMinutes = Math.floor(safeSeconds / 60);

  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

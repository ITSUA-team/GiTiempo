import {
  addDays,
  differenceInMinutes,
  differenceInSeconds,
  format,
  formatDistanceStrict,
  isValid,
  isWithinInterval,
  parse,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns';

export type DateInput = Date | string | null | undefined;

export function getUtcDateKey(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}

export function getLocalDateKey(value: DateInput): string {
  return format(requireValidDate(value), 'yyyy-MM-dd');
}

export function formatUtcTime(isoDateTime: string): string {
  return format(toUtcLocalDate(requireValidDate(isoDateTime)), 'HH:mm');
}

export function formatLocalTime(value: DateInput): string {
  return format(requireValidDate(value), 'HH:mm');
}

export function formatUtcWeekday(isoDateTime: string): string {
  return format(toUtcLocalDate(requireValidDate(isoDateTime)), 'EEE');
}

export function formatLocalWeekday(value: DateInput): string {
  return format(requireValidDate(value), 'EEE');
}

export function formatUtcDayLabel(dateKey: string, nowMs: number): string {
  const target = dateFromUtcDateKey(dateKey);
  const todayKey = getUtcDateKey(
    requireValidDate(new Date(nowMs)).toISOString(),
  );
  const yesterdayKey = getUtcDateKey(
    addUtcDays(requireValidDate(new Date(nowMs)), -1).toISOString(),
  );
  const dateLabel = format(target, 'MMM d');

  if (dateKey === todayKey) {
    return `Today, ${dateLabel}`;
  }

  if (dateKey === yesterdayKey) {
    return `Yesterday, ${dateLabel}`;
  }

  return dateLabel;
}

export function formatLocalDayLabel(dateKey: string, nowMs: number): string {
  const target = dateFromLocalDateKey(dateKey);
  const todayKey = getLocalDateKey(new Date(nowMs));
  const yesterdayKey = getLocalDateKey(addDays(new Date(nowMs), -1));
  const dateLabel = format(target, 'MMM d');

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
  const start = parseDateInput(startedAt);

  if (start === null) {
    return formatElapsedDuration(0);
  }

  return formatElapsedDuration(
    differenceInSeconds(requireValidDate(new Date(nowMs)), start),
  );
}

export function formatRelativeTime(value: string, now = new Date()): string {
  const timestamp = parseDateInput(value);

  if (timestamp === null) {
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

export function formatAutoRelativeTime(
  value: DateInput,
  now = new Date(),
): string | null {
  const date = parseDateInput(value);

  if (date === null) {
    return null;
  }

  if (Math.abs(differenceInSeconds(date, now)) < 30) {
    return 'now';
  }

  return formatDistanceStrict(date, now, {
    addSuffix: true,
    roundingMethod: 'round',
  });
}

export function formatLocalCalendarDate(
  value: DateInput,
): string {
  const date = parseDateInput(value);

  if (date === null) {
    return '—';
  }

  return format(date, 'MMM d, yyyy');
}

export function startOfUtcDay(date: Date): Date {
  return utcBoundaryFromLocalDate(toUtcLocalDate(date));
}

export function startOfLocalDay(date: Date): Date {
  return startOfDay(date);
}

export function nextUtcDay(date: Date): Date {
  return addUtcDays(date, 1);
}

export function nextLocalDay(date: Date): Date {
  return addDays(startOfLocalDay(date), 1);
}

export function startOfUtcIsoWeek(date: Date): Date {
  return utcBoundaryFromLocalDate(
    startOfWeek(toUtcLocalDate(date), { weekStartsOn: 1 }),
  );
}

export function startOfLocalIsoWeek(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function addUtcDays(date: Date, days: number): Date {
  return utcBoundaryFromLocalDate(addDays(toUtcLocalDate(date), days));
}

export function addLocalDays(date: Date, days: number): Date {
  return addDays(date, days);
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
    dateFrom: startOfLocalIsoWeek(now).toISOString(),
    dateTo: now.toISOString(),
  };
}

export function isSameLocalDateValue(
  first: DateInput,
  second: DateInput,
): boolean {
  const firstDate = parseDateInput(first);
  const secondDate = parseDateInput(second);

  return (
    firstDate !== null &&
    secondDate !== null &&
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

export function hasValidDate(value: DateInput): boolean {
  return parseDateInput(value) !== null;
}

export function isWithinLocalIsoWeekToDate(
  value: DateInput,
  now = new Date(),
): boolean {
  const date = parseDateInput(value);
  const end = parseDateInput(now);

  if (date === null || end === null) {
    return false;
  }

  return isWithinInterval(date, {
    end,
    start: startOfWeek(end, { weekStartsOn: 1 }),
  });
}

function dateFromUtcDateKey(dateKey: string): Date {
  const date = parse(dateKey, 'yyyy-MM-dd', new Date(0));

  return isValid(date) ? date : new Date(Number.NaN);
}

function dateFromLocalDateKey(dateKey: string): Date {
  const date = parse(dateKey, 'yyyy-MM-dd', new Date());

  return isValid(date) ? date : new Date(Number.NaN);
}

export function parseDateInput(value: DateInput): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  const date = value instanceof Date ? value : parseISO(value);

  return isValid(date) ? date : null;
}

function requireValidDate(value: DateInput): Date {
  return parseDateInput(value) ?? new Date(Number.NaN);
}

function toUtcLocalDate(date: Date): Date {
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  );
}

function utcBoundaryFromLocalDate(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
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

import type { TimeEntryResponse } from "@gitiempo/shared";

export function getUtcDateKey(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}

export function formatUtcTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

export function formatUtcDayLabel(dateKey: string, nowMs: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const target = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  const today = new Date(nowMs);
  const todayKey = [
    today.getUTCFullYear(),
    String(today.getUTCMonth() + 1).padStart(2, "0"),
    String(today.getUTCDate()).padStart(2, "0"),
  ].join("-");
  const yesterday = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1),
  );
  const yesterdayKey = [
    yesterday.getUTCFullYear(),
    String(yesterday.getUTCMonth() + 1).padStart(2, "0"),
    String(yesterday.getUTCDate()).padStart(2, "0"),
  ].join("-");
  const dateLabel = `${monthLabels[target.getUTCMonth()]} ${target.getUTCDate()}`;

  if (dateKey === todayKey) {
    return `Today, ${dateLabel}`;
  }

  if (dateKey === yesterdayKey) {
    return `Yesterday, ${dateLabel}`;
  }

  return dateLabel;
}

export function formatCompactDuration(totalSeconds: number | null | undefined): string {
  if (!totalSeconds || totalSeconds <= 0) {
    return "0m";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours === 0) {
    return `${Math.max(1, minutes)}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatElapsedDuration(totalSeconds: number): string {
  const elapsedSeconds = Math.max(0, totalSeconds);
  const hours = String(Math.floor(elapsedSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(elapsedSeconds % 60).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

export function formatRunningDuration(startedAt: string, nowMs: number): string {
  const elapsedSeconds = Math.floor((nowMs - new Date(startedAt).getTime()) / 1000);

  return formatElapsedDuration(elapsedSeconds);
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function nextUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
}

export function startOfUtcIsoWeek(date: Date): Date {
  const utcDay = date.getUTCDay();
  const diffToMonday = utcDay === 0 ? 6 : utcDay - 1;

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - diffToMonday),
  );
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

export function formatTimeEntryDuration(entry: TimeEntryResponse, nowMs: number): string {
  if (entry.endedAt === null) {
    return formatRunningDuration(entry.startedAt, nowMs);
  }

  return formatCompactDuration(entry.durationSeconds);
}

export function formatTimeEntryTimeRange(entry: Pick<TimeEntryResponse, "endedAt" | "startedAt">): string {
  const start = formatUtcTime(entry.startedAt);

  if (entry.endedAt === null) {
    return `${start} - Running`;
  }

  return `${start} - ${formatUtcTime(entry.endedAt)}`;
}

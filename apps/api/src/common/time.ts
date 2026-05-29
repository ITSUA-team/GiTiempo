export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function startOfUtcIsoWeek(date: Date): Date {
  const dayStart = startOfUtcDay(date);
  const utcDay = dayStart.getUTCDay();
  const diffToMonday = utcDay === 0 ? -6 : 1 - utcDay;

  dayStart.setUTCDate(dayStart.getUTCDate() + diffToMonday);

  return dayStart;
}

export function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function nextUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

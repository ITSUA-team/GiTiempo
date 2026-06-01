export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function startOfUtcIsoWeek(date: Date): Date {
  const start = startOfUtcDay(date);
  const day = start.getUTCDay();
  const diffDays = day === 0 ? -6 : 1 - day;

  start.setUTCDate(start.getUTCDate() + diffDays);

  return start;
}

export function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function startOfNextUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

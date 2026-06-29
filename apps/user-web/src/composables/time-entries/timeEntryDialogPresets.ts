function createLocalPresetDate(dayKey: string, hour: number): Date | null {
  const [yearText, monthText, dayText] = dayKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const value = new Date(year, month - 1, day, hour, 0, 0, 0);

  if (
    value.getFullYear() !== year ||
    value.getMonth() !== month - 1 ||
    value.getDate() !== day
  ) {
    return null;
  }

  return value;
}

export function createTimeEntryDialogDayPreset(dayKey: string | null): {
  endedAt: Date | null;
  startedAt: Date | null;
} {
  if (!dayKey) {
    return {
      endedAt: null,
      startedAt: null,
    };
  }

  return {
    endedAt: createLocalPresetDate(dayKey, 10),
    startedAt: createLocalPresetDate(dayKey, 9),
  };
}

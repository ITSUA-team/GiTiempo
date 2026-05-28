import type { TimeEntryResponse } from "@gitiempo/shared";

export function compareTimeEntriesByRecency(
  left: TimeEntryResponse,
  right: TimeEntryResponse,
): number {
  const startedAtDiff =
    new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime();

  if (startedAtDiff !== 0) {
    return startedAtDiff;
  }

  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

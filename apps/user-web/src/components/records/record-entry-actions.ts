export type RecordEntryTestIdPrefix =
  | "dashboard-recent-entry"
  | "dashboard-recent-entry-mobile"
  | "time-entry"
  | "time-entry-mobile";

export const RECORD_ENTRY_BODY_ROW_CLASS =
  "border-divider h-[52px] border-b transition-colors last:border-b-0";

export function getRecordEntryRowClass(isRunning: boolean): string {
  return isRunning
    ? "bg-accent-tint hover:bg-accent-tint"
    : "bg-surface-primary hover:bg-app-bg";
}

export function getRecordEntryTaskOpenLabel(
  taskTitle: string,
  isRunning: boolean,
): string {
  return isRunning
    ? `Update active timer for ${taskTitle}`
    : `Edit time entry for ${taskTitle}`;
}

export function getRecordEntryTaskTestId(
  entryId: string,
  prefix: RecordEntryTestIdPrefix,
  isRunning: boolean,
): string {
  return isRunning
    ? `${prefix}-open-timer-${entryId}`
    : `${prefix}-edit-${entryId}`;
}

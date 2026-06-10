import type { TimeEntryResponse } from '@gitiempo/shared';
import { formatRunningDuration } from '@gitiempo/web-shared/time';

export interface SelectedTaskContext {
  projectId: string;
  projectName: string;
  taskId: string;
  taskTitle: string;
}

export const TOP_BAR_TIMER_NEW_TASK_ID = "__top-bar-timer-new-task__";

export function formatElapsedTime(
  startedAt: string | null,
  nowMs: number,
): string {
  if (!startedAt) {
    return '00:00:00';
  }

  return formatRunningDuration(startedAt, nowMs);
}

export function isConflictErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes('already running') ||
    normalized.includes('active timer') ||
    normalized.includes('overlap')
  );
}

export function isRunningTimer(timer: TimeEntryResponse | null): boolean {
  return timer !== null && timer.endedAt === null;
}

export function toSelectedTaskContext(
  timer: TimeEntryResponse,
): SelectedTaskContext {
  return {
    projectId: timer.project.id,
    projectName: timer.project.name,
    taskId: timer.task.id,
    taskTitle: timer.task.title,
  };
}

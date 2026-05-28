import type { TimeEntryResponse } from "@gitiempo/shared";

export type TimeEntryTimerSyncEvent =
  | {
      entry: TimeEntryResponse;
      type: "started";
    }
  | {
      entry: TimeEntryResponse;
      type: "stopped";
    };

// eslint-disable-next-line no-unused-vars
type TimeEntryTimerSyncListener = (event: TimeEntryTimerSyncEvent) => void;

const listeners = new Set<TimeEntryTimerSyncListener>();

export function publishTimeEntryTimerSyncEvent(
  event: TimeEntryTimerSyncEvent,
): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error("Could not notify time entry timer sync listener", {
        error,
        event,
      });
    }
  }
}

export function subscribeToTimeEntryTimerSync(
  listener: TimeEntryTimerSyncListener,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

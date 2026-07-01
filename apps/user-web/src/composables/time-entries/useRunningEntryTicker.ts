import type { TimeEntryResponse } from "@gitiempo/shared";
import {
  computed,
  onBeforeUnmount,
  shallowRef,
  watch,
  type ComputedRef,
} from "vue";

interface UseRunningEntryTickerOptions {
  clearIntervalFn: typeof clearInterval;
  entries: ComputedRef<TimeEntryResponse[]>;
  now: () => number;
  setIntervalFn: typeof setInterval;
}

export function useRunningEntryTicker({
  clearIntervalFn,
  entries,
  now,
  setIntervalFn,
}: UseRunningEntryTickerOptions) {
  const nowMs = shallowRef(now());
  const hasRunningEntries = computed(() =>
    entries.value.some((entry) => entry.endedAt === null),
  );
  let tickHandle: ReturnType<typeof setInterval> | null = null;

  function stopTicker(): void {
    if (tickHandle === null) {
      return;
    }

    clearIntervalFn(tickHandle);
    tickHandle = null;
  }

  function syncTicker(): void {
    if (!hasRunningEntries.value) {
      stopTicker();
      return;
    }

    if (tickHandle !== null) {
      return;
    }

    tickHandle = setIntervalFn(() => {
      nowMs.value = now();
    }, 1000);
  }

  watch(
    entries,
    () => {
      nowMs.value = now();
      syncTicker();
    },
    { immediate: true },
  );

  onBeforeUnmount(stopTicker);

  return {
    nowMs,
    stopTicker,
  };
}

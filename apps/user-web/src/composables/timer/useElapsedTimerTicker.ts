import { computed, onBeforeUnmount, shallowRef, watch, type ComputedRef } from "vue";

import { formatElapsedTime } from "@/lib/top-bar-timer-helpers";

interface UseElapsedTimerTickerOptions {
  clearIntervalFn: typeof clearInterval;
  now: () => number;
  runningStartedAt: ComputedRef<string | null>;
  setIntervalFn: typeof setInterval;
}

export function useElapsedTimerTicker({
  clearIntervalFn,
  now,
  runningStartedAt,
  setIntervalFn,
}: UseElapsedTimerTickerOptions) {
  const tickNowMs = shallowRef(now());
  const elapsedTimeLabel = computed(() =>
    formatElapsedTime(runningStartedAt.value, tickNowMs.value),
  );
  let elapsedTimerIntervalHandle: ReturnType<typeof setInterval> | null = null;

  function stopElapsedTimerTicker(): void {
    if (!elapsedTimerIntervalHandle) {
      return;
    }

    clearIntervalFn(elapsedTimerIntervalHandle);
    elapsedTimerIntervalHandle = null;
  }

  watch(
    runningStartedAt,
    (startedAt) => {
      stopElapsedTimerTicker();
      tickNowMs.value = now();

      if (!startedAt) {
        return;
      }

      elapsedTimerIntervalHandle = setIntervalFn(() => {
        tickNowMs.value = now();
      }, 1000);
    },
    { immediate: true },
  );

  onBeforeUnmount(stopElapsedTimerTicker);

  return {
    elapsedTimeLabel,
    stopElapsedTimerTicker,
  };
}

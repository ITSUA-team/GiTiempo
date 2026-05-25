import {
  computed,
  onBeforeUnmount,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from "vue";

import { formatElapsedTime } from "@/lib/top-bar-timer-helpers";

interface UseTopBarElapsedTimerOptions {
  clearIntervalFn?: typeof clearInterval;
  now?: () => number;
  setIntervalFn?: typeof setInterval;
  startedAt: MaybeRefOrGetter<string | null>;
}

export function useTopBarElapsedTimer(options: UseTopBarElapsedTimerOptions) {
  const now = options.now ?? (() => Date.now());
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;
  const tickNowMs = shallowRef(now());
  const elapsedTimeLabel = computed(() =>
    formatElapsedTime(toValue(options.startedAt), tickNowMs.value),
  );
  let intervalHandle: ReturnType<typeof setInterval> | null = null;

  function stopTicker(): void {
    if (!intervalHandle) {
      return;
    }

    clearIntervalFn(intervalHandle);
    intervalHandle = null;
  }

  watch(
    () => toValue(options.startedAt),
    (startedAt) => {
      stopTicker();
      tickNowMs.value = now();

      if (!startedAt) {
        return;
      }

      intervalHandle = setIntervalFn(() => {
        tickNowMs.value = now();
      }, 1000);
    },
    { immediate: true },
  );

  onBeforeUnmount(stopTicker);

  return {
    elapsedTimeLabel,
    tickNowMs,
  };
}

// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, shallowRef } from "vue";

import { useTopBarElapsedTimer } from "./useTopBarElapsedTimer";

function mountElapsedTimer() {
  const startedAt = shallowRef<string | null>(null);
  let api!: ReturnType<typeof useTopBarElapsedTimer>;
  const Harness = defineComponent({
    setup() {
      api = useTopBarElapsedTimer({ startedAt });

      return () => h("div");
    },
  });
  const wrapper = mount(Harness);

  return { api, startedAt, wrapper };
}

describe("useTopBarElapsedTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("formats elapsed time from the reactive running timer source", async () => {
    const { api, startedAt } = mountElapsedTimer();

    expect(api.elapsedTimeLabel.value).toBe("00:00:00");

    startedAt.value = "2026-04-21T09:00:00.000Z";
    await nextTick();

    expect(api.elapsedTimeLabel.value).toBe("01:00:00");

    vi.advanceTimersByTime(2000);
    await nextTick();

    expect(api.elapsedTimeLabel.value).toBe("01:00:02");
  });

  it("stops rendering elapsed time when the timer source is cleared", async () => {
    const { api, startedAt } = mountElapsedTimer();

    startedAt.value = "2026-04-21T09:00:00.000Z";
    await nextTick();

    startedAt.value = null;
    await nextTick();

    expect(api.elapsedTimeLabel.value).toBe("00:00:00");

    vi.advanceTimersByTime(5000);
    await nextTick();

    expect(api.elapsedTimeLabel.value).toBe("00:00:00");
  });

  it("clears the active interval on unmount", async () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const { startedAt, wrapper } = mountElapsedTimer();

    startedAt.value = "2026-04-21T09:00:00.000Z";
    await nextTick();
    wrapper.unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});

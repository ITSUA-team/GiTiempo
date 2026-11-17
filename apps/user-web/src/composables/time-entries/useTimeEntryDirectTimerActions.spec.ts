import { flushPromises, mount } from "@vue/test-utils";
import type { TimeEntryResponse } from "@gitiempo/shared";
import { computed, defineComponent, h, shallowRef } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import { timerKeys } from "@/lib/query-keys";
import {
  createTestQueryClient,
  createTestQueryPlugin,
} from "@/test/query-client";

const queryMocks = vi.hoisted(() => ({
  currentTimerQuery: null as unknown,
  startTimerMutation: null as unknown,
  stopTimerMutation: null as unknown,
}));

vi.mock("@/composables/query", () => ({
  useCurrentTimerQuery: () => queryMocks.currentTimerQuery,
  useStartTimerMutation: () => queryMocks.startTimerMutation,
  useStopTimerMutation: () => queryMocks.stopTimerMutation,
}));

import { useTimeEntryDirectTimerActions } from "./useTimeEntryDirectTimerActions";

const ENDED_AT = "2026-04-21T10:10:00.000Z";
const SCOPE = { userId: "user-1", workspaceId: "workspace-1" };

function createRunningTimer(
  overrides: Partial<TimeEntryResponse> = {},
): TimeEntryResponse {
  return {
    endedAt: null,
    id: "entry-1",
    task: { id: "task-1", title: "Fix export column order" },
    taskId: "task-1",
    ...overrides,
  } as TimeEntryResponse;
}

function createEntry(
  overrides: Partial<{
    endedAt: string | null;
    id: string;
    task: { title: string };
    taskId: string;
  }> = {},
) {
  return {
    endedAt: ENDED_AT,
    id: "entry-1",
    task: { title: "Fix export column order" },
    taskId: "task-1",
    ...overrides,
  };
}

interface TimerGuardQueryMock {
  data: { value: { timeEntry: TimeEntryResponse | null } };
  isFetching: { value: boolean };
  refetch: ReturnType<typeof vi.fn>;
}

interface TimerMutationMock {
  mutateAsync: ReturnType<typeof vi.fn>;
}

function mountHarness() {
  const queryClient = createTestQueryClient();
  const loadEntries = vi.fn(async () => undefined);
  const timerData = shallowRef<{ timeEntry: TimeEntryResponse | null }>({
    timeEntry: null,
  });
  const isFetching = shallowRef(false);
  const currentTimerQuery: TimerGuardQueryMock = {
    data: timerData,
    isFetching,
    refetch: vi.fn(async () => ({ data: timerData.value })),
  };
  const startTimerMutation: TimerMutationMock = {
    mutateAsync: vi.fn(async () => createRunningTimer()),
  };
  const stopTimerMutation: TimerMutationMock = {
    mutateAsync: vi.fn(async () => createRunningTimer({ endedAt: ENDED_AT })),
  };
  queryMocks.currentTimerQuery = currentTimerQuery;
  queryMocks.startTimerMutation = startTimerMutation;
  queryMocks.stopTimerMutation = stopTimerMutation;

  const toastAdd = vi.fn();
  let actions!: ReturnType<typeof useTimeEntryDirectTimerActions>;

  const Harness = defineComponent({
    setup() {
      actions = useTimeEntryDirectTimerActions({
        client: {
          getCurrentTimer: vi.fn(),
          startTimer: vi.fn(),
          stopTimer: vi.fn(),
        },
        enabled: computed(() => true),
        loadEntries,
        scope: computed(() => SCOPE),
        toast: { add: toastAdd },
      });

      return () => h("div");
    },
  });

  const wrapper = mount(Harness, {
    global: { plugins: [createTestQueryPlugin(queryClient)] },
  });

  return {
    actions,
    currentTimerQuery,
    isFetching,
    loadEntries,
    queryClient,
    startTimerMutation,
    stopTimerMutation,
    timerData,
    toastAdd,
    wrapper,
  };
}

describe("useTimeEntryDirectTimerActions", () => {
  const wrappers: Array<{ unmount: () => void }> = [];

  afterEach(() => {
    while (wrappers.length > 0) {
      wrappers.pop()?.unmount();
    }
  });

  it("reports a confirmed running timer once the guard query settles", () => {
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);
    mounted.currentTimerQuery.data.value = { timeEntry: createRunningTimer() };

    expect(mounted.actions.hasConfirmedActiveTimer.value).toBe(true);
    expect(mounted.actions.isDirectStartBlockedByCurrentTimer.value).toBe(true);
  });

  it("blocks direct actions while the guard query is fetching", () => {
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);
    mounted.currentTimerQuery.data.value = { timeEntry: createRunningTimer() };
    mounted.isFetching.value = true;

    expect(mounted.actions.hasConfirmedActiveTimer.value).toBe(false);
    expect(mounted.actions.isDirectStartBlockedByCurrentTimer.value).toBe(true);
  });

  it("reports an idle guard with no entries to confirm or block", () => {
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);

    expect(mounted.actions.hasConfirmedActiveTimer.value).toBe(false);
    expect(mounted.actions.isDirectStartBlockedByCurrentTimer.value).toBe(false);
  });

  it("reports no confirmed timer when the tracked entry has ended", () => {
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);
    mounted.currentTimerQuery.data.value = {
      timeEntry: createRunningTimer({ endedAt: ENDED_AT }),
    };

    expect(mounted.actions.hasConfirmedActiveTimer.value).toBe(false);
    expect(mounted.actions.isDirectStartBlockedByCurrentTimer.value).toBe(false);
  });

  it("confirms an entry that is still the current timer", async () => {
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);
    mounted.currentTimerQuery.refetch.mockResolvedValueOnce({
      data: { timeEntry: createRunningTimer() },
    });

    await expect(
      mounted.actions.verifyActiveTimerEntry("entry-1"),
    ).resolves.toBe(true);

    expect(mounted.currentTimerQuery.refetch).toHaveBeenCalledWith({
      throwOnError: true,
    });
    expect(mounted.toastAdd).not.toHaveBeenCalled();
    expect(mounted.loadEntries).not.toHaveBeenCalled();
  });

  it("refreshes the timer state and asks to retry when the current timer moved on", async () => {
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);
    mounted.currentTimerQuery.refetch.mockResolvedValueOnce({
      data: { timeEntry: createRunningTimer({ id: "entry-2" }) },
    });
    const invalidate = vi.spyOn(mounted.queryClient, "invalidateQueries");

    await expect(
      mounted.actions.verifyActiveTimerEntry("entry-1"),
    ).resolves.toBe(false);

    expect(mounted.loadEntries).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: timerKeys.all(SCOPE),
    });
    expect(mounted.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "The running timer changed. Please try again.",
        severity: "info",
        summary: "Timer status refreshed",
      }),
    );
  });

  it("stays silent when the guard refetch fails", async () => {
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);
    mounted.currentTimerQuery.refetch.mockRejectedValueOnce(
      new Error("Refresh unavailable"),
    );

    await expect(
      mounted.actions.verifyActiveTimerEntry("entry-1"),
    ).resolves.toBe(false);

    expect(mounted.toastAdd).not.toHaveBeenCalled();
    expect(mounted.loadEntries).not.toHaveBeenCalled();
  });

  it("starts a timer for an idle entry and leaves refresh to mutation invalidation", async () => {
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);

    await mounted.actions.startTimerForEntry(createEntry({ endedAt: ENDED_AT }));
    await flushPromises();

    expect(mounted.startTimerMutation.mutateAsync).toHaveBeenCalledWith({
      taskId: "task-1",
    });
    expect(mounted.currentTimerQuery.refetch).not.toHaveBeenCalled();
    expect(mounted.toastAdd).not.toHaveBeenCalled();
  });

  it("does not start a timer for an entry that is already running", async () => {
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);

    await mounted.actions.startTimerForEntry(createEntry({ endedAt: null }));

    expect(mounted.startTimerMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it("does not start a timer while a confirmed timer blocks the action", async () => {
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);
    mounted.currentTimerQuery.data.value = { timeEntry: createRunningTimer() };

    await mounted.actions.startTimerForEntry(createEntry({ endedAt: ENDED_AT }));

    expect(mounted.startTimerMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it("locks concurrent starts while the first request is pending", async () => {
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);
    let resolveStart!: (timer: TimeEntryResponse) => void;
    mounted.startTimerMutation.mutateAsync.mockImplementationOnce(
      () =>
        new Promise<TimeEntryResponse>((resolve) => {
          resolveStart = resolve;
        }),
    );

    const firstStart = mounted.actions.startTimerForEntry(
      createEntry({ endedAt: ENDED_AT }),
    );
    await mounted.actions.startTimerForEntry(
      createEntry({ endedAt: ENDED_AT }),
    );

    expect(mounted.startTimerMutation.mutateAsync).toHaveBeenCalledTimes(1);

    resolveStart(createRunningTimer());
    await firstStart;
  });

  it("stops the authoritative running timer", async () => {
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);
    mounted.currentTimerQuery.refetch.mockResolvedValueOnce({
      data: { timeEntry: createRunningTimer() },
    });

    await mounted.actions.stopTimerForEntry(createEntry({ endedAt: null }));
    await flushPromises();

    expect(mounted.currentTimerQuery.refetch).toHaveBeenCalledWith({
      throwOnError: true,
    });
    expect(mounted.stopTimerMutation.mutateAsync).toHaveBeenCalledWith({
      expectedTimerId: "entry-1",
    });
    expect(mounted.toastAdd).not.toHaveBeenCalled();
  });

  it("does not stop an entry that is not running", async () => {
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);

    await mounted.actions.stopTimerForEntry(
      createEntry({ endedAt: ENDED_AT }),
    );

    expect(mounted.currentTimerQuery.refetch).not.toHaveBeenCalled();
    expect(mounted.stopTimerMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it("locks concurrent stops while the first confirmation is pending", async () => {
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);
    let resolveStop!: () => void;
    mounted.currentTimerQuery.refetch.mockImplementationOnce(
      () =>
        new Promise<{ data: { timeEntry: TimeEntryResponse } }>((resolve) => {
          resolveStop = () =>
            resolve({ data: { timeEntry: createRunningTimer() } });
        }),
    );

    const firstStop = mounted.actions.stopTimerForEntry(
      createEntry({ endedAt: null }),
    );
    await mounted.actions.stopTimerForEntry(createEntry({ endedAt: null }));

    expect(mounted.currentTimerQuery.refetch).toHaveBeenCalledTimes(1);

    resolveStop();
    await firstStop;
  });

  it("refreshes and asks to retry when the running timer changed before stopping", async () => {
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);
    mounted.currentTimerQuery.refetch.mockResolvedValueOnce({
      data: { timeEntry: createRunningTimer({ id: "entry-2" }) },
    });
    const invalidate = vi.spyOn(mounted.queryClient, "invalidateQueries");

    await mounted.actions.stopTimerForEntry(createEntry({ endedAt: null }));
    await flushPromises();

    expect(mounted.stopTimerMutation.mutateAsync).not.toHaveBeenCalled();
    expect(mounted.loadEntries).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: timerKeys.all(SCOPE),
    });
    expect(mounted.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "The running timer changed. Please try again.",
        severity: "info",
        summary: "Timer status refreshed",
      }),
    );
  });
});

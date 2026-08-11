import { flushPromises, mount } from "@vue/test-utils";
import type { TaskResponse, TimeEntryResponse } from "@gitiempo/shared";
import { computed, defineComponent, h, shallowRef } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestQueryPlugin } from "@/test/query-client";
import { ApiError } from "@gitiempo/web-shared/http";

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

import { useProjectTaskDirectTimerActions } from "./useProjectTaskDirectTimerActions";

const task: TaskResponse = {
  createdAt: "2026-04-20T12:00:00.000Z",
  defaultBillableForTimeEntries: true,
  githubIssue: null,
  id: "task-1",
  isActive: true,
  projectId: "project-1",
  status: "open",
  title: "Improve reports filters",
  updatedAt: "2026-04-21T10:00:00.000Z",
  workspaceId: "workspace-1",
};

function createRunningTimer(overrides: Partial<TimeEntryResponse> = {}): TimeEntryResponse {
  return {
    endedAt: null,
    id: "entry-1",
    taskId: task.id,
    ...overrides,
  } as TimeEntryResponse;
}

function mountHarness() {
  const onStartConflict = vi.fn();
  const toastAdd = vi.fn();
  let actions!: ReturnType<typeof useProjectTaskDirectTimerActions>;

  const Harness = defineComponent({
    setup() {
      actions = useProjectTaskDirectTimerActions({
        client: {
          getCurrentTimer: vi.fn(),
          startTimer: vi.fn(),
          stopTimer: vi.fn(),
        },
        enabled: computed(() => true),
        onStartConflict,
        scope: computed(() => ({ accessToken: "access-token", workspaceId: null })),
        toast: { add: toastAdd },
      });

      return () => h("div");
    },
  });

  const wrapper = mount(Harness, {
    global: { plugins: [createTestQueryPlugin()] },
  });

  return { actions, onStartConflict, toastAdd, wrapper };
}

describe("useProjectTaskDirectTimerActions", () => {
  const wrappers: Array<{ unmount: () => void }> = [];

  beforeEach(() => {
    const data = shallowRef({ timeEntry: null as TimeEntryResponse | null });
    queryMocks.currentTimerQuery = {
      data,
      isFetching: shallowRef(false),
      isPending: shallowRef(false),
      refetch: vi.fn(async () => ({ data: data.value })),
    };
    queryMocks.startTimerMutation = { mutateAsync: vi.fn(async () => createRunningTimer()) };
    queryMocks.stopTimerMutation = {
      mutateAsync: vi.fn(async () => createRunningTimer({ endedAt: "2026-04-21T10:00:00.000Z" })),
    };
  });

  afterEach(() => {
    while (wrappers.length > 0) {
      wrappers.pop()?.unmount();
    }
  });

  it("starts a fresh timer and refreshes the authoritative timer", async () => {
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);

    await mounted.actions.startTimerForTask(task);
    await flushPromises();

    expect(
      (queryMocks.startTimerMutation as { mutateAsync: ReturnType<typeof vi.fn> })
        .mutateAsync,
    ).toHaveBeenCalledWith({ taskId: task.id });
    expect(
      (queryMocks.currentTimerQuery as { refetch: ReturnType<typeof vi.fn> }).refetch,
    ).toHaveBeenCalled();
  });

  it("prevents a second start while a timer is already running", async () => {
    const currentTimerQuery = queryMocks.currentTimerQuery as {
      data: { value: { timeEntry: TimeEntryResponse | null } };
    };
    currentTimerQuery.data.value = { timeEntry: createRunningTimer({ taskId: "task-other" }) };
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);

    await mounted.actions.startTimerForTask(task);

    expect(
      (queryMocks.startTimerMutation as { mutateAsync: ReturnType<typeof vi.fn> })
        .mutateAsync,
    ).not.toHaveBeenCalled();
    expect(mounted.actions.activeTimerTaskId.value).toBe("task-other");
  });

  it("treats a timer in another workspace as a blocked start", async () => {
    const currentTimerQuery = queryMocks.currentTimerQuery as {
      data: { value: { timeEntry: TimeEntryResponse | null } };
    };
    currentTimerQuery.data.value = {
      timeEntry: createRunningTimer({
        taskId: "task-other",
        workspaceId: "workspace-other",
      }),
    };
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);

    await mounted.actions.startTimerForTask(task);

    expect(
      (queryMocks.startTimerMutation as { mutateAsync: ReturnType<typeof vi.fn> })
        .mutateAsync,
    ).not.toHaveBeenCalled();
  });

  it("locks repeated starts while the first request is pending", async () => {
    let resolveStart!: (timer: TimeEntryResponse) => void;
    const startTimerMutation = queryMocks.startTimerMutation as {
      mutateAsync: ReturnType<typeof vi.fn>;
    };
    startTimerMutation.mutateAsync.mockImplementationOnce(
      () => new Promise<TimeEntryResponse>((resolve) => {
        resolveStart = resolve;
      }),
    );
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);

    const firstStart = mounted.actions.startTimerForTask(task);
    await vi.waitFor(() => {
      expect(startTimerMutation.mutateAsync).toHaveBeenCalledTimes(1);
    });
    await mounted.actions.startTimerForTask(task);

    expect(startTimerMutation.mutateAsync).toHaveBeenCalledTimes(1);

    resolveStart(createRunningTimer());
    await firstStart;
  });

  it("opens stop-first guidance after a stale start conflict", async () => {
    const startTimerMutation = queryMocks.startTimerMutation as {
      mutateAsync: ReturnType<typeof vi.fn>;
    };
    startTimerMutation.mutateAsync.mockRejectedValueOnce(
      new ApiError("An active timer is already running", { status: 409 }),
    );
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);

    await mounted.actions.startTimerForTask(task);

    expect(mounted.onStartConflict).toHaveBeenCalledTimes(1);
  });

  it("shows repository-standard feedback when a start request fails", async () => {
    const startTimerMutation = queryMocks.startTimerMutation as {
      mutateAsync: ReturnType<typeof vi.fn>;
    };
    startTimerMutation.mutateAsync.mockRejectedValueOnce(new Error("Network unavailable"));
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);

    await mounted.actions.startTimerForTask(task);

    expect(mounted.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ summary: "Could not start timer" }),
    );
  });

  it("stops the matching authoritative timer", async () => {
    const currentTimerQuery = queryMocks.currentTimerQuery as {
      data: { value: { timeEntry: TimeEntryResponse | null } };
    };
    currentTimerQuery.data.value = { timeEntry: createRunningTimer() };
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);

    await mounted.actions.stopTimerForTask(task);

    expect(
      (queryMocks.stopTimerMutation as { mutateAsync: ReturnType<typeof vi.fn> })
        .mutateAsync,
    ).toHaveBeenCalledWith({ expectedTimerId: "entry-1" });
  });

  it("does not stop a timer when its identity changed before confirmation", async () => {
    const currentTimerQuery = queryMocks.currentTimerQuery as {
      data: { value: { timeEntry: TimeEntryResponse | null } };
      refetch: ReturnType<typeof vi.fn>;
    };
    currentTimerQuery.data.value = { timeEntry: createRunningTimer() };
    currentTimerQuery.refetch.mockResolvedValue({
      data: { timeEntry: createRunningTimer({ id: "entry-2" }) },
    });
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);

    await mounted.actions.stopTimerForTask(task);
    await flushPromises();

    expect(
      (queryMocks.stopTimerMutation as { mutateAsync: ReturnType<typeof vi.fn> })
        .mutateAsync,
    ).not.toHaveBeenCalled();
    expect(currentTimerQuery.refetch).toHaveBeenCalledTimes(2);
  });

  it("does not stop a timer reassigned to another task before confirmation", async () => {
    const currentTimerQuery = queryMocks.currentTimerQuery as {
      data: { value: { timeEntry: TimeEntryResponse | null } };
      refetch: ReturnType<typeof vi.fn>;
    };
    currentTimerQuery.data.value = { timeEntry: createRunningTimer() };
    currentTimerQuery.refetch.mockResolvedValue({
      data: { timeEntry: createRunningTimer({ taskId: "task-other" }) },
    });
    const mounted = mountHarness();
    wrappers.push(mounted.wrapper);

    await mounted.actions.stopTimerForTask(task);

    expect(
      (queryMocks.stopTimerMutation as { mutateAsync: ReturnType<typeof vi.fn> })
        .mutateAsync,
    ).not.toHaveBeenCalled();
  });
});

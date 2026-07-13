import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { TimeEntryListResponse, TimeEntryResponse } from "@gitiempo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, defineComponent, h } from "vue";

import {
  useRecentOwnTimeEntriesQuery,
  useStartTimerMutation,
  useStopTimerMutation,
} from "@/composables/query";
import { timeEntriesKeys } from "@/lib/query-keys";
import * as timeEntryQueryCache from "@/lib/time-entry-query-cache";
import type { TimeEntriesClient } from "@/services/time-entries-client";
import { useAuthStore } from "@/stores/auth";
import {
  createTestQueryClient,
  createTestQueryPlugin,
} from "@/test/query-client";

const TEST_IDS = {
  project: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9101",
  runningEntry: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
  task: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9201",
  user: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9301",
  workspace: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9401",
  workspaceOther: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9402",
} as const;

const TEST_SCOPE = {
  userId: null,
  workspaceId: null,
};

const ACTIVE_WORKSPACE_SCOPE = {
  userId: TEST_IDS.user,
  workspaceId: TEST_IDS.workspace,
};

type ListOwnEntriesOptions = Parameters<TimeEntriesClient["listOwnEntries"]>[1];

function createDeferred<T>() {
  const deferred = {} as {
    promise: Promise<T>;
    reject: (error?: unknown) => void;
    resolve: (value: T) => void;
  };

  deferred.promise = new Promise<T>((nextResolve, nextReject) => {
    deferred.resolve = nextResolve;
    deferred.reject = nextReject;
  });

  return deferred;
}

function createAbortableDeferred<T>() {
  const deferred = createDeferred<T>();

  return {
    reject: deferred.reject,
    resolve: deferred.resolve,
    wait(signal?: AbortSignal): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const onAbort = () => reject(new DOMException("Aborted", "AbortError"));

        if (signal?.aborted) {
          onAbort();
          return;
        }

        signal?.addEventListener("abort", onAbort, { once: true });
        deferred.promise.then(
          (value: T) => {
            signal?.removeEventListener("abort", onAbort);
            resolve(value);
          },
          (error: unknown) => {
            signal?.removeEventListener("abort", onAbort);
            reject(error);
          },
        );
      });
    },
  };
}

function createEntry(overrides: Partial<TimeEntryResponse> = {}): TimeEntryResponse {
  const { githubIssue = null, ...entryOverrides } = overrides;

  return {
    createdAt: "2026-04-21T09:00:00.000Z",
    description: null,
    durationSeconds: 3600,
    endedAt: "2026-04-21T10:00:00.000Z",
    id: TEST_IDS.runningEntry,
    isBillable: false,
    project: {
      id: TEST_IDS.project,
      name: "Project Orion",
    },
    projectId: TEST_IDS.project,
    source: "web",
    startedAt: "2026-04-21T09:00:00.000Z",
    task: {
      id: TEST_IDS.task,
      title: "Improve reports filters",
    },
    taskId: TEST_IDS.task,
    updatedAt: "2026-04-21T10:00:00.000Z",
    user: {
      avatarUrl: null,
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: TEST_IDS.user,
    },
    userId: TEST_IDS.user,
    workspace: {
      id: TEST_IDS.workspace,
      name: "Workspace Alpha",
    },
    workspaceId: TEST_IDS.workspace,
    githubIssue,
    ...entryOverrides,
  };
}

function createOwnEntriesResponse(
  items: TimeEntryResponse[],
  meta: TimeEntryListResponse["meta"] = { limit: 10, page: 1, total: items.length, totalPages: 1 },
): TimeEntryListResponse {
  return { items, meta };
}

function createClientMock(): Pick<
  TimeEntriesClient,
  "listOwnEntries" | "startTimer" | "stopTimer"
> & {
  listOwnEntries: ReturnType<typeof vi.fn<TimeEntriesClient["listOwnEntries"]>>;
  startTimer: ReturnType<typeof vi.fn<TimeEntriesClient["startTimer"]>>;
  stopTimer: ReturnType<typeof vi.fn<TimeEntriesClient["stopTimer"]>>;
} {
  return {
    listOwnEntries: vi.fn(async () => createOwnEntriesResponse([])),
    startTimer: vi.fn(async () =>
      createEntry({
        durationSeconds: null,
        endedAt: null,
        updatedAt: "2026-04-21T10:00:00.000Z",
      })),
    stopTimer: vi.fn(async () =>
      createEntry({
        durationSeconds: 1800,
        endedAt: "2026-04-21T09:30:00.000Z",
        updatedAt: "2026-04-21T09:30:00.000Z",
      })),
  };
}

function mountQueryHarness(options?: {
  client?: ReturnType<typeof createClientMock>;
  initialRecentEntries?: TimeEntryListResponse;
  scope?: typeof TEST_SCOPE | typeof ACTIVE_WORKSPACE_SCOPE;
}) {
  const pinia = createPinia();

  setActivePinia(pinia);

  const authStore = useAuthStore();

  authStore.accessToken = "access-token";

  const client = options?.client ?? createClientMock();
  const queryClient = createTestQueryClient();
  const scopeValue = options?.scope ?? TEST_SCOPE;
  const listKey = timeEntriesKeys.list(scopeValue, { limit: 10, page: 1 });

  if (options?.initialRecentEntries) {
    queryClient.setQueryData(listKey, options.initialRecentEntries);
  }

  let recentEntriesQuery!: ReturnType<typeof useRecentOwnTimeEntriesQuery>;
  let startTimerMutation!: ReturnType<typeof useStartTimerMutation>;
  let stopTimerMutation!: ReturnType<typeof useStopTimerMutation>;

  const Harness = defineComponent({
    setup() {
      const accessToken = computed(() => authStore.accessToken);
      const scope = computed(() => scopeValue);

      recentEntriesQuery = useRecentOwnTimeEntriesQuery({
        client,
        enabled: computed(() => Boolean(accessToken.value)),
        queryKey: computed(() => listKey),
        scope,
      });
      startTimerMutation = useStartTimerMutation({
        client,
        scope,
      });
      stopTimerMutation = useStopTimerMutation({
        client,
        scope,
      });

      return () => h("div");
    },
  });

  const wrapper = mount(Harness, {
    global: {
      plugins: [pinia, createTestQueryPlugin(queryClient)],
    },
  });

  return {
    client,
    listKey,
    queryClient,
    recentEntriesQuery,
    startTimerMutation,
    stopTimerMutation,
    wrapper,
  };
}

describe("query timer reconciliation", () => {
  const wrappers: VueWrapper[] = [];

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    while (wrappers.length > 0) {
      wrappers.pop()?.unmount();
    }

    vi.restoreAllMocks();
  });

  it("keeps a started timer entry authoritative when a stale recent-list request resolves late", async () => {
    const client = createClientMock();
    const staleListRequest = createAbortableDeferred<TimeEntryListResponse>();
    const startedEntry = createEntry({
      durationSeconds: null,
      endedAt: null,
      updatedAt: "2026-04-21T10:00:00.000Z",
    });

    client.listOwnEntries
      .mockImplementationOnce((_query, options?: ListOwnEntriesOptions) =>
        staleListRequest.wait(options?.signal),
      )
      .mockResolvedValue(createOwnEntriesResponse([startedEntry]));
    client.startTimer.mockResolvedValueOnce(startedEntry);

    const mounted = mountQueryHarness({
      client,
      initialRecentEntries: createOwnEntriesResponse([]),
    });

    wrappers.push(mounted.wrapper);

    await flushPromises();
    await mounted.startTimerMutation.mutateAsync({ taskId: TEST_IDS.task });
    await flushPromises();

    const firstSignal = client.listOwnEntries.mock.calls[0]?.[1]?.signal;

    expect(firstSignal).toBeInstanceOf(AbortSignal);
    expect(firstSignal?.aborted).toBe(true);
    expect(mounted.recentEntriesQuery.data.value?.items).toEqual([
      expect.objectContaining({
        endedAt: null,
        id: TEST_IDS.runningEntry,
      }),
    ]);

    staleListRequest.resolve(createOwnEntriesResponse([]));
    await flushPromises();

    expect(mounted.queryClient.getQueryData<TimeEntryListResponse>(mounted.listKey)?.items).toEqual([
      expect.objectContaining({
        endedAt: null,
        id: TEST_IDS.runningEntry,
      }),
    ]);
  });

  it("keeps a stopped timer entry authoritative when a stale running-list request resolves late", async () => {
    const client = createClientMock();
    const staleListRequest = createAbortableDeferred<TimeEntryListResponse>();
    const runningEntry = createEntry({
      durationSeconds: null,
      endedAt: null,
      updatedAt: "2026-04-21T10:00:00.000Z",
    });
    const stoppedEntry = createEntry({
      durationSeconds: 1800,
      endedAt: "2026-04-21T09:30:00.000Z",
      updatedAt: "2026-04-21T09:30:00.000Z",
    });

    client.listOwnEntries
      .mockImplementationOnce((_query, options?: ListOwnEntriesOptions) =>
        staleListRequest.wait(options?.signal),
      )
      .mockResolvedValue(createOwnEntriesResponse([stoppedEntry]));
    client.stopTimer.mockResolvedValueOnce(stoppedEntry);

    const mounted = mountQueryHarness({
      client,
      initialRecentEntries: createOwnEntriesResponse([runningEntry]),
    });

    wrappers.push(mounted.wrapper);

    await flushPromises();
    await mounted.stopTimerMutation.mutateAsync();
    await flushPromises();

    const firstSignal = client.listOwnEntries.mock.calls[0]?.[1]?.signal;

    expect(firstSignal).toBeInstanceOf(AbortSignal);
    expect(firstSignal?.aborted).toBe(true);
    expect(mounted.recentEntriesQuery.data.value?.items).toEqual([
      expect.objectContaining({
        endedAt: "2026-04-21T09:30:00.000Z",
        id: TEST_IDS.runningEntry,
      }),
    ]);

    staleListRequest.resolve(createOwnEntriesResponse([runningEntry]));
    await flushPromises();

    expect(mounted.queryClient.getQueryData<TimeEntryListResponse>(mounted.listKey)?.items).toEqual([
      expect.objectContaining({
        endedAt: "2026-04-21T09:30:00.000Z",
        id: TEST_IDS.runningEntry,
      }),
    ]);
  });

  it("does not reconcile a stopped timer from another workspace into the active workspace cache", async () => {
    const client = createClientMock();
    const stoppedOtherWorkspaceEntry = createEntry({
      durationSeconds: 1800,
      endedAt: "2026-04-21T09:30:00.000Z",
      updatedAt: "2026-04-21T09:30:00.000Z",
      workspace: {
        id: TEST_IDS.workspaceOther,
        name: "Workspace Beta",
      },
      workspaceId: TEST_IDS.workspaceOther,
    });
    const reconcileSpy = vi.spyOn(
      timeEntryQueryCache,
      "reconcileTimeEntryListCaches",
    );

    client.stopTimer.mockResolvedValueOnce(stoppedOtherWorkspaceEntry);

    const mounted = mountQueryHarness({
      client,
      initialRecentEntries: createOwnEntriesResponse([]),
      scope: ACTIVE_WORKSPACE_SCOPE,
    });

    wrappers.push(mounted.wrapper);

    await flushPromises();
    await mounted.stopTimerMutation.mutateAsync();
    await flushPromises();

    expect(reconcileSpy).not.toHaveBeenCalled();
    expect(
      mounted.queryClient.getQueryData<TimeEntryListResponse>(mounted.listKey)?.items,
    ).toEqual([]);
  });

  it("does not reject a successful timer mutation when cache reconciliation throws", async () => {
    const client = createClientMock();
    const reconcileError = new Error("reconcile failed");

    vi.spyOn(timeEntryQueryCache, "reconcileTimeEntryListCaches").mockImplementation(() => {
      throw reconcileError;
    });

    const mounted = mountQueryHarness({ client });

    wrappers.push(mounted.wrapper);

    await expect(
      mounted.startTimerMutation.mutateAsync({ taskId: TEST_IDS.task }),
    ).resolves.toEqual(
      expect.objectContaining({
        endedAt: null,
        id: TEST_IDS.runningEntry,
      }),
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        entryId: TEST_IDS.runningEntry,
        error: reconcileError,
      }),
    );
  });
});

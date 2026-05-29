// @vitest-environment jsdom

import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { TimeEntryListResponse, TimeEntryResponse } from "@gitiempo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

import { useDashboardOverview } from "./useDashboardOverview";
import { reconcileTimeEntryListCaches } from "@/lib/time-entry-query-cache";
import type { TimeEntriesClient } from "@/services/time-entries-client";
import { useAuthStore } from "@/stores/auth";
import {
  createTestQueryClient,
  createTestQueryPlugin,
} from "@/test/query-client";

const TEST_IDS = {
  focusProject: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9103",
  focusTask: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9203",
  runningEntry: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9005",
  secondaryProject: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9104",
  secondaryTask: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9204",
  startedEntry: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9004",
} as const;

const TEST_SCOPE = {
  userId: null,
  workspaceId: null,
};

type DashboardOverviewClient = Pick<TimeEntriesClient, "listOwnEntries">;

function createEntry(overrides: Partial<TimeEntryResponse> = {}): TimeEntryResponse {
  const { githubIssue = null, ...entryOverrides } = overrides;

  return {
    createdAt: "2026-04-21T09:00:00.000Z",
    description: null,
    durationSeconds: 3600,
    endedAt: "2026-04-21T10:00:00.000Z",
    id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
    isBillable: false,
    project: {
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9101",
      name: "Project Orion",
    },
    projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9101",
    source: "web",
    startedAt: "2026-04-21T09:00:00.000Z",
    task: {
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9201",
      title: "Improve reports filters",
    },
    taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9201",
    updatedAt: "2026-04-21T10:00:00.000Z",
    user: {
      avatarUrl: null,
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9301",
    },
    userId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9301",
    workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9401",
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

function createClientMock(): DashboardOverviewClient & {
  listOwnEntries: ReturnType<typeof vi.fn<TimeEntriesClient["listOwnEntries"]>>;
} {
  return {
    listOwnEntries: vi.fn(async () => createOwnEntriesResponse([])),
  };
}

function mountDashboardOverview(options?: {
  client?: ReturnType<typeof createClientMock>;
  toast?: { add: ReturnType<typeof vi.fn> };
}) {
  const pinia = createPinia();

  setActivePinia(pinia);

  const authStore = useAuthStore();
  authStore.accessToken = "access-token";

  const client = options?.client ?? createClientMock();
  const queryClient = createTestQueryClient();
  const toast = options?.toast ?? { add: vi.fn() };
  let dashboardOverview!: ReturnType<typeof useDashboardOverview>;

  const Harness = defineComponent({
    setup() {
      dashboardOverview = useDashboardOverview({
        client,
        toast: toast as never,
      });

      return () => h("div");
    },
  });

  const wrapper = mount(Harness, {
    global: {
      plugins: [pinia, createTestQueryPlugin(queryClient)],
    },
  });

  return { client, dashboardOverview, queryClient, toast, wrapper };
}

describe("useDashboardOverview", () => {
  const wrappers: VueWrapper[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    while (wrappers.length > 0) {
      wrappers.pop()?.unmount();
    }

    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("loads populated dashboard aggregates from existing time-entry endpoints", async () => {
    const client = createClientMock();

    client.listOwnEntries
      .mockResolvedValueOnce(
        createOwnEntriesResponse([
          createEntry({
            id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
            startedAt: "2026-04-21T11:00:00.000Z",
            endedAt: "2026-04-21T12:00:00.000Z",
            task: { id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9202", title: "Review pull requests" },
            taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9202",
          }),
          createEntry(),
        ]),
      )
      .mockResolvedValueOnce(
        createOwnEntriesResponse([
          createEntry(),
          createEntry({
            durationSeconds: 4500,
            endedAt: "2026-04-22T10:45:00.000Z",
            id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
            project: { id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9102", name: "Billing API" },
            projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9102",
            startedAt: "2026-04-22T09:30:00.000Z",
            task: { id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9203", title: "Fix export column order" },
            taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9203",
            updatedAt: "2026-04-22T10:45:00.000Z",
          }),
        ]),
      );

    const mounted = mountDashboardOverview({ client });

    wrappers.push(mounted.wrapper);

    const { dashboardOverview } = mounted;

    await flushPromises();

    expect(client.listOwnEntries).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, page: 1 }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(client.listOwnEntries).toHaveBeenCalledWith(
      expect.objectContaining({
        dateFrom: "2026-04-20T00:00:00.000Z",
        dateTo: "2026-04-27T00:00:00.000Z",
        page: 1,
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(dashboardOverview.pageState.value).toBe("ready");
    expect(dashboardOverview.dashboardStats.value[0]).toEqual({
      description: "1 project tracked today",
      label: "Today",
      value: "1h",
    });
    expect(dashboardOverview.dashboardStats.value[1]).toEqual({
      description: "2 entries tracked this week",
      label: "This Week",
      value: "2h 15m",
    });
    expect(dashboardOverview.weeklyFocus.value.project?.title).toBe("Billing API");
    expect(dashboardOverview.weeklyFocus.value.task?.title).toBe("Fix export column order");
    expect(dashboardOverview.recentEntryRows.value).toHaveLength(2);
    expect(dashboardOverview.recentEntryRows.value[0]?.isHighlighted).toBe(false);
  });

  it("keeps request-error distinct from empty and shows a read-failure toast", async () => {
    const client = createClientMock();
    const toast = { add: vi.fn() };

    client.listOwnEntries.mockRejectedValueOnce(new Error("network down"));

    const mounted = mountDashboardOverview({ client, toast });

    wrappers.push(mounted.wrapper);

    const { dashboardOverview } = mounted;

    await flushPromises();

    expect(dashboardOverview.pageState.value).toBe("request-error");
    expect(dashboardOverview.requestErrorMessage.value).toBe("network down");
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Refresh and try again.",
        severity: "error",
        summary: "Could not load dashboard overview",
      }),
    );
  });

  it("surfaces a weekly-summary request failure as request-error instead of empty", async () => {
    const client = createClientMock();
    const toast = { add: vi.fn() };

    client.listOwnEntries
      .mockResolvedValueOnce(createOwnEntriesResponse([createEntry()]))
      .mockRejectedValueOnce(new Error("weekly summary failed"));

    const mounted = mountDashboardOverview({ client, toast });

    wrappers.push(mounted.wrapper);

    const { dashboardOverview } = mounted;

    await flushPromises();

    expect(dashboardOverview.pageState.value).toBe("request-error");
    expect(dashboardOverview.requestErrorMessage.value).toBe("weekly summary failed");
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "error",
        summary: "Could not load dashboard overview",
      }),
    );
  });

  it("renders the empty state only after successful recent-entry and weekly requests", async () => {
    const client = createClientMock();

    client.listOwnEntries
      .mockResolvedValueOnce(createOwnEntriesResponse([]))
      .mockResolvedValueOnce(createOwnEntriesResponse([]));

    const mounted = mountDashboardOverview({ client });

    wrappers.push(mounted.wrapper);

    const { dashboardOverview } = mounted;

    expect(dashboardOverview.pageState.value).toBe("loading");

    await flushPromises();

    expect(dashboardOverview.pageState.value).toBe("empty");
  });

  it("loads all weekly pages before computing aggregates", async () => {
    const client = createClientMock();

    client.listOwnEntries
      .mockResolvedValueOnce(
        createOwnEntriesResponse([createEntry()], { limit: 10, page: 1, total: 1, totalPages: 1 }),
      )
      .mockResolvedValueOnce(
        createOwnEntriesResponse(
          [
            createEntry({
              durationSeconds: 3600,
              id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9010",
              project: { id: TEST_IDS.focusProject, name: "Billing API" },
              projectId: TEST_IDS.focusProject,
              task: { id: TEST_IDS.focusTask, title: "Fix export column order" },
              taskId: TEST_IDS.focusTask,
            }),
          ],
          { limit: 100, page: 1, total: 2, totalPages: 2 },
        ),
      )
      .mockResolvedValueOnce(
        createOwnEntriesResponse(
          [
            createEntry({
              durationSeconds: 5400,
              endedAt: "2026-04-21T10:30:00.000Z",
              id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9011",
              project: { id: TEST_IDS.secondaryProject, name: "Admin Web" },
              projectId: TEST_IDS.secondaryProject,
              task: { id: TEST_IDS.secondaryTask, title: "Polish dashboard cards" },
              taskId: TEST_IDS.secondaryTask,
            }),
          ],
          { limit: 100, page: 2, total: 2, totalPages: 2 },
        ),
      );

    const mounted = mountDashboardOverview({ client });

    wrappers.push(mounted.wrapper);

    const { dashboardOverview } = mounted;

    await flushPromises();

    expect(client.listOwnEntries).toHaveBeenCalledWith(
      expect.objectContaining({
        dateFrom: "2026-04-20T00:00:00.000Z",
        dateTo: "2026-04-27T00:00:00.000Z",
        page: 2,
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(dashboardOverview.dashboardStats.value[1]).toEqual({
      description: "2 entries tracked this week",
      label: "This Week",
      value: "2h 30m",
    });
    expect(dashboardOverview.weeklyFocus.value.project?.title).toBe("Admin Web");
  });

  it("keeps running recent-entry durations reactive without adding dashboard timer controls", async () => {
    const client = createClientMock();

    client.listOwnEntries
      .mockResolvedValueOnce(
        createOwnEntriesResponse([
          createEntry({
            durationSeconds: null,
            endedAt: null,
            id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9004",
            startedAt: "2026-04-21T11:00:00.000Z",
          }),
        ]),
      )
      .mockResolvedValueOnce(
        createOwnEntriesResponse([
          createEntry({
            durationSeconds: null,
            endedAt: null,
            id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9004",
            startedAt: "2026-04-21T11:00:00.000Z",
          }),
        ]),
      );

    const mounted = mountDashboardOverview({ client });

    wrappers.push(mounted.wrapper);

    const { dashboardOverview } = mounted;

    await flushPromises();

    expect(dashboardOverview.recentEntryRows.value[0]?.timeRangeLabel).toBe("11:00 - Running");
    expect(dashboardOverview.recentEntryRows.value[0]?.durationLabel).toBe("01:00:00");

    vi.advanceTimersByTime(2000);
    await flushPromises();

    expect(dashboardOverview.recentEntryRows.value[0]?.durationLabel).toBe("01:00:02");
  });

  it("reflects a started timer entry from Query cache reconciliation", async () => {
    const client = createClientMock();

    client.listOwnEntries
      .mockResolvedValueOnce(createOwnEntriesResponse([]))
      .mockResolvedValueOnce(createOwnEntriesResponse([]));

    const mounted = mountDashboardOverview({ client });

    wrappers.push(mounted.wrapper);

    const { dashboardOverview, queryClient } = mounted;

    await flushPromises();

    reconcileTimeEntryListCaches(
      queryClient,
      TEST_SCOPE,
      createEntry({
        durationSeconds: null,
        endedAt: null,
        id: TEST_IDS.startedEntry,
        startedAt: "2026-04-21T11:00:00.000Z",
      }),
    );

    expect(dashboardOverview.pageState.value).toBe("ready");
    expect(dashboardOverview.recentEntryRows.value[0]).toEqual({
      durationLabel: "01:00:00",
      id: TEST_IDS.startedEntry,
      isHighlighted: true,
      projectName: "Project Orion",
      taskTitle: "Improve reports filters",
      timeRangeLabel: "11:00 - Running",
    });
    expect(dashboardOverview.dashboardStats.value[0]?.value).toBe("1h");
  });

  it("reflects a stopped timer entry from Query cache reconciliation", async () => {
    const client = createClientMock();

    client.listOwnEntries
      .mockResolvedValueOnce(
        createOwnEntriesResponse([
          createEntry({
            durationSeconds: null,
            endedAt: null,
            id: TEST_IDS.runningEntry,
            startedAt: "2026-04-21T11:00:00.000Z",
          }),
        ]),
      )
      .mockResolvedValueOnce(
        createOwnEntriesResponse([
          createEntry({
            durationSeconds: null,
            endedAt: null,
            id: TEST_IDS.runningEntry,
            startedAt: "2026-04-21T11:00:00.000Z",
          }),
        ]),
      );

    const mounted = mountDashboardOverview({ client });

    wrappers.push(mounted.wrapper);

    const { dashboardOverview, queryClient } = mounted;

    await flushPromises();

    reconcileTimeEntryListCaches(
      queryClient,
      TEST_SCOPE,
      createEntry({
        durationSeconds: 1800,
        endedAt: "2026-04-21T11:30:00.000Z",
        id: TEST_IDS.runningEntry,
        startedAt: "2026-04-21T11:00:00.000Z",
        updatedAt: "2026-04-21T11:30:00.000Z",
      }),
    );

    expect(dashboardOverview.recentEntryRows.value[0]).toEqual({
      durationLabel: "30m",
      id: TEST_IDS.runningEntry,
      isHighlighted: false,
      projectName: "Project Orion",
      taskTitle: "Improve reports filters",
      timeRangeLabel: "11:00 - 11:30",
    });
    expect(dashboardOverview.dashboardStats.value[0]?.value).toBe("30m");

    vi.advanceTimersByTime(2000);
    await flushPromises();

    expect(dashboardOverview.recentEntryRows.value[0]?.durationLabel).toBe("30m");
    expect(dashboardOverview.dashboardStats.value[0]?.value).toBe("30m");
  });
});

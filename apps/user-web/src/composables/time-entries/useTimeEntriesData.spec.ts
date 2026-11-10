import { flushPromises, mount } from "@vue/test-utils";
import type {
  ProjectResponse,
  TimeEntryListResponse,
  TimeEntryResponse,
} from "@gitiempo/shared";
import { computed, defineComponent, h, nextTick, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTimeEntriesData } from "./useTimeEntriesData";
import { timeEntriesKeys, type UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";
import { createTestQueryClient, createTestQueryPlugin } from "@/test/query-client";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

function entries(
  search: string,
  total: number,
  items: TimeEntryResponse[] = [],
): TimeEntryListResponse {
  return {
    items,
    meta: { limit: 20, page: 1, total, totalPages: 1 },
  };
}

function project(id: string): ProjectResponse {
  return { id } as ProjectResponse;
}

function entry(projectId: string): TimeEntryResponse {
  return { id: `entry-${projectId}`, projectId } as TimeEntryResponse;
}

describe("useTimeEntriesData", () => {
  afterEach(() => vi.useRealTimers());

  it("reuses fresh entries, refreshes stale retained entries, and expires inactive entries", async () => {
    vi.useFakeTimers();
    const queryClient = createTestQueryClient();
    const scope = { userId: "user-1", workspaceId: "workspace-1" };
    const client = {
      listOwnEntries: vi.fn(async () => entries("A", 1)),
      listVisibleProjects: vi.fn(async () => []),
    } as unknown as TimeEntriesClient;
    let data!: ReturnType<typeof useTimeEntriesData>;
    // eslint-disable-next-line vue/one-component-per-file
    const Host = defineComponent({
      setup() {
        data = useTimeEntriesData({
          client,
          enabled: computed(() => true),
          entryListQuery: computed(() => ({ limit: 20, page: 1 })),
          scope: computed(() => scope),
        });
        return () => h("div", String(data.totalRecords.value));
      },
    });
    const render = () => mount(Host, { global: { plugins: [createTestQueryPlugin(queryClient)] } });
    let wrapper = render();
    await flushPromises();
    expect(client.listOwnEntries).toHaveBeenCalledTimes(1);
    wrapper.unmount();

    await vi.advanceTimersByTimeAsync(29_000);
    wrapper = render();
    expect(data.hasLoadedEntries.value).toBe(true);
    await flushPromises();
    expect(client.listOwnEntries).toHaveBeenCalledTimes(1);
    // Visibility remains authoritative independently of list freshness.
    expect(client.listVisibleProjects).toHaveBeenCalledTimes(2);
    wrapper.unmount();

    await vi.advanceTimersByTimeAsync(1_001);
    wrapper = render();
    expect(data.hasLoadedEntries.value).toBe(true);
    expect(data.isLoadingEntries.value).toBe(false);
    await flushPromises();
    expect(client.listOwnEntries).toHaveBeenCalledTimes(2);
    wrapper.unmount();

    await vi.advanceTimersByTimeAsync(300_001);
    expect(queryClient.getQueriesData({ queryKey: timeEntriesKeys.all(scope) })).toEqual([]);
    wrapper = render();
    expect(data.hasLoadedEntries.value).toBe(false);
    await flushPromises();
    expect(client.listOwnEntries).toHaveBeenCalledTimes(3);
    wrapper.unmount();
    queryClient.clear();
  });

  it("keeps the latest A→B→C result and drops pending results from an old scope", async () => {
    const queryClient = createTestQueryClient();
    const filter = ref<string | undefined>("A");
    const scope = ref<UserServerStateScope>({ userId: "user-1", workspaceId: "workspace-1" });
    const reads = new Map<string, ReturnType<typeof deferred<TimeEntryListResponse>>>();
    const client = {
      listOwnEntries: vi.fn((query: { search?: string }) => {
        const key = `${scope.value.workspaceId}:${query.search}`;
        const next = deferred<TimeEntryListResponse>();
        reads.set(key, next);
        return next.promise;
      }),
      listVisibleProjects: vi.fn(async () => []),
    } as unknown as TimeEntriesClient;
    let data!: ReturnType<typeof useTimeEntriesData>;
    // eslint-disable-next-line vue/one-component-per-file
    const Host = defineComponent({
      setup() {
        data = useTimeEntriesData({
          client,
          enabled: computed(() => true),
          entryListQuery: computed(() => ({ limit: 20, page: 1, search: filter.value })),
          scope: computed(() => scope.value),
        });
        return () => h("div", `${data.totalRecords.value}:${data.isShowingPreviousEntries.value}`);
      },
    });
    const wrapper = mount(Host, { global: { plugins: [createTestQueryPlugin(queryClient)] } });

    await vi.waitFor(() => expect(reads.has("workspace-1:A")).toBe(true));
    reads.get("workspace-1:A")?.resolve(entries("A", 1));
    await flushPromises();
    expect(wrapper.text()).toBe("1:false");

    filter.value = "B";
    await nextTick();
    await vi.waitFor(() => expect(reads.has("workspace-1:B")).toBe(true));
    expect(wrapper.text()).toBe("1:true");

    filter.value = "C";
    await nextTick();
    await vi.waitFor(() => expect(reads.has("workspace-1:C")).toBe(true));
    reads.get("workspace-1:C")?.resolve(entries("C", 3));
    await flushPromises();
    expect(wrapper.text()).toBe("3:false");

    reads.get("workspace-1:B")?.resolve(entries("B", 2));
    await flushPromises();
    expect(wrapper.text()).toBe("3:false");

    filter.value = "scope-pending";
    await nextTick();
    await vi.waitFor(() => expect(reads.has("workspace-1:scope-pending")).toBe(true));
    scope.value = { userId: "user-1", workspaceId: "workspace-2" };
    await nextTick();
    await vi.waitFor(() => expect(reads.has("workspace-2:scope-pending")).toBe(true));
    await flushPromises();
    expect(wrapper.text()).toBe("0:false");
    reads.get("workspace-1:scope-pending")?.resolve(entries("scope-pending", 9));
    await flushPromises();
    expect(data.hasLoadedEntries.value).toBe(false);
    reads.get("workspace-2:scope-pending")?.resolve(entries("scope-pending", 4));
    await flushPromises();
    expect(wrapper.text()).toBe("4:false");
    wrapper.unmount();
  });

  it("clears delayed entries after an authoritative visibility refresh revokes their project", async () => {
    const queryClient = createTestQueryClient();
    const revokedProjectsRead = deferred<ProjectResponse[]>();
    const entryRead = deferred<TimeEntryListResponse>();
    const client = {
      listOwnEntries: vi.fn(() => entryRead.promise),
      listVisibleProjects: vi
        .fn()
        .mockResolvedValueOnce([project("project-a")])
        .mockImplementationOnce(() => revokedProjectsRead.promise),
    } as unknown as TimeEntriesClient;
    let data!: ReturnType<typeof useTimeEntriesData>;
    // eslint-disable-next-line vue/one-component-per-file
    const Host = defineComponent({
      setup() {
        data = useTimeEntriesData({
          client,
          enabled: computed(() => true),
          entryListQuery: computed(() => ({ limit: 20, page: 1 })),
          scope: computed(() => ({ userId: "user-1", workspaceId: "workspace-1" })),
        });
        return () => h("div", `${data.entries.value.length}:${data.totalRecords.value}`);
      },
    });
    const wrapper = mount(Host, { global: { plugins: [createTestQueryPlugin(queryClient)] } });

    await vi.waitFor(() => expect(client.listVisibleProjects).toHaveBeenCalledTimes(1));
    await expect(data.ensureProjectsLoaded()).resolves.toEqual([project("project-a")]);

    const visibilityRefresh = data.ensureProjectsLoaded(true);
    await vi.waitFor(() => expect(client.listVisibleProjects).toHaveBeenCalledTimes(2));
    revokedProjectsRead.resolve([]);
    await visibilityRefresh;
    entryRead.resolve(entries("", 1, [entry("project-a")]));
    await flushPromises();

    expect(data.entries.value).toEqual([]);
    expect(data.totalRecords.value).toBe(0);
    expect(wrapper.text()).toBe("0:0");
    wrapper.unmount();
  });
});

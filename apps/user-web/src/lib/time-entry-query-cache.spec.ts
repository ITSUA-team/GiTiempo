import type { TimeEntryListResponse, TimeEntryResponse } from "@gitiempo/shared";
import { describe, expect, it } from "vitest";

import { timeEntriesKeys } from "@/lib/query-keys";
import { createTestQueryClient } from "@/test/query-client";

import { reconcileTimeEntryListCaches } from "./time-entry-query-cache";

const TEST_SCOPE = {
  userId: null,
  workspaceId: null,
};

const TEST_IDS = {
  existingEntry: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f3001",
  newEntry: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f3002",
  pageTwoEntry: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f3003",
  project: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1001",
  projectAlt: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002",
  task: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2001",
  taskAlt: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002",
  user: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f4001",
  workspace: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f5001",
} as const;

function createEntry(overrides: Partial<TimeEntryResponse> = {}): TimeEntryResponse {
  return {
    createdAt: "2026-04-21T09:00:00.000Z",
    description: null,
    durationSeconds: 1800,
    endedAt: "2026-04-21T09:30:00.000Z",
    id: TEST_IDS.existingEntry,
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
    updatedAt: "2026-04-21T09:30:00.000Z",
    user: {
      avatarUrl: null,
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: TEST_IDS.user,
    },
    userId: TEST_IDS.user,
    workspaceId: TEST_IDS.workspace,
    githubIssue: null,
    ...overrides,
  };
}

function createListResponse(
  items: TimeEntryResponse[],
  meta: TimeEntryListResponse["meta"] = {
    limit: 10,
    page: 1,
    total: items.length,
    totalPages: items.length === 0 ? 0 : 1,
  },
): TimeEntryListResponse {
  return { items, meta };
}

describe("reconcileTimeEntryListCaches", () => {
  it("matches search-filtered caches by task title only", () => {
    const queryClient = createTestQueryClient();
    const taskTitleKey = timeEntriesKeys.list(TEST_SCOPE, { search: "reports" });
    const projectNameKey = timeEntriesKeys.list(TEST_SCOPE, { search: "orion" });

    queryClient.setQueryData(taskTitleKey, createListResponse([]));
    queryClient.setQueryData(projectNameKey, createListResponse([]));

    reconcileTimeEntryListCaches(queryClient, TEST_SCOPE, createEntry());

    expect(
      queryClient.getQueryData<TimeEntryListResponse>(taskTitleKey)?.items,
    ).toEqual([expect.objectContaining({ id: TEST_IDS.existingEntry })]);
    expect(
      queryClient.getQueryData<TimeEntryListResponse>(projectNameKey)?.items,
    ).toEqual([]);
  });

  it("honors date-window boundaries during reconciliation", () => {
    const queryClient = createTestQueryClient();
    const listKey = timeEntriesKeys.list(TEST_SCOPE, {
      dateFrom: "2026-04-21T09:00:00.000Z",
      dateTo: "2026-04-21T10:00:00.000Z",
    });

    queryClient.setQueryData(listKey, createListResponse([]));

    reconcileTimeEntryListCaches(
      queryClient,
      TEST_SCOPE,
      createEntry({ id: TEST_IDS.existingEntry, startedAt: "2026-04-21T09:00:00.000Z" }),
    );
    reconcileTimeEntryListCaches(
      queryClient,
      TEST_SCOPE,
      createEntry({ id: TEST_IDS.newEntry, startedAt: "2026-04-21T10:00:00.000Z" }),
    );

    expect(queryClient.getQueryData<TimeEntryListResponse>(listKey)).toEqual({
      items: [expect.objectContaining({ id: TEST_IDS.existingEntry })],
      meta: {
        limit: 10,
        page: 1,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it("recomputes totalPages when page-one reconciliation changes the total", () => {
    const queryClient = createTestQueryClient();
    const listKey = timeEntriesKeys.list(TEST_SCOPE, { limit: 1, page: 1 });

    queryClient.setQueryData(
      listKey,
      createListResponse(
        [createEntry({ id: TEST_IDS.pageTwoEntry, startedAt: "2026-04-20T09:00:00.000Z" })],
        { limit: 1, page: 1, total: 1, totalPages: 1 },
      ),
    );

    reconcileTimeEntryListCaches(
      queryClient,
      TEST_SCOPE,
      createEntry({ id: TEST_IDS.newEntry, startedAt: "2026-04-21T10:00:00.000Z" }),
    );

    expect(queryClient.getQueryData<TimeEntryListResponse>(listKey)?.meta).toEqual({
      limit: 1,
      page: 1,
      total: 2,
      totalPages: 2,
    });
  });

  it("replaces visible rows on later pages when the entry id already exists", () => {
    const queryClient = createTestQueryClient();
    const listKey = timeEntriesKeys.list(TEST_SCOPE, { limit: 1, page: 2 });

    queryClient.setQueryData(
      listKey,
      createListResponse(
        [
          createEntry({
            durationSeconds: null,
            endedAt: null,
            id: TEST_IDS.existingEntry,
            startedAt: "2026-04-20T09:00:00.000Z",
          }),
        ],
        { limit: 1, page: 2, total: 2, totalPages: 2 },
      ),
    );

    reconcileTimeEntryListCaches(
      queryClient,
      TEST_SCOPE,
      createEntry({
        durationSeconds: 1800,
        endedAt: "2026-04-20T09:30:00.000Z",
        id: TEST_IDS.existingEntry,
        startedAt: "2026-04-20T09:00:00.000Z",
        updatedAt: "2026-04-20T09:30:00.000Z",
      }),
    );

    expect(queryClient.getQueryData<TimeEntryListResponse>(listKey)).toEqual({
      items: [
        expect.objectContaining({
          durationSeconds: 1800,
          endedAt: "2026-04-20T09:30:00.000Z",
          id: TEST_IDS.existingEntry,
        }),
      ],
      meta: {
        limit: 1,
        page: 2,
        total: 2,
        totalPages: 2,
      },
    });
  });

  it("does not inject new rows into later paginated caches", () => {
    const queryClient = createTestQueryClient();
    const listKey = timeEntriesKeys.list(TEST_SCOPE, { limit: 1, page: 2 });
    const existingPage = createListResponse(
      [createEntry({ id: TEST_IDS.pageTwoEntry, startedAt: "2026-04-20T09:00:00.000Z" })],
      { limit: 1, page: 2, total: 2, totalPages: 2 },
    );

    queryClient.setQueryData(listKey, existingPage);

    reconcileTimeEntryListCaches(
      queryClient,
      TEST_SCOPE,
      createEntry({ id: TEST_IDS.newEntry, startedAt: "2026-04-21T10:00:00.000Z" }),
    );

    expect(queryClient.getQueryData<TimeEntryListResponse>(listKey)).toEqual(existingPage);
  });

  it("removes entries that stop matching project filters and decrements paginated metadata", () => {
    const queryClient = createTestQueryClient();
    const listKey = timeEntriesKeys.list(TEST_SCOPE, {
      limit: 1,
      page: 1,
      projectId: TEST_IDS.project,
    });

    queryClient.setQueryData(
      listKey,
      createListResponse([createEntry()], {
        limit: 1,
        page: 1,
        total: 1,
        totalPages: 1,
      }),
    );

    reconcileTimeEntryListCaches(
      queryClient,
      TEST_SCOPE,
      createEntry({
        project: {
          id: TEST_IDS.projectAlt,
          name: "Billing API",
        },
        projectId: TEST_IDS.projectAlt,
      }),
    );

    expect(queryClient.getQueryData<TimeEntryListResponse>(listKey)).toEqual({
      items: [],
      meta: {
        limit: 1,
        page: 1,
        total: 0,
        totalPages: 0,
      },
    });
  });

  it("removes entries that stop matching filters and decrements paginated metadata", () => {
    const queryClient = createTestQueryClient();
    const listKey = timeEntriesKeys.list(TEST_SCOPE, {
      limit: 1,
      page: 1,
      taskId: TEST_IDS.task,
    });

    queryClient.setQueryData(
      listKey,
      createListResponse([createEntry()], {
        limit: 1,
        page: 1,
        total: 1,
        totalPages: 1,
      }),
    );

    reconcileTimeEntryListCaches(
      queryClient,
      TEST_SCOPE,
      createEntry({
        task: {
          id: TEST_IDS.taskAlt,
          title: "Review PM scope rules",
        },
        taskId: TEST_IDS.taskAlt,
      }),
    );

    expect(queryClient.getQueryData<TimeEntryListResponse>(listKey)).toEqual({
      items: [],
      meta: {
        limit: 1,
        page: 1,
        total: 0,
        totalPages: 0,
      },
    });
  });

  it("reconciles aggregated array caches for existing entries", () => {
    const queryClient = createTestQueryClient();
    const listKey = timeEntriesKeys.allList(TEST_SCOPE, { limit: 100 });

    queryClient.setQueryData(listKey, [
      createEntry({
        durationSeconds: null,
        endedAt: null,
      }),
    ]);

    reconcileTimeEntryListCaches(
      queryClient,
      TEST_SCOPE,
      createEntry({
        durationSeconds: 3600,
        endedAt: "2026-04-21T10:00:00.000Z",
      }),
    );

    expect(
      queryClient.getQueryData<TimeEntryResponse[]>(listKey),
    ).toEqual([
      expect.objectContaining({
        durationSeconds: 3600,
        endedAt: "2026-04-21T10:00:00.000Z",
      }),
    ]);
  });

  it("skips unsupported time-entry query keys even when cached data is array-shaped", () => {
    const queryClient = createTestQueryClient();
    const unsupportedKey = [...timeEntriesKeys.all(TEST_SCOPE), "summary"] as const;
    const unsupportedData = [
      createEntry({
        durationSeconds: null,
        endedAt: null,
      }),
    ];

    queryClient.setQueryData(unsupportedKey, unsupportedData);

    reconcileTimeEntryListCaches(
      queryClient,
      TEST_SCOPE,
      createEntry({
        durationSeconds: 3600,
        endedAt: "2026-04-21T10:00:00.000Z",
      }),
    );

    expect(
      queryClient.getQueryData<TimeEntryResponse[]>(unsupportedKey),
    ).toEqual(unsupportedData);
  });
});

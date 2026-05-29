// @vitest-environment jsdom

import type { TimeEntryListResponse, TimeEntryResponse } from "@gitiempo/shared";
import { describe, expect, it } from "vitest";

import { timeEntriesKeys } from "@/lib/query-keys";
import { createTestQueryClient } from "@/test/query-client";

import { reconcileTimeEntryListCaches } from "./time-entry-query-cache";

const TEST_SCOPE = {
  userId: null,
  workspaceId: null,
};

function createEntry(overrides: Partial<TimeEntryResponse> = {}): TimeEntryResponse {
  return {
    createdAt: "2026-04-21T09:00:00.000Z",
    description: null,
    durationSeconds: 1800,
    endedAt: "2026-04-21T09:30:00.000Z",
    id: "entry-1",
    isBillable: false,
    project: {
      id: "project-1",
      name: "Project Orion",
    },
    projectId: "project-1",
    source: "web",
    startedAt: "2026-04-21T09:00:00.000Z",
    task: {
      id: "task-1",
      title: "Improve reports filters",
    },
    taskId: "task-1",
    updatedAt: "2026-04-21T09:30:00.000Z",
    user: {
      avatarUrl: null,
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: "user-1",
    },
    userId: "user-1",
    workspaceId: "workspace-1",
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
    ).toEqual([expect.objectContaining({ id: "entry-1" })]);
    expect(
      queryClient.getQueryData<TimeEntryListResponse>(projectNameKey)?.items,
    ).toEqual([]);
  });

  it("recomputes totalPages when page-one reconciliation changes the total", () => {
    const queryClient = createTestQueryClient();
    const listKey = timeEntriesKeys.list(TEST_SCOPE, { limit: 1, page: 1 });

    queryClient.setQueryData(
      listKey,
      createListResponse(
        [createEntry({ id: "entry-0", startedAt: "2026-04-20T09:00:00.000Z" })],
        { limit: 1, page: 1, total: 1, totalPages: 1 },
      ),
    );

    reconcileTimeEntryListCaches(
      queryClient,
      TEST_SCOPE,
      createEntry({ id: "entry-2", startedAt: "2026-04-21T10:00:00.000Z" }),
    );

    expect(queryClient.getQueryData<TimeEntryListResponse>(listKey)?.meta).toEqual({
      limit: 1,
      page: 1,
      total: 2,
      totalPages: 2,
    });
  });

  it("does not inject new rows into later paginated caches", () => {
    const queryClient = createTestQueryClient();
    const listKey = timeEntriesKeys.list(TEST_SCOPE, { limit: 1, page: 2 });
    const existingPage = createListResponse(
      [createEntry({ id: "entry-0", startedAt: "2026-04-20T09:00:00.000Z" })],
      { limit: 1, page: 2, total: 2, totalPages: 2 },
    );

    queryClient.setQueryData(listKey, existingPage);

    reconcileTimeEntryListCaches(
      queryClient,
      TEST_SCOPE,
      createEntry({ id: "entry-2", startedAt: "2026-04-21T10:00:00.000Z" }),
    );

    expect(queryClient.getQueryData<TimeEntryListResponse>(listKey)).toEqual(existingPage);
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
});

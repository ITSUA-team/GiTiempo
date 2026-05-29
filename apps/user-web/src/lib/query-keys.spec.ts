import { describe, expect, it } from "vitest";

import {
  normalizeTimeEntryListQuery,
  readTimeEntryListQueryKey,
  timeEntriesKeys,
  timerKeys,
  userMutationInvalidationKeys,
  userProjectsKeys,
  type UserServerStateScope,
} from "./query-keys";

const scope: UserServerStateScope = {
  userId: "user-1",
  workspaceId: "workspace-1",
};

describe("user-web query keys", () => {
  it("normalizes time-entry list server query scope", () => {
    expect(
      normalizeTimeEntryListQuery({
        dateFrom: "2026-05-01T00:00:00.000Z",
        dateTo: "2026-05-08T00:00:00.000Z",
        limit: 25,
        page: 2,
        projectId: "project-1",
        search: "reports",
        taskId: "task-1",
      }),
    ).toEqual({
      dateFrom: "2026-05-01T00:00:00.000Z",
      dateTo: "2026-05-08T00:00:00.000Z",
      limit: 25,
      page: 2,
      projectId: "project-1",
      search: "reports",
      taskId: "task-1",
    });
  });

  it("includes auth/workspace scope and list inputs in time-entry keys", () => {
    expect(timeEntriesKeys.list(scope, { page: 3, projectId: "project-1" })).toEqual([
      "user-web",
      { userId: "user-1", workspaceId: "workspace-1" },
      "time-entries",
      "list",
      {
        dateFrom: null,
        dateTo: null,
        limit: null,
        page: 3,
        projectId: "project-1",
        search: null,
        taskId: null,
      },
    ]);
  });

  it("keeps timer project-task keys separate from projects page task keys", () => {
    expect(timerKeys.projectTasks(scope, "project-1")).toEqual([
      "user-web",
      { userId: "user-1", workspaceId: "workspace-1" },
      "top-bar-timer",
      "project-tasks",
      "project-1",
    ]);
    expect(userProjectsKeys.projectTasks(scope, "project-1")).toEqual([
      "user-web",
      { userId: "user-1", workspaceId: "workspace-1" },
      "projects",
      "project-tasks",
      "project-1",
    ]);
  });

  it("keeps all-page time-entry keys separate from paginated list keys", () => {
    expect(
      timeEntriesKeys.allList(scope, {
        dateFrom: "2026-05-04T00:00:00.000Z",
        dateTo: "2026-05-07T12:00:00.000Z",
        limit: 100,
      }),
    ).toEqual([
      "user-web",
      { userId: "user-1", workspaceId: "workspace-1" },
      "time-entries",
      "list-all",
      {
        dateFrom: "2026-05-04T00:00:00.000Z",
        dateTo: "2026-05-07T12:00:00.000Z",
        limit: 100,
        page: null,
        projectId: null,
        search: null,
        taskId: null,
      },
    ]);
  });

  it("provides targeted invalidation keys after mutations", () => {
    expect(userMutationInvalidationKeys.afterTimeEntryMutation(scope)).toEqual([
      timeEntriesKeys.all(scope),
      timerKeys.all(scope),
    ]);
    expect(userMutationInvalidationKeys.afterTaskMutation(scope, "project-1")).toEqual([
      userProjectsKeys.all(scope),
      userProjectsKeys.projectTasks(scope, "project-1"),
      timerKeys.all(scope),
    ]);
  });

  it("reads normalized list queries from time-entry list keys", () => {
    const query = readTimeEntryListQueryKey(
      timeEntriesKeys.list(scope, { limit: 20, page: 2, search: "reports" }),
    );

    expect(query).toEqual({
      dateFrom: null,
      dateTo: null,
      limit: 20,
      page: 2,
      projectId: null,
      search: "reports",
      taskId: null,
    });
  });

  it("reads normalized list-all queries from aggregated time-entry keys", () => {
    const query = readTimeEntryListQueryKey(
      timeEntriesKeys.allList(scope, {
        dateFrom: "2026-04-21T00:00:00.000Z",
        dateTo: "2026-04-28T00:00:00.000Z",
        limit: 100,
      }),
    );

    expect(query).toEqual({
      dateFrom: "2026-04-21T00:00:00.000Z",
      dateTo: "2026-04-28T00:00:00.000Z",
      limit: 100,
      page: null,
      projectId: null,
      search: null,
      taskId: null,
    });
  });

  it("rejects non-time-entry keys", () => {
    expect(
      readTimeEntryListQueryKey(timerKeys.current(scope)),
    ).toBeNull();
  });
});

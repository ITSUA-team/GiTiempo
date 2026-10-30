import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/vue-query";

import {
  normalizeTimeEntryListQuery,
  getScopeKey,
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

  it("normalizes whitespace before comparing server-state scopes", () => {
    expect(getScopeKey({ userId: " user-1 ", workspaceId: " workspace-1 " })).toBe(
      getScopeKey(scope),
    );
  });

  it("keeps timer project-task keys separate from projects page task keys", () => {
    expect(timerKeys.currentRaw(scope)).toEqual([
      "user-web",
      { userId: "user-1", workspaceId: "workspace-1" },
      "top-bar-timer",
      "current",
      "raw",
    ]);
    expect(timerKeys.projectTaskOptions(scope, "project-1")).toEqual([
      "user-web",
      { userId: "user-1", workspaceId: "workspace-1" },
      "top-bar-timer",
      "project-task-options",
      "project-1",
      null,
    ]);
    expect(userProjectsKeys.projectTasks(scope, "project-1", null)).toEqual([
      "user-web",
      { userId: "user-1", workspaceId: "workspace-1" },
      "projects",
      "project-tasks",
      "project-1",
      null,
    ]);
  });

  it("separates project-task caches when the server narrows access", () => {
    expect(userProjectsKeys.projectTasks(scope, "project-1", "project")).not.toEqual(
      userProjectsKeys.projectTasks(scope, "project-1", "own-time"),
    );
    expect(timerKeys.projectTaskOptions(scope, "project-1", "project")).not.toEqual(
      timerKeys.projectTaskOptions(scope, "project-1", "own-time"),
    );
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

  it("keeps a project-A task mutation from invalidating project-B task queries", () => {
    expect(userMutationInvalidationKeys.afterTimeEntryMutation(scope, ["project-1"])).toEqual([
      timeEntriesKeys.all(scope),
      timerKeys.current(scope),
      timerKeys.eligibleLastEntryAll(scope),
      userProjectsKeys.visibleProjects(scope),
      userProjectsKeys.projectTasksAll(scope, "project-1"),
      timerKeys.projectTaskOptionsAll(scope, "project-1"),
    ]);
    expect(userMutationInvalidationKeys.afterTaskMutation(scope, "project-1")).toEqual([
      userProjectsKeys.projectTasksAll(scope, "project-1"),
      timerKeys.projectTaskOptionsAll(scope, "project-1"),
      timerKeys.current(scope),
    ]);
  });

  it("invalidates only the affected project task collection", async () => {
    const queryClient = new QueryClient();
    const projectAKey = userProjectsKeys.projectTasks(scope, "project-a", "project");
    const projectBKey = userProjectsKeys.projectTasks(scope, "project-b", "project");

    queryClient.setQueryData(projectAKey, []);
    queryClient.setQueryData(projectBKey, []);

    await queryClient.invalidateQueries({
      queryKey: userMutationInvalidationKeys.afterTaskMutation(scope, "project-a")[0],
    });

    expect(queryClient.getQueryState(projectAKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(projectBKey)?.isInvalidated).toBe(false);
  });

  it("uses the broad project fallback only when a deleted entry has no cached source", () => {
    expect(
      userMutationInvalidationKeys.afterTimeEntryMutation(scope, [], true),
    ).toContainEqual(userProjectsKeys.all(scope));
    expect(
      userMutationInvalidationKeys.afterTimeEntryMutation(scope, ["project-a"]),
    ).not.toContainEqual(userProjectsKeys.all(scope));
  });

  it("keeps the broad fallback when an unknown source accompanies known project ids", () => {
    expect(
      userMutationInvalidationKeys.afterTimeEntryMutation(scope, ["project-a"], true),
    ).toContainEqual(userProjectsKeys.all(scope));
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
      readTimeEntryListQueryKey(timerKeys.currentRaw(scope)),
    ).toBeNull();
  });
});

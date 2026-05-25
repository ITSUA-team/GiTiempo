// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import type { TaskResponse, TimeEntryResponse } from "@gitiempo/shared";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, shallowRef } from "vue";

import {
  userMutationInvalidationKeys,
  type UserServerStateScope,
} from "@/lib/query-keys";
import { createTestQueryClient, createTestQueryPlugin } from "@/test/query-client";

import { useTopBarTimerMutations } from "./useTopBarTimerMutations";

function createTask(projectId = "project-1"): TaskResponse {
  return {
    createdAt: "2026-04-20T12:00:00.000Z",
    id: "task-created",
    isActive: true,
    projectId,
    status: "open",
    title: "Improve reports filters",
    updatedAt: "2026-04-20T12:00:00.000Z",
    workspaceId: "workspace-1",
  };
}

function createEntry(overrides: Partial<TimeEntryResponse> = {}): TimeEntryResponse {
  const { githubIssue = null, ...entryOverrides } = overrides;

  return {
    createdAt: "2026-04-21T09:00:00.000Z",
    description: null,
    durationSeconds: null,
    endedAt: null,
    id: "entry-1",
    isBillable: true,
    project: { id: "project-1", name: "Project Orion" },
    projectId: "project-1",
    source: "web",
    startedAt: "2026-04-21T09:00:00.000Z",
    task: { id: "task-1", title: "Improve reports filters" },
    taskId: "task-1",
    updatedAt: "2026-04-21T09:00:00.000Z",
    user: {
      avatarUrl: null,
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: "user-1",
    },
    userId: "user-1",
    workspaceId: "workspace-1",
    githubIssue,
    ...entryOverrides,
  };
}

function mountMutations() {
  const accessToken = shallowRef<string | null>("access-token");
  const scope = shallowRef<UserServerStateScope>({ userId: "user-1", workspaceId: null });
  const client = {
    createTask: vi.fn(async (_accessToken: string, projectId: string) => createTask(projectId)),
    startTimer: vi.fn(async () => createEntry({ id: "running-entry" })),
    stopTimer: vi.fn(async () => createEntry({ durationSeconds: 3600, endedAt: "2026-04-21T10:00:00.000Z" })),
  };
  const queryClient = createTestQueryClient();
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  let api!: ReturnType<typeof useTopBarTimerMutations>;

  const Harness = defineComponent({
    setup() {
      api = useTopBarTimerMutations({ accessToken, client, scope });

      return () => h("div");
    },
  });

  mount(Harness, {
    global: {
      plugins: [createTestQueryPlugin(queryClient)],
    },
  });

  return { accessToken, api, client, invalidateQueries, scope };
}

describe("useTopBarTimerMutations", () => {
  it("creates tasks and invalidates affected project and timer task keys", async () => {
    const { api, client, invalidateQueries, scope } = mountMutations();

    await api.createTask({
      input: { title: "Improve reports filters" },
      projectId: "project-1",
    });

    expect(client.createTask).toHaveBeenCalledWith("access-token", "project-1", {
      title: "Improve reports filters",
    });
    expect(invalidateQueries.mock.calls.map(([options]) => options)).toEqual(
      userMutationInvalidationKeys
        .afterTaskMutation(scope.value, "project-1")
        .map((queryKey) => ({ queryKey })),
    );
  });

  it("starts and stops timers with timer surface invalidation", async () => {
    const { api, client, invalidateQueries, scope } = mountMutations();

    await api.startTimer("task-1");

    expect(client.startTimer).toHaveBeenCalledWith("access-token", "task-1");
    expect(invalidateQueries.mock.calls.map(([options]) => options)).toEqual(
      userMutationInvalidationKeys
        .afterTimerMutation(scope.value)
        .map((queryKey) => ({ queryKey })),
    );

    invalidateQueries.mockClear();
    await api.stopTimer();

    expect(client.stopTimer).toHaveBeenCalledWith("access-token");
    expect(invalidateQueries.mock.calls.map(([options]) => options)).toEqual(
      userMutationInvalidationKeys
        .afterTimerMutation(scope.value)
        .map((queryKey) => ({ queryKey })),
    );
  });

  it("blocks mutations before an access token exists", async () => {
    const { accessToken, api, client } = mountMutations();

    accessToken.value = null;

    await expect(api.startTimer("task-1")).rejects.toThrow(
      "Your session has expired. Please sign in again.",
    );
    expect(client.startTimer).not.toHaveBeenCalled();
  });
});

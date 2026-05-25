// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import type { TaskResponse } from "@gitiempo/shared";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, shallowRef } from "vue";

import {
  userMutationInvalidationKeys,
  type UserServerStateScope,
} from "@/lib/query-keys";
import { createTestQueryClient, createTestQueryPlugin } from "@/test/query-client";

import { useProjectTaskMutations } from "./useProjectTaskMutations";

function createTask(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    createdAt: "2026-04-20T12:00:00.000Z",
    id: "task-1",
    isActive: true,
    projectId: "project-1",
    status: "open",
    title: "Improve reports filters",
    updatedAt: "2026-04-21T10:00:00.000Z",
    workspaceId: "workspace-1",
    ...overrides,
  };
}

function mountMutations() {
  const accessToken = shallowRef<string | null>("access-token");
  const scope = shallowRef<UserServerStateScope>({ userId: "user-1", workspaceId: null });
  const client = {
    createTask: vi.fn(async (_accessToken: string, projectId: string) => createTask({ id: "task-created", projectId })),
    deleteTask: vi.fn(async () => undefined),
    updateTask: vi.fn(async (_accessToken: string, taskId: string) => createTask({ id: taskId, title: "Updated task" })),
  };
  const queryClient = createTestQueryClient();
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  let api!: ReturnType<typeof useProjectTaskMutations>;

  const Harness = defineComponent({
    setup() {
      api = useProjectTaskMutations({ accessToken, client, scope });

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

describe("useProjectTaskMutations", () => {
  it("creates tasks through the existing client and invalidates project surfaces", async () => {
    const { api, client, invalidateQueries, scope } = mountMutations();

    await api.createTask({
      input: { title: "Write release checklist" },
      projectId: "project-1",
    });

    expect(client.createTask).toHaveBeenCalledWith("access-token", "project-1", {
      title: "Write release checklist",
    });
    expect(invalidateQueries.mock.calls.map(([options]) => options)).toEqual(
      userMutationInvalidationKeys
        .afterTaskMutation(scope.value, "project-1")
        .map((queryKey) => ({ queryKey })),
    );
  });

  it("updates and deletes tasks with targeted invalidation", async () => {
    const { api, client, invalidateQueries, scope } = mountMutations();

    await api.updateTask({
      input: { status: "closed", title: "Updated task" },
      projectId: "project-1",
      taskId: "task-1",
    });

    expect(client.updateTask).toHaveBeenCalledWith("access-token", "task-1", {
      status: "closed",
      title: "Updated task",
    });
    expect(invalidateQueries.mock.calls.map(([options]) => options)).toEqual(
      userMutationInvalidationKeys
        .afterTaskMutation(scope.value, "project-1")
        .map((queryKey) => ({ queryKey })),
    );

    invalidateQueries.mockClear();
    await api.deleteTask({ projectId: "project-1", taskId: "task-1" });

    expect(client.deleteTask).toHaveBeenCalledWith("access-token", "task-1");
    expect(invalidateQueries.mock.calls.map(([options]) => options)).toEqual(
      userMutationInvalidationKeys
        .afterTaskMutation(scope.value, "project-1")
        .map((queryKey) => ({ queryKey })),
    );
  });

  it("blocks mutations before an access token exists", async () => {
    const { accessToken, api, client } = mountMutations();

    accessToken.value = null;

    await expect(api.deleteTask({ projectId: "project-1", taskId: "task-1" })).rejects.toThrow(
      "Your session has expired. Please sign in again.",
    );
    expect(client.deleteTask).not.toHaveBeenCalled();
  });
});

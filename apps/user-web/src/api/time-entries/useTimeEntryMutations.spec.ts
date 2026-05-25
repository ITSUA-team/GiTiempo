// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import type { TimeEntryResponse } from "@gitiempo/shared";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, shallowRef } from "vue";

import {
  userMutationInvalidationKeys,
  type UserServerStateScope,
} from "@/lib/query-keys";
import { createTestQueryClient, createTestQueryPlugin } from "@/test/query-client";

import { useTimeEntryMutations } from "./useTimeEntryMutations";

const taskId = "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2001";

function createEntry(overrides: Partial<TimeEntryResponse> = {}): TimeEntryResponse {
  const { githubIssue = null, ...entryOverrides } = overrides;

  return {
    createdAt: "2026-04-21T10:30:00.000Z",
    description: null,
    durationSeconds: 5400,
    endedAt: "2026-04-21T10:30:00.000Z",
    id: "entry-1",
    isBillable: false,
    project: { id: "project-1", name: "Project Orion" },
    projectId: "project-1",
    source: "manual",
    startedAt: "2026-04-21T09:00:00.000Z",
    task: { id: taskId, title: "Improve reports filters" },
    taskId,
    updatedAt: "2026-04-21T10:30:00.000Z",
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
    createManualEntry: vi.fn(async () => createEntry({ id: "entry-created" })),
    deleteEntry: vi.fn(async () => undefined),
    updateEntry: vi.fn(async () => createEntry({ id: "entry-updated" })),
  };
  const queryClient = createTestQueryClient();
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  let api!: ReturnType<typeof useTimeEntryMutations>;

  const Harness = defineComponent({
    setup() {
      api = useTimeEntryMutations({ accessToken, client, scope });

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

describe("useTimeEntryMutations", () => {
  it("creates manual entries and invalidates affected user surfaces", async () => {
    const { api, client, invalidateQueries, scope } = mountMutations();

    await api.createEntry({
      description: "Manual cleanup",
      endedAt: "2026-04-21T10:45:00.000Z",
      isBillable: true,
      startedAt: "2026-04-21T09:15:00.000Z",
      taskId,
    });

    expect(client.createManualEntry).toHaveBeenCalledWith("access-token", {
      description: "Manual cleanup",
      endedAt: "2026-04-21T10:45:00.000Z",
      isBillable: true,
      startedAt: "2026-04-21T09:15:00.000Z",
      taskId,
    });
    expect(invalidateQueries.mock.calls.map(([options]) => options)).toEqual(
      userMutationInvalidationKeys
        .afterTimeEntryMutation(scope.value)
        .map((queryKey) => ({ queryKey })),
    );
  });

  it("updates and deletes entries through the existing client boundary", async () => {
    const { api, client, invalidateQueries } = mountMutations();

    await api.updateEntry({
      entryId: "entry-1",
      input: {
        description: null,
        endedAt: "2026-04-21T10:45:00.000Z",
        isBillable: false,
        startedAt: "2026-04-21T09:15:00.000Z",
        taskId,
      },
    });

    expect(client.updateEntry).toHaveBeenCalledWith(
      "access-token",
      "entry-1",
      expect.objectContaining({ taskId }),
    );

    invalidateQueries.mockClear();
    await api.deleteEntry("entry-1");

    expect(client.deleteEntry).toHaveBeenCalledWith("access-token", "entry-1");
    expect(invalidateQueries).toHaveBeenCalled();
  });

  it("blocks mutations before an access token exists", async () => {
    const { accessToken, api, client } = mountMutations();

    accessToken.value = null;

    await expect(api.deleteEntry("entry-1")).rejects.toThrow("Your session has expired. Please sign in again.");
    expect(client.deleteEntry).not.toHaveBeenCalled();
  });
});

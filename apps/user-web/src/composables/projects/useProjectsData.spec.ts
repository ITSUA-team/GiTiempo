import { flushPromises, mount } from "@vue/test-utils";
import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { ApiError } from "@gitiempo/web-shared/http";
import { focusManager } from "@tanstack/vue-query";
import { computed, defineComponent, h } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useProjectsData } from "./useProjectsData";
import { userProjectsKeys, type UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";
import { createTestQueryClient, createTestQueryPlugin } from "@/test/query-client";

const scope: UserServerStateScope = {
  userId: "user-1",
  workspaceId: "workspace-1",
};

function createProject(accessScope: ProjectResponse["accessScope"]): ProjectResponse {
  return {
    accessScope,
    capabilities: { canManageTasks: accessScope === "project" },
    color: null,
    createdAt: "2026-04-20T12:00:00.000Z",
    defaultBillableForTasks: true,
    description: null,
    id: "project-1",
    isActive: true,
    members: [],
    name: "External project",
    referenceProvenance: "user-supplied",
    timeRoundingStepMinutes: null,
    source: "github",
    trackingMode: "external-reference",
    totalSeconds: 0,
    updatedAt: "2026-04-20T12:00:00.000Z",
    visibility: "private",
    workspaceId: "workspace-1",
  };
}

function createTask(
  title: string,
  accessScope: TaskResponse["accessScope"],
): TaskResponse {
  return {
    accessScope,
    capabilities: { canManageTasks: accessScope === "project" },
    createdAt: "2026-04-20T12:00:00.000Z",
    defaultBillableForTimeEntries: true,
    githubIssue: null,
    id: title,
    isActive: true,
    projectId: "project-1",
    status: "open",
    title,
    updatedAt: "2026-04-20T12:00:00.000Z",
    workspaceId: "workspace-1",
  };
}

function mountProjectsData(input: {
  client: TimeEntriesClient;
  onLoadTasksError?: (message: string) => void;
  queryClient: ReturnType<typeof createTestQueryClient>;
}) {
  let data!: ReturnType<typeof useProjectsData>;
  const Host = defineComponent({
    setup() {
      data = useProjectsData({
        client: input.client,
        enabled: computed(() => true),
        onLoadProjectsError: () => undefined,
        onLoadTasksError: input.onLoadTasksError ?? (() => undefined),
        scope: computed(() => scope),
      });

      return () =>
        h("div", [
          ...data.visibleProjects.value.map((project) => project.name),
          ...Object.values(data.tasksByProjectId.value)
            .flat()
            .map((task) => task.title),
        ]);
    },
  });
  const wrapper = mount(Host, {
    global: {
      plugins: [createTestQueryPlugin(input.queryClient)],
    },
  });

  return { data, wrapper };
}

describe("useProjectsData", () => {
  afterEach(() => {
    focusManager.setFocused(undefined);
  });

  it("does not render a populated project-wide task cache after access narrows to own-time", async () => {
    const queryClient = createTestQueryClient();
    const client = {
      listProjectTasks: vi
        .fn<TimeEntriesClient["listProjectTasks"]>()
        .mockResolvedValueOnce([createTask("Project-wide task", "project")])
        .mockResolvedValueOnce([createTask("Own-time task", "own-time")]),
      listVisibleProjects: vi
        .fn<TimeEntriesClient["listVisibleProjects"]>()
        .mockResolvedValueOnce([createProject("project")]),
    } as unknown as TimeEntriesClient;
    const { wrapper } = mountProjectsData({ client, queryClient });

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Project-wide task");
    });

    queryClient.setQueryData(
      userProjectsKeys.visibleProjects(scope),
      [createProject("own-time")],
    );
    await flushPromises();

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Own-time task");
    });
    expect(wrapper.text()).not.toContain("Project-wide task");
    expect(client.listProjectTasks).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it("removes a project after focus refresh without reporting a stale child-query 404", async () => {
    const queryClient = createTestQueryClient();
    const onLoadTasksError = vi.fn();
    let resolveRefreshedProjects!: (projects: ProjectResponse[]) => void;
    const refreshedProjects = new Promise<ProjectResponse[]>((resolve) => {
      resolveRefreshedProjects = resolve;
    });
    const client = {
      listProjectTasks: vi
        .fn<TimeEntriesClient["listProjectTasks"]>()
        .mockResolvedValueOnce([createTask("Own-time task", "own-time")])
        .mockRejectedValueOnce(
          new ApiError("Project not found", { status: 404 }),
        ),
      listVisibleProjects: vi
        .fn<TimeEntriesClient["listVisibleProjects"]>()
        .mockResolvedValueOnce([createProject("own-time")])
        .mockImplementationOnce(() => refreshedProjects),
    } as unknown as TimeEntriesClient;
    const { data, wrapper } = mountProjectsData({
      client,
      onLoadTasksError,
      queryClient,
    });

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("External project");
      expect(client.listProjectTasks).toHaveBeenCalledTimes(1);
    });

    focusManager.setFocused(false);
    focusManager.setFocused(true);

    await vi.waitFor(() => {
      expect(client.listVisibleProjects).toHaveBeenCalledTimes(2);
    });
    expect(client.listProjectTasks).toHaveBeenCalledTimes(1);

    resolveRefreshedProjects([]);
    await flushPromises();

    expect(data.visibleProjects.value).toEqual([]);
    expect(data.taskLoadErrors.value).toEqual({});
    expect(onLoadTasksError).not.toHaveBeenCalled();
    expect(client.listProjectTasks).toHaveBeenCalledTimes(1);
    expect(
      queryClient.getQueryData(
        userProjectsKeys.projectTasks(scope, "project-1", "own-time"),
      ),
    ).toBeUndefined();

    wrapper.unmount();
  });

  it("does not refetch fresh task collections after a visibility focus refresh", async () => {
    const queryClient = createTestQueryClient();
    const client = {
      listProjectTasks: vi
        .fn<TimeEntriesClient["listProjectTasks"]>()
        .mockResolvedValueOnce([createTask("Previous task", "own-time")]),
      listVisibleProjects: vi
        .fn<TimeEntriesClient["listVisibleProjects"]>()
        .mockResolvedValue([createProject("own-time")]),
    } as unknown as TimeEntriesClient;
    const { wrapper } = mountProjectsData({ client, queryClient });

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Previous task");
    });

    focusManager.setFocused(false);
    focusManager.setFocused(true);

    await vi.waitFor(() => {
      expect(client.listVisibleProjects).toHaveBeenCalledTimes(2);
    });
    expect(wrapper.text()).toContain("Previous task");
    expect(client.listProjectTasks).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it("shares overlapping manual refreshes instead of restarting project or task reads", async () => {
    const queryClient = createTestQueryClient();
    const client = {
      listProjectTasks: vi
        .fn<TimeEntriesClient["listProjectTasks"]>()
        .mockResolvedValue([createTask("Current task", "own-time")]),
      listVisibleProjects: vi
        .fn<TimeEntriesClient["listVisibleProjects"]>()
        .mockResolvedValue([createProject("own-time")]),
    } as unknown as TimeEntriesClient;
    const { data, wrapper } = mountProjectsData({ client, queryClient });

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Current task");
    });

    await Promise.all([data.loadPage(), data.loadPage()]);

    expect(client.listVisibleProjects).toHaveBeenCalledTimes(2);
    expect(client.listProjectTasks).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it("loads a newly visible project task input once during a manual refresh wave", async () => {
    const queryClient = createTestQueryClient();
    const projectA = createProject("own-time");
    const projectB = { ...createProject("own-time"), id: "project-2", name: "New project" };
    const listProjectTasks = vi.fn(async (projectId: string) => [
      { ...createTask(projectId === "project-1" ? "Task A" : "Task B", "own-time"), projectId },
    ]);
    const client = {
      listProjectTasks,
      listVisibleProjects: vi
        .fn<TimeEntriesClient["listVisibleProjects"]>()
        .mockResolvedValueOnce([projectA])
        .mockResolvedValueOnce([projectA, projectB]),
    } as unknown as TimeEntriesClient;
    const { data, wrapper } = mountProjectsData({ client, queryClient });

    await vi.waitFor(() => expect(wrapper.text()).toContain("Task A"));
    await data.loadPage();

    expect(listProjectTasks.mock.calls.filter(([id]) => id === "project-2")).toHaveLength(1);
    expect(listProjectTasks.mock.calls.filter(([id]) => id === "project-1")).toHaveLength(2);
    wrapper.unmount();
  });

  it("keeps loaded task content when a later visibility refresh fails", async () => {
    const queryClient = createTestQueryClient();
    const client = {
      listProjectTasks: vi
        .fn<TimeEntriesClient["listProjectTasks"]>()
        .mockResolvedValue([createTask("Current task", "own-time")]),
      listVisibleProjects: vi
        .fn<TimeEntriesClient["listVisibleProjects"]>()
        .mockResolvedValueOnce([createProject("own-time")])
        .mockRejectedValueOnce(new Error("network down")),
    } as unknown as TimeEntriesClient;
    const { data, wrapper } = mountProjectsData({ client, queryClient });

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Current task");
    });

    focusManager.setFocused(false);
    focusManager.setFocused(true);

    await vi.waitFor(() => {
      expect(data.requestErrorMessage.value).toBe("network down");
    });
    expect(wrapper.text()).toContain("Current task");
    wrapper.unmount();
  });
});

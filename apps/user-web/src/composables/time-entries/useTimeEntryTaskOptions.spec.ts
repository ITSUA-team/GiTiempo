import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import type {
  GitHubRepositoryIssueListResponse,
  ProjectResponse,
  TaskResponse,
} from "@gitiempo/shared";
import { computed, defineComponent, shallowRef } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { userProjectsKeys, type UserServerStateScope } from "@/lib/query-keys";
import { TIMER_OPTIONS_STALE_TIME } from "@/lib/timer-options-cache";
import { createTestQueryClient, createTestQueryPlugin } from "@/test/query-client";

import { useTimeEntryTaskOptions } from "./useTimeEntryTaskOptions";

const projectId = "project-1";

function createProject(overrides: Partial<ProjectResponse> = {}): ProjectResponse {
  return {
    accessScope: "project",
    capabilities: { canManageTasks: true },
    color: null,
    createdAt: "2026-04-20T12:00:00.000Z",
    defaultBillableForTasks: true,
    description: null,
    id: projectId,
    isActive: true,
    members: [],
    name: "Project Orion",
    referenceProvenance: null,
    timeRoundingStepMinutes: null,
    source: "manual",
    totalSeconds: 0,
    trackingMode: "managed",
    updatedAt: "2026-04-20T12:00:00.000Z",
    visibility: "private",
    workspaceId: "workspace-1",
    ...overrides,
  };
}

function createTask(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    accessScope: "project",
    capabilities: { canManageTasks: true },
    createdAt: "2026-04-20T12:00:00.000Z",
    defaultBillableForTimeEntries: true,
    githubIssue: null,
    id: "task-1",
    isActive: true,
    projectId,
    status: "open",
    title: "Full-access task",
    updatedAt: "2026-04-20T12:00:00.000Z",
    workspaceId: "workspace-1",
    ...overrides,
  };
}

function createGitHubIssueResponse(
  items: GitHubRepositoryIssueListResponse["items"],
): GitHubRepositoryIssueListResponse {
  return {
    items,
    pagination: { hasNextPage: false, limit: 30, nextPageToken: null },
  };
}

function mountTaskOptions(input: {
  project?: ProjectResponse;
  scope?: UserServerStateScope;
  tasks?: TaskResponse[][];
} = {}) {
  const project = shallowRef(input.project ?? createProject());
  const scope = shallowRef<UserServerStateScope>(input.scope ?? {
    userId: "user-1",
    workspaceId: "workspace-1",
  });
  const client = {
    listProjectGitHubIssues: vi.fn(async () => createGitHubIssueResponse([])),
    listProjectTasks: vi.fn(async () => input.tasks?.shift() ?? []),
  };
  const queryClient = createTestQueryClient();
  let taskOptions!: ReturnType<typeof useTimeEntryTaskOptions>;

  const wrapper = mount(
    defineComponent({
      setup() {
        taskOptions = useTimeEntryTaskOptions({
          client: client as never,
          getProjectById(id) {
            return project.value.id === id ? project.value : null;
          },
          scope: computed(() => scope.value),
        });

        return () => null;
      },
    }),
    {
      global: {
        plugins: [createTestQueryPlugin(queryClient)],
      },
    },
  );

  return { client, project, queryClient, scope, taskOptions, wrapper };
}

describe("useTimeEntryTaskOptions", () => {
  const wrappers: VueWrapper[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T11:00:00.000Z"));
  });

  afterEach(() => {
    while (wrappers.length > 0) {
      wrappers.pop()?.unmount();
    }

    vi.useRealTimers();
  });

  it("does not reuse full-access task options after the project scope narrows", async () => {
    const fullAccessTask = createTask();
    const ownTask = createTask({
      accessScope: "own-time",
      capabilities: { canManageTasks: false },
      id: "task-2",
      title: "Own task",
    });
    const mounted = mountTaskOptions({ tasks: [[fullAccessTask], [ownTask]] });
    wrappers.push(mounted.wrapper);

    await expect(mounted.taskOptions.loadProjectTaskOptions(projectId)).resolves.toEqual({
      errorMessage: null,
      taskOptions: [expect.objectContaining({ id: fullAccessTask.id })],
    });

    mounted.project.value = createProject({
      accessScope: "own-time",
      capabilities: { canManageTasks: false },
    });

    await expect(mounted.taskOptions.loadProjectTaskOptions(projectId)).resolves.toEqual({
      errorMessage: null,
      taskOptions: [expect.objectContaining({ id: ownTask.id })],
    });
    expect(mounted.client.listProjectTasks).toHaveBeenCalledTimes(2);
  });

  it("restarts an in-flight task request when the project scope changes", async () => {
    const fullAccessTask = createTask();
    const ownTask = createTask({
      accessScope: "own-time",
      capabilities: { canManageTasks: false },
      id: "task-2",
      title: "Own task",
    });
    let resolveFullAccessTasks!: (tasks: TaskResponse[]) => void;
    const mounted = mountTaskOptions();
    wrappers.push(mounted.wrapper);
    mounted.client.listProjectTasks
      .mockImplementationOnce(() => new Promise<TaskResponse[]>((resolve) => {
        resolveFullAccessTasks = resolve;
      }))
      .mockResolvedValueOnce([ownTask]);

    const taskLoad = mounted.taskOptions.loadProjectTaskOptions(projectId);
    mounted.project.value = createProject({
      accessScope: "own-time",
      capabilities: { canManageTasks: false },
    });
    resolveFullAccessTasks([fullAccessTask]);

    await expect(taskLoad).resolves.toEqual({
      errorMessage: null,
      taskOptions: [expect.objectContaining({ id: ownTask.id })],
    });
    expect(mounted.client.listProjectTasks).toHaveBeenCalledTimes(2);
  });

  it("discards GitHub suggestions when access narrows while their page is loading", async () => {
    const fullAccessTask = createTask();
    const ownTask = createTask({
      accessScope: "own-time",
      capabilities: { canManageTasks: false },
      id: "task-2",
      title: "Own task",
    });
    let resolveGitHubIssues!: (response: GitHubRepositoryIssueListResponse) => void;
    const mounted = mountTaskOptions({
      project: createProject({ source: "github" }),
      tasks: [[fullAccessTask], [ownTask]],
    });
    wrappers.push(mounted.wrapper);
    mounted.client.listProjectGitHubIssues.mockImplementationOnce(
      () => new Promise<GitHubRepositoryIssueListResponse>((resolve) => {
        resolveGitHubIssues = resolve;
      }),
    );

    const taskLoad = mounted.taskOptions.loadProjectTaskOptions(projectId);
    await flushPromises();
    expect(mounted.client.listProjectGitHubIssues).toHaveBeenCalledTimes(1);

    mounted.project.value = createProject({
      accessScope: "own-time",
      capabilities: { canManageTasks: false },
      source: "github",
    });
    resolveGitHubIssues(createGitHubIssueResponse([{
      id: "issue-1",
      nodeId: "node-1",
      number: 1,
      repository: {
        fullName: "octo-org/repo-name",
        name: "repo-name",
        owner: "octo-org",
      },
      state: "open",
      title: "GitHub-only issue",
      updatedAt: "2026-04-21T10:00:00.000Z",
      url: "https://github.com/octo-org/repo-name/issues/1",
    }]));

    await expect(taskLoad).resolves.toEqual({
      errorMessage: null,
      taskOptions: [expect.objectContaining({ id: ownTask.id })],
    });
    expect(mounted.client.listProjectTasks).toHaveBeenCalledTimes(2);
    expect(mounted.client.listProjectGitHubIssues).toHaveBeenCalledTimes(1);
    expect(mounted.queryClient.getQueryData(
      userProjectsKeys.projectTasks(mounted.scope.value, projectId, "own-time"),
    )).toEqual([ownTask]);
  });

  it("bypasses local task options after the backing query is invalidated", async () => {
    const firstTask = createTask();
    const refreshedTask = createTask({ id: "task-2", title: "Refreshed task" });
    const mounted = mountTaskOptions({ tasks: [[firstTask], [refreshedTask]] });
    wrappers.push(mounted.wrapper);
    const queryKey = userProjectsKeys.projectTasks(
      mounted.scope.value,
      projectId,
      mounted.project.value.accessScope,
    );

    await mounted.taskOptions.loadProjectTaskOptions(projectId);
    await mounted.queryClient.invalidateQueries({ exact: true, queryKey });
    const result = await mounted.taskOptions.loadProjectTaskOptions(projectId);

    expect(mounted.client.listProjectTasks).toHaveBeenCalledTimes(2);
    expect(result.taskOptions).toEqual([
      expect.objectContaining({ id: refreshedTask.id }),
    ]);
  });

  it("does not merge a newly created task with stale cached siblings", async () => {
    const firstTask = createTask();
    const staleSibling = createTask({ id: "task-2", title: "Stale sibling" });
    const createdTask = createTask({ id: "task-3", title: "Created task" });
    const mounted = mountTaskOptions({ tasks: [[firstTask, staleSibling]] });
    wrappers.push(mounted.wrapper);
    const queryKey = userProjectsKeys.projectTasks(
      mounted.scope.value,
      projectId,
      mounted.project.value.accessScope,
    );

    await mounted.taskOptions.loadProjectTaskOptions(projectId);
    await mounted.queryClient.invalidateQueries({ exact: true, queryKey });
    const options = mounted.taskOptions.upsertProjectTask(createdTask);

    expect(options).toEqual([
      expect.objectContaining({ id: createdTask.id }),
    ]);
  });

  it("uses the current query response when it replaces a cached response", async () => {
    const firstTask = createTask();
    const refreshedTask = createTask({ id: "task-2", title: "Refreshed task" });
    const mounted = mountTaskOptions({ tasks: [[firstTask]] });
    wrappers.push(mounted.wrapper);
    const queryKey = userProjectsKeys.projectTasks(
      mounted.scope.value,
      projectId,
      mounted.project.value.accessScope,
    );

    await mounted.taskOptions.loadProjectTaskOptions(projectId);
    vi.advanceTimersByTime(1);
    mounted.queryClient.setQueryData(queryKey, [refreshedTask]);
    const result = await mounted.taskOptions.loadProjectTaskOptions(projectId);

    expect(mounted.client.listProjectTasks).toHaveBeenCalledTimes(1);
    expect(result.taskOptions).toEqual([
      expect.objectContaining({ id: refreshedTask.id }),
    ]);
  });

  it("reloads task options after their query TTL expires", async () => {
    const firstTask = createTask();
    const refreshedTask = createTask({ id: "task-2", title: "Refreshed task" });
    const mounted = mountTaskOptions({ tasks: [[firstTask], [refreshedTask]] });
    wrappers.push(mounted.wrapper);

    await mounted.taskOptions.loadProjectTaskOptions(projectId);
    vi.advanceTimersByTime(TIMER_OPTIONS_STALE_TIME + 1);
    const result = await mounted.taskOptions.loadProjectTaskOptions(projectId);

    expect(mounted.client.listProjectTasks).toHaveBeenCalledTimes(2);
    expect(result.taskOptions).toEqual([
      expect.objectContaining({ id: refreshedTask.id }),
    ]);
  });
});

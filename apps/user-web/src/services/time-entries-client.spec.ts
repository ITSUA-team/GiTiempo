import { describe, expect, it, vi } from "vitest";
import { createAuthenticatedApiClient } from "@gitiempo/web-shared/http";

import { createTimeEntriesClient } from "./time-entries-client";

type FetchMock = typeof fetch;
type RecordedRequestInit = {
  body?: string;
  headers?: Record<string, string>;
  method?: string;
};

function getRecordedFetchRequest(fetchFn: ReturnType<typeof vi.fn<FetchMock>>) {
  const call = fetchFn.mock.calls[0];

  if (!call) {
    throw new Error("Expected recorded fetch request");
  }

  const path = call[0];
  const requestInit = call[1];

  if (typeof path !== "string") {
    throw new Error("Expected string request path");
  }

  if (!requestInit || typeof requestInit !== "object") {
    throw new Error("Expected fetch request options");
  }

  return {
    path,
    requestInit: requestInit as RecordedRequestInit,
  };
}

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function noContentResponse(init: { status?: number } = {}): Response {
  return new Response(null, {
    status: 204,
    ...init,
  });
}

function createTestApiClient(fetchFn: typeof fetch, apiBaseUrl?: string) {
  return createAuthenticatedApiClient({
    apiBaseUrl,
    fetchFn,
    getToken: () => "access-token",
    onRefreshFailed: vi.fn(),
    refreshAccessToken: async () => "access-token",
  });
}

describe("createTimeEntriesClient", () => {
  it("loads visible projects with a bearer token and parses the response", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse([
        {
          color: null,
          createdAt: "2026-04-20T12:00:00.000Z",
          description: null,
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
          isActive: true,
          members: [],
          name: "Project Orion",
          source: "manual",
          totalSeconds: 43200,
          updatedAt: "2026-04-20T12:00:00.000Z",
          visibility: "public",
          workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
        },
      ]),
    );
    const client = createTimeEntriesClient({
      apiClient: createTestApiClient(fetchFn, "https://api.example.test/"),
    });

    const projects = await client.listVisibleProjects();

    expect(projects[0]?.name).toBe("Project Orion");
    expect(fetchFn).toHaveBeenCalledWith("https://api.example.test/projects", {
      body: undefined,
      headers: {
        Authorization: "Bearer access-token",
      },
      method: "GET",
    });
  });

  it("loads recent own entries with query parameters", async () => {
    const fetchFn = vi.fn<FetchMock>(async () =>
      jsonResponse({
        items: [],
        meta: { limit: 10, page: 1, total: 0, totalPages: 0 },
      }),
    );
    const client = createTimeEntriesClient({ apiClient: createTestApiClient(fetchFn) });

    await client.listOwnEntries({ limit: 10, search: "reports" });

    expect(fetchFn).toHaveBeenCalledWith(
      "/time-entries?page=1&limit=10&search=reports",
      {
        body: undefined,
        headers: {
          Authorization: "Bearer access-token",
        },
        method: "GET",
      },
    );
  });

  it("builds the full list query combinations used by the time entries page", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        items: [],
        meta: { limit: 20, page: 2, total: 0, totalPages: 0 },
      }),
    );
    const client = createTimeEntriesClient({ apiClient: createTestApiClient(fetchFn) });

    await client.listOwnEntries({
      dateFrom: "2026-04-01T00:00:00.000Z",
      dateTo: "2026-04-22T00:00:00.000Z",
      limit: 20,
      page: 2,
      projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
      search: "deploy",
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "/time-entries?page=2&limit=20&dateFrom=2026-04-01T00%3A00%3A00.000Z&dateTo=2026-04-22T00%3A00%3A00.000Z&projectId=018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f&taskId=018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001&search=deploy",
      {
        body: undefined,
        headers: {
          Authorization: "Bearer access-token",
        },
        method: "GET",
      },
    );
  });

  it("loads project tasks from the selected project path", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse([
        {
          createdAt: "2026-04-20T12:00:00.000Z",
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
          isActive: true,
          projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
          status: "open",
          title: "Improve reports filters",
          updatedAt: "2026-04-20T12:00:00.000Z",
          workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
        },
      ]),
    );
    const client = createTimeEntriesClient({ apiClient: createTestApiClient(fetchFn) });

    await expect(
      client.listProjectTasks(
        "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
      ),
    ).resolves.toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledWith(
      "/projects/018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f/tasks",
      {
        body: undefined,
        headers: {
          Authorization: "Bearer access-token",
        },
        method: "GET",
      },
    );
  });

  it("creates a new task in the selected project", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        createdAt: "2026-04-20T12:00:00.000Z",
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
        isActive: true,
        projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
        status: "open",
        title: "Write release checklist",
        updatedAt: "2026-04-20T12:00:00.000Z",
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
      }),
    );
    const client = createTimeEntriesClient({ apiClient: createTestApiClient(fetchFn) });

    await client.createTask(
      "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
      { title: "Write release checklist" },
    );

    expect(fetchFn).toHaveBeenCalledWith(
      "/projects/018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f/tasks",
      {
        body: JSON.stringify({ title: "Write release checklist" }),
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );
  });

  it("updates an existing task and parses the response", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        createdAt: "2026-04-20T12:00:00.000Z",
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
        isActive: true,
        projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
        status: "closed",
        title: "Review PM scope rules",
        updatedAt: "2026-04-21T10:00:00.000Z",
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
      }),
    );
    const client = createTimeEntriesClient({ apiClient: createTestApiClient(fetchFn) });

    const task = await client.updateTask(
      "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
      {
        status: "closed",
        title: "Review PM scope rules",
      },
    );

    expect(task.status).toBe("closed");
    expect(fetchFn).toHaveBeenCalledWith(
      "/tasks/018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
      {
        body: JSON.stringify({
          title: "Review PM scope rules",
          status: "closed",
        }),
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        },
        method: "PATCH",
      },
    );
  });

  it("handles task deletion with the no-content contract", async () => {
    const fetchFn = vi.fn(async () => noContentResponse());
    const client = createTimeEntriesClient({ apiClient: createTestApiClient(fetchFn) });

    await expect(
      client.deleteTask(
        "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
      ),
    ).resolves.toBeUndefined();
    expect(fetchFn).toHaveBeenCalledWith(
      "/tasks/018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
      {
        headers: {
          Authorization: "Bearer access-token",
        },
        method: "DELETE",
      },
    );
  });

  it("propagates task deletion errors using repository messages", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse(
        { message: "Task has related time entries" },
        { status: 409 },
      ),
    );
    const client = createTimeEntriesClient({ apiClient: createTestApiClient(fetchFn) });

    await expect(
      client.deleteTask(
        "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
      ),
    ).rejects.toThrow("Task has related time entries");
  });

  it("posts timer start requests with the selected task payload", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        createdAt: "2026-04-21T09:00:00.000Z",
        description: null,
        durationSeconds: null,
        endedAt: null,
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
        isBillable: true,
        project: {
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
          name: "Project Orion",
        },
        projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
        source: "web",
        startedAt: "2026-04-21T09:00:00.000Z",
        githubIssue: null,
        task: {
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
          title: "Improve reports filters",
        },
        taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
        updatedAt: "2026-04-21T09:00:00.000Z",
        user: {
          avatarUrl: null,
          displayName: "Alexey Tsukanov",
          email: "alexey@example.com",
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
        },
        userId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
      }),
    );
    const client = createTimeEntriesClient({ apiClient: createTestApiClient(fetchFn) });

    await client.startTimer({
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
    });

    expect(fetchFn).toHaveBeenCalledWith("/time-entries/timer/start", {
      body: JSON.stringify({
        taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
      }),
      headers: {
        Authorization: "Bearer access-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  });

  it("posts timer start requests with a nullable description", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        createdAt: "2026-04-21T09:00:00.000Z",
        description: "Investigate release blocker",
        durationSeconds: null,
        endedAt: null,
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
        isBillable: true,
        project: {
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
          name: "Project Orion",
        },
        projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
        source: "web",
        startedAt: "2026-04-21T09:00:00.000Z",
        githubIssue: null,
        task: {
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
          title: "Improve reports filters",
        },
        taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
        updatedAt: "2026-04-21T09:00:00.000Z",
        user: {
          avatarUrl: null,
          displayName: "Alexey Tsukanov",
          email: "alexey@example.com",
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
        },
        userId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
      }),
    );
    const client = createTimeEntriesClient({ apiClient: createTestApiClient(fetchFn) });

    await client.startTimer({
      description: "Investigate release blocker",
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);

    const { path, requestInit } = getRecordedFetchRequest(fetchFn);

    expect(path).toBe("/time-entries/timer/start");
    expect(requestInit).toMatchObject({
      headers: {
        Authorization: "Bearer access-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    expect(JSON.parse(String(requestInit.body))).toEqual({
      description: "Investigate release blocker",
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
    });
  });

  it("posts manual time entries and parses the created response", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        createdAt: "2026-04-21T10:30:00.000Z",
        description: null,
        durationSeconds: 5400,
        endedAt: "2026-04-21T10:30:00.000Z",
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9004",
        isBillable: true,
        project: {
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
          name: "Project Orion",
        },
        projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
        source: "manual",
        startedAt: "2026-04-21T09:00:00.000Z",
        githubIssue: null,
        task: {
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
          title: "Improve reports filters",
        },
        taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
        updatedAt: "2026-04-21T10:30:00.000Z",
        user: {
          avatarUrl: null,
          displayName: "Alexey Tsukanov",
          email: "alexey@example.com",
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
        },
        userId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
      }),
    );
    const client = createTimeEntriesClient({ apiClient: createTestApiClient(fetchFn) });

    const entry = await client.createManualEntry({
      endedAt: "2026-04-21T10:30:00.000Z",
      startedAt: "2026-04-21T09:00:00.000Z",
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
    });

    expect(entry.source).toBe("manual");
    expect(fetchFn).toHaveBeenCalledWith("/time-entries", {
      body: JSON.stringify({
        taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
        startedAt: "2026-04-21T09:00:00.000Z",
        endedAt: "2026-04-21T10:30:00.000Z",
      }),
      headers: {
        Authorization: "Bearer access-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  });

  it("posts timer stop requests without a JSON body", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        createdAt: "2026-04-21T09:00:00.000Z",
        description: null,
        durationSeconds: 3600,
        endedAt: "2026-04-21T10:00:00.000Z",
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
        isBillable: true,
        project: {
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
          name: "Project Orion",
        },
        projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
        source: "web",
        startedAt: "2026-04-21T09:00:00.000Z",
        githubIssue: null,
        task: {
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
          title: "Improve reports filters",
        },
        taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
        updatedAt: "2026-04-21T10:00:00.000Z",
        user: {
          avatarUrl: null,
          displayName: "Alexey Tsukanov",
          email: "alexey@example.com",
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
        },
        userId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
      }),
    );
    const client = createTimeEntriesClient({ apiClient: createTestApiClient(fetchFn) });

    await client.stopTimer();

    expect(fetchFn).toHaveBeenCalledWith("/time-entries/timer/stop", {
      body: undefined,
      headers: {
        Authorization: "Bearer access-token",
      },
      method: "POST",
    });
  });

  it("deletes entries using the no-content endpoint contract", async () => {
    const fetchFn = vi.fn(async () => noContentResponse());
    const client = createTimeEntriesClient({ apiClient: createTestApiClient(fetchFn) });

    await client.deleteEntry("entry-1");

    expect(fetchFn).toHaveBeenCalledWith("/time-entries/entry-1", {
      headers: {
        Authorization: "Bearer access-token",
      },
      method: "DELETE",
    });
  });

  it("patches completed entries using the shared update schema", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        createdAt: "2026-04-21T10:30:00.000Z",
        description: "Updated",
        durationSeconds: 5400,
        endedAt: "2026-04-21T10:30:00.000Z",
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9004",
        isBillable: false,
        project: {
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
          name: "Project Orion",
        },
        projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
        source: "manual",
        startedAt: "2026-04-21T09:00:00.000Z",
        githubIssue: null,
        task: {
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
          title: "Improve reports filters",
        },
        taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
        updatedAt: "2026-04-21T10:30:00.000Z",
        user: {
          avatarUrl: null,
          displayName: "Alexey Tsukanov",
          email: "alexey@example.com",
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
        },
        userId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
      }),
    );
    const client = createTimeEntriesClient({ apiClient: createTestApiClient(fetchFn) });

    await client.updateEntry(
      "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9004",
      { description: "Updated", isBillable: false },
    );

    expect(fetchFn).toHaveBeenCalledWith(
      "/time-entries/018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9004",
      {
        body: JSON.stringify({ description: "Updated", isBillable: false }),
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        },
        method: "PATCH",
      },
    );
  });

  it("patches completed entries with a selected task id", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        createdAt: "2026-04-21T10:30:00.000Z",
        description: "Updated",
        durationSeconds: 5400,
        endedAt: "2026-04-21T10:30:00.000Z",
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9004",
        isBillable: false,
        project: {
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
          name: "Project Orion",
        },
        projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
        source: "manual",
        startedAt: "2026-04-21T09:00:00.000Z",
        githubIssue: null,
        task: {
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9009",
          title: "Reassigned task",
        },
        taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9009",
        updatedAt: "2026-04-21T10:30:00.000Z",
        user: {
          avatarUrl: null,
          displayName: "Alexey Tsukanov",
          email: "alexey@example.com",
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
        },
        userId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
      }),
    );
    const client = createTimeEntriesClient({ apiClient: createTestApiClient(fetchFn) });

    await client.updateEntry(
      "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9004",
      {
        taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9009",
      },
    );

    expect(fetchFn).toHaveBeenCalledWith(
      "/time-entries/018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9004",
      {
        body: JSON.stringify({ taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9009" }),
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        },
        method: "PATCH",
      },
    );
  });

  it("passes abort signals through list requests", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        items: [],
        meta: { limit: 10, page: 1, total: 0, totalPages: 0 },
      }),
    );
    const client = createTimeEntriesClient({ apiClient: createTestApiClient(fetchFn) });
    const controller = new AbortController();

    await client.listOwnEntries({ limit: 10 }, { signal: controller.signal });

    expect(fetchFn).toHaveBeenCalledWith(
      "/time-entries?page=1&limit=10",
      {
        body: undefined,
        headers: {
          Authorization: "Bearer access-token",
        },
        method: "GET",
        signal: controller.signal,
      },
    );
  });

  it("throws API error messages using repository message ordering", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse(
        { message: "A timer is already running", error: "Conflict" },
        { status: 409 },
      ),
    );
    const client = createTimeEntriesClient({ apiClient: createTestApiClient(fetchFn) });

    await expect(
      client.startTimer({
        taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
      }),
    ).rejects.toThrow("A timer is already running");
  });

  it("propagates fetch boundary failures", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("network down");
    });
    const client = createTimeEntriesClient({ apiClient: createTestApiClient(fetchFn) });

    await expect(client.getCurrentTimer()).rejects.toThrow(
      "network down",
    );
  });
});

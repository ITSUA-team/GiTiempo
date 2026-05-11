import { describe, expect, it, vi } from "vitest";

import { createTimeEntriesClient } from "./time-entries-client";

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

describe("createTimeEntriesClient", () => {
  it("loads visible projects with a bearer token and parses the response", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse([
        {
          color: null,
          createdAt: "2026-04-20T12:00:00.000Z",
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
          isActive: true,
          members: [],
          name: "Project Orion",
          source: "manual",
          totalHours: 12,
          updatedAt: "2026-04-20T12:00:00.000Z",
          visibility: "public",
          workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
        },
      ]),
    );
    const client = createTimeEntriesClient({
      apiBaseUrl: "https://api.example.test/",
      fetchFn,
    });

    const projects = await client.listVisibleProjects("access-token");

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
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        items: [],
        meta: { limit: 10, page: 1, total: 0, totalPages: 0 },
      }),
    );
    const client = createTimeEntriesClient({ fetchFn });

    await client.listOwnEntries("access-token", { limit: 10, search: "reports" });

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
    const client = createTimeEntriesClient({ fetchFn });

    await expect(
      client.listProjectTasks(
        "access-token",
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
    const client = createTimeEntriesClient({ fetchFn });

    await client.createTask(
      "access-token",
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
    const client = createTimeEntriesClient({ fetchFn });

    await client.startTimer(
      "access-token",
      "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
    );

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
    const client = createTimeEntriesClient({ fetchFn });

    const entry = await client.createManualEntry("access-token", {
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
    const client = createTimeEntriesClient({ fetchFn });

    await client.stopTimer("access-token");

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
    const client = createTimeEntriesClient({ fetchFn });

    await client.deleteEntry("access-token", "entry-1");

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
    const client = createTimeEntriesClient({ fetchFn });

    await client.updateEntry(
      "access-token",
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

  it("throws API error messages using repository message ordering", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse(
        { message: "A timer is already running", error: "Conflict" },
        { status: 409 },
      ),
    );
    const client = createTimeEntriesClient({ fetchFn });

    await expect(
      client.startTimer(
        "access-token",
        "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
      ),
    ).rejects.toThrow("A timer is already running");
  });

  it("propagates fetch boundary failures", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("network down");
    });
    const client = createTimeEntriesClient({ fetchFn });

    await expect(client.getCurrentTimer("access-token")).rejects.toThrow(
      "network down",
    );
  });
});

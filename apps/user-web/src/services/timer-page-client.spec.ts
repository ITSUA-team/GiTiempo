import { describe, expect, it, vi } from "vitest";

import { createTimerPageClient } from "./timer-page-client";

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("createTimerPageClient", () => {
  it("loads visible projects with a bearer token and parses the response", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse([
        {
          color: null,
          createdAt: "2026-04-20T12:00:00.000Z",
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
          isActive: true,
          name: "Project Orion",
          source: "manual",
          totalHours: 12,
          updatedAt: "2026-04-20T12:00:00.000Z",
          visibility: "public",
          workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
        },
      ]),
    );
    const client = createTimerPageClient({
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
    const client = createTimerPageClient({ fetchFn });

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
    const client = createTimerPageClient({ fetchFn });

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
    const client = createTimerPageClient({ fetchFn });

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
    const client = createTimerPageClient({ fetchFn });

    await client.stopTimer("access-token");

    expect(fetchFn).toHaveBeenCalledWith("/time-entries/timer/stop", {
      body: undefined,
      headers: {
        Authorization: "Bearer access-token",
      },
      method: "POST",
    });
  });

  it("throws API error messages using repository message ordering", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse(
        { message: "A timer is already running", error: "Conflict" },
        { status: 409 },
      ),
    );
    const client = createTimerPageClient({ fetchFn });

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
    const client = createTimerPageClient({ fetchFn });

    await expect(client.getCurrentTimer("access-token")).rejects.toThrow(
      "network down",
    );
  });
});

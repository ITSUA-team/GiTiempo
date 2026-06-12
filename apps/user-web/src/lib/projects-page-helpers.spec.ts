import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  buildProjectSearchSuggestions,
  buildProjectTaskGroups,
  filterProjectTaskGroups,
  formatUpdatedLabel,
  normalizeSearchValue,
  sortProjectTasks,
} from "@/lib/projects-page-helpers";

function createProject(id: string, name: string): ProjectResponse {
  return {
    color: null,
    createdAt: "2026-04-20T12:00:00.000Z",
    description: null,
    id,
    isActive: true,
    members: [],
    name,
    source: "manual",
    totalSeconds: 43200,
    updatedAt: "2026-04-20T12:00:00.000Z",
    visibility: "public",
    workspaceId: "workspace-1",
  };
}

function createTask(id: string, projectId: string, title: string, updatedAt: string): TaskResponse {
  return {
    assignees: [],
    createdAt: "2026-04-20T12:00:00.000Z",
    description: null,
    id,
    isActive: true,
    priority: "medium",
    projectId,
    status: "open",
    title,
    updatedAt,
    workspaceId: "workspace-1",
  };
}

describe("projects-page-helpers", () => {
  beforeAll(() => {
    vi.stubEnv("TZ", "Europe/Kiev");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("normalizes search and sorts tasks by updated time then title", () => {
    expect(normalizeSearchValue("  Billing  ")).toBe("billing");
    expect(
      sortProjectTasks([
        createTask("task-2", "project-1", "Beta", "2026-04-21T10:00:00.000Z"),
        createTask("task-1", "project-1", "Alpha", "2026-04-21T10:00:00.000Z"),
        createTask("task-3", "project-1", "Gamma", "2026-04-22T10:00:00.000Z"),
      ]).map((task) => task.id),
    ).toEqual(["task-3", "task-1", "task-2"]);
  });

  it("builds and filters project task groups", () => {
    const groups = buildProjectTaskGroups(
      [createProject("project-1", "Project Orion"), createProject("project-2", "Billing API")],
      {
        "project-1": [createTask("task-1", "project-1", "Review PM scope rules", "2026-04-21T10:00:00.000Z")],
        "project-2": [createTask("task-2", "project-2", "Finalize invoice webhook", "2026-04-21T10:00:00.000Z")],
      },
    );

    expect(filterProjectTaskGroups(groups, "orion")).toEqual([
      expect.objectContaining({ project: expect.objectContaining({ id: "project-1" }) }),
    ]);
    expect(filterProjectTaskGroups(groups, "invoice")).toEqual([
      {
        project: expect.objectContaining({ id: "project-2" }),
        tasks: [expect.objectContaining({ id: "task-2" })],
      },
    ]);
    expect(filterProjectTaskGroups(groups, "missing")).toEqual([]);
  });

  it("builds capped project and task search suggestions", () => {
    const groups = buildProjectTaskGroups(
      [createProject("project-1", "Project Orion")],
      {
        "project-1": [createTask("task-1", "project-1", "Review PM scope rules", "2026-04-21T10:00:00.000Z")],
      },
    );

    expect(buildProjectSearchSuggestions(groups, "review")).toEqual([
      {
        id: "task:task-1",
        kind: "task",
        label: "Review PM scope rules",
        projectId: "project-1",
      },
    ]);
    expect(buildProjectSearchSuggestions(groups, "")).toEqual([
      {
        id: "project:project-1",
        kind: "project",
        label: "Project Orion",
        projectId: "project-1",
      },
      {
        id: "task:task-1",
        kind: "task",
        label: "Review PM scope rules",
        projectId: "project-1",
      },
    ]);
  });

  it("formats updated labels relative to browser-local calendar days", () => {
    const now = new Date(2026, 3, 21, 12, 0, 0, 0);
    const todayTimestamp = new Date(2026, 3, 21, 10, 0, 0, 0).toISOString();
    const yesterdayTimestamp = new Date(2026, 3, 20, 10, 0, 0, 0).toISOString();
    const olderTimestamp = new Date(2026, 3, 19, 10, 0, 0, 0).toISOString();

    expect(formatUpdatedLabel(todayTimestamp, now.getTime())).toBe("Today, 10:00");
    expect(formatUpdatedLabel(yesterdayTimestamp, now.getTime())).toBe("Yesterday, 10:00");
    expect(formatUpdatedLabel(olderTimestamp, now.getTime())).toBe("Sun, 10:00");
  });

  it("keeps late-utc timestamps on the same rendered local day", () => {
    const now = new Date(2026, 3, 21, 12, 0, 0, 0);
    const localEveningTimestamp = new Date(2026, 3, 21, 0, 30, 0, 0).toISOString();

    expect(formatUpdatedLabel(localEveningTimestamp, now.getTime())).toBe("Today, 00:30");
  });
});

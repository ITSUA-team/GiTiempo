import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { describe, expect, it } from "vitest";

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
    totalHours: 12,
    updatedAt: "2026-04-20T12:00:00.000Z",
    visibility: "public",
    workspaceId: "workspace-1",
  };
}

function createTask(id: string, projectId: string, title: string, updatedAt: string): TaskResponse {
  return {
    createdAt: "2026-04-20T12:00:00.000Z",
    id,
    isActive: true,
    projectId,
    status: "open",
    title,
    updatedAt,
    workspaceId: "workspace-1",
  };
}

describe("projects-page-helpers", () => {
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

  it("formats updated labels relative to an explicit current time", () => {
    const nowMs = Date.parse("2026-04-21T12:00:00.000Z");

    expect(formatUpdatedLabel("2026-04-21T10:00:00.000Z", nowMs)).toBe("Today, 10:00");
    expect(formatUpdatedLabel("2026-04-20T10:00:00.000Z", nowMs)).toBe("Yesterday, 10:00");
    expect(formatUpdatedLabel("2026-04-19T10:00:00.000Z", nowMs)).toBe("Sun, 10:00");
  });
});

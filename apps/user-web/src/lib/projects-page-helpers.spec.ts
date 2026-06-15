import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  buildProjectSearchSuggestions,
  buildProjectTaskGroups,
  filterProjectTaskGroups,
  formatUpdatedLabel,
  PROJECT_STATUS_FILTER_OPTIONS,
  PROJECT_UPDATED_FILTER_OPTIONS,
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

function createTask(
  id: string,
  projectId: string,
  title: string,
  updatedAt: string,
  overrides: Partial<TaskResponse> = {},
): TaskResponse {
  return {
    assignees: [],
    createdAt: "2026-04-20T12:00:00.000Z",
    description: null,
    githubIssue: null,
    id,
    isActive: true,
    priority: "medium",
    projectId,
    status: "open",
    title,
    updatedAt,
    workspaceId: "workspace-1",
    ...overrides,
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

  it("filters task groups by status", () => {
    const groups = buildProjectTaskGroups(
      [createProject("project-1", "Project Orion"), createProject("project-2", "Billing API")],
      {
        "project-1": [
          createTask("task-1", "project-1", "Open task", "2026-04-21T10:00:00.000Z"),
          createTask("task-2", "project-1", "Closed task", "2026-04-21T10:00:00.000Z", {
            status: "closed",
          }),
        ],
        "project-2": [
          createTask("task-3", "project-2", "Another closed task", "2026-04-21T10:00:00.000Z", {
            status: "closed",
          }),
        ],
      },
    );

    expect(
      filterProjectTaskGroups(groups, "", { status: "open" }).map((group) => ({
        projectId: group.project.id,
        taskIds: group.tasks.map((task) => task.id),
      })),
    ).toEqual([{ projectId: "project-1", taskIds: ["task-1"] }]);
    expect(
      filterProjectTaskGroups(groups, "", { status: "closed" }).map((group) => ({
        projectId: group.project.id,
        taskIds: group.tasks.map((task) => task.id),
      })),
    ).toEqual([
      { projectId: "project-1", taskIds: ["task-2"] },
      { projectId: "project-2", taskIds: ["task-3"] },
    ]);
  });

  it("filters task groups by browser-local updated buckets", () => {
    const now = new Date(2026, 3, 21, 12, 0, 0, 0).getTime();
    const todayTimestamp = new Date(2026, 3, 21, 10, 0, 0, 0).toISOString();
    const lastSevenDaysTimestamp = new Date(2026, 3, 15, 10, 0, 0, 0).toISOString();
    const olderTimestamp = new Date(2026, 3, 14, 10, 0, 0, 0).toISOString();
    const groups = buildProjectTaskGroups(
      [createProject("project-1", "Project Orion")],
      {
        "project-1": [
          createTask("task-today", "project-1", "Updated today", todayTimestamp),
          createTask("task-week", "project-1", "Updated this week", lastSevenDaysTimestamp),
          createTask("task-older", "project-1", "Updated earlier", olderTimestamp),
        ],
      },
    );

    expect(
      filterProjectTaskGroups(groups, "", { nowMs: now, updated: "today" })[0]?.tasks.map(
        (task) => task.id,
      ),
    ).toEqual(["task-today"]);
    expect(
      filterProjectTaskGroups(groups, "", { nowMs: now, updated: "last-7-days" })[0]?.tasks.map(
        (task) => task.id,
      ),
    ).toEqual(["task-today", "task-week"]);
    expect(
      filterProjectTaskGroups(groups, "", { nowMs: now, updated: "older" })[0]?.tasks.map(
        (task) => task.id,
      ),
    ).toEqual(["task-older"]);
  });

  it("applies status and updated filters after project-name matches", () => {
    const now = new Date(2026, 3, 21, 12, 0, 0, 0).getTime();
    const groups = buildProjectTaskGroups(
      [createProject("project-1", "Project Orion")],
      {
        "project-1": [
          createTask("task-1", "project-1", "Open recent task", "2026-04-21T10:00:00.000Z"),
          createTask("task-2", "project-1", "Closed recent task", "2026-04-21T10:00:00.000Z", {
            status: "closed",
          }),
          createTask("task-3", "project-1", "Open older task", "2026-04-10T10:00:00.000Z"),
        ],
      },
    );

    expect(
      filterProjectTaskGroups(groups, "orion", {
        nowMs: now,
        status: "open",
        updated: "last-7-days",
      }),
    ).toEqual([
      {
        project: expect.objectContaining({ id: "project-1" }),
        tasks: [expect.objectContaining({ id: "task-1" })],
      },
    ]);
    expect(
      filterProjectTaskGroups(groups, "orion", {
        nowMs: now,
        status: "closed",
        updated: "older",
      }),
    ).toEqual([]);
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
        meta: "Task • Project Orion",
        projectId: "project-1",
      },
    ]);
    expect(buildProjectSearchSuggestions(groups, "")).toEqual([
      {
        id: "project:project-1",
        kind: "project",
        label: "Project Orion",
        meta: "Project",
        projectId: "project-1",
      },
      {
        id: "task:task-1",
        kind: "task",
        label: "Review PM scope rules",
        meta: "Task • Project Orion",
        projectId: "project-1",
      },
    ]);
  });

  it("exposes required lightweight filter options", () => {
    expect(PROJECT_STATUS_FILTER_OPTIONS.map((option) => option.label)).toEqual([
      "All statuses",
      "Open",
      "Closed",
    ]);
    expect(PROJECT_UPDATED_FILTER_OPTIONS.map((option) => option.label)).toEqual([
      "Any time",
      "Today",
      "Last 7 days",
      "Older",
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

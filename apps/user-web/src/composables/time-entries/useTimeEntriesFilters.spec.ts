import type { TaskResponse } from "@gitiempo/shared";
import { describe, expect, it } from "vitest";

import {
  buildTaskLookupSuggestions,
  isTaskLookupOption,
  toTaskLookupOption,
  useTimeEntriesFilters,
} from "./useTimeEntriesFilters";

function createTask(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    createdAt: "2026-04-20T12:00:00.000Z",
    id: "task-1",
    isActive: true,
    projectId: "project-1",
    status: "open",
    title: "Improve reports filters",
    updatedAt: "2026-04-20T12:00:00.000Z",
    workspaceId: "workspace-1",
    ...overrides,
  };
}

describe("useTimeEntriesFilters", () => {
  it("derives server list query params from date, pagination, project, and task filters", () => {
    const filters = useTimeEntriesFilters();

    filters.setDateRange([
      new Date("2026-04-01T13:30:00.000Z"),
      new Date("2026-04-21T13:30:00.000Z"),
    ]);
    filters.setSelectedProjectId("project-1");
    filters.setSelectedTaskFilter({
      id: "task-1",
      isActive: true,
      projectId: "project-1",
      title: "Improve reports filters",
    });
    filters.setPage(3);

    expect(filters.listQuery.value).toEqual({
      dateFrom: "2026-04-01T00:00:00.000Z",
      dateTo: "2026-04-22T00:00:00.000Z",
      limit: 20,
      page: 3,
      projectId: "project-1",
      search: "Improve reports filters",
      taskId: "task-1",
    });

    filters.resetPagination();

    expect(filters.listQuery.value.page).toBe(1);
  });

  it("resets task filter state when the selected project changes", () => {
    const filters = useTimeEntriesFilters();

    filters.setSelectedProjectId("project-1");
    filters.setFilterTaskOptions([
      { id: "task-1", isActive: true, projectId: "project-1", title: "Improve reports filters" },
    ]);
    filters.updateFilterTaskSuggestions("reports", filters.filterTaskOptions.value);
    filters.setSelectedTaskFilter("reports");
    filters.setFilterTasksError("task load failed");
    filters.setSelectedProjectId(null);

    expect(filters.selectedProjectId.value).toBeNull();
    expect(filters.selectedTaskFilter.value).toBeNull();
    expect(filters.filterTaskOptions.value).toEqual([]);
    expect(filters.filterTaskSuggestions.value).toEqual([]);
    expect(filters.filterTasksErrorMessage.value).toBeNull();
  });

  it("maps and searches task lookup options without HTTP dependencies", () => {
    const task = toTaskLookupOption(createTask());
    const inactiveTask = toTaskLookupOption(
      createTask({ id: "task-2", isActive: false, title: "Archived cleanup" }),
    );

    expect(isTaskLookupOption(task)).toBe(true);
    expect(isTaskLookupOption("reports")).toBe(false);
    expect(task).toEqual({
      id: "task-1",
      isActive: true,
      projectId: "project-1",
      title: "Improve reports filters",
    });
    expect(buildTaskLookupSuggestions("report", [task, inactiveTask])).toEqual([task]);
    expect(buildTaskLookupSuggestions("", [task, inactiveTask])).toEqual([task, inactiveTask]);
  });
});

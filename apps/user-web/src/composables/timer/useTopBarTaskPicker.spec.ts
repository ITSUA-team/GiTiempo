import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { describe, expect, it } from "vitest";

import { useTopBarTaskPicker } from "./useTopBarTaskPicker";

function createProject(id: string, name: string, isActive = true): ProjectResponse {
  return {
    color: null,
    createdAt: "2026-04-20T12:00:00.000Z",
    description: null,
    id,
    isActive,
    members: [],
    name,
    source: "manual",
    totalHours: 12,
    updatedAt: "2026-04-20T12:00:00.000Z",
    visibility: "public",
    workspaceId: "workspace-1",
  };
}

function createTask(id: string, projectId: string, title: string, isActive = true): TaskResponse {
  return {
    createdAt: "2026-04-20T12:00:00.000Z",
    id,
    isActive,
    projectId,
    status: "open",
    title,
    updatedAt: "2026-04-20T12:00:00.000Z",
    workspaceId: "workspace-1",
  };
}

describe("useTopBarTaskPicker", () => {
  it("filters active project and task options and derives selected context", () => {
    const picker = useTopBarTaskPicker();

    picker.setProjects([
      createProject("project-1", "Project Orion"),
      createProject("project-2", "Archived", false),
    ]);
    picker.setTasks([
      createTask("task-1", "project-1", "Improve reports filters"),
      createTask("task-2", "project-1", "Archived cleanup", false),
    ]);
    picker.openDialog({ projectId: "project-1", taskId: "task-1" });

    expect(picker.activeProjects.value).toEqual([expect.objectContaining({ id: "project-1" })]);
    expect(picker.activeTasks.value).toEqual([expect.objectContaining({ id: "task-1" })]);
    expect(picker.toSelectedTaskContext()).toEqual({
      projectId: "project-1",
      projectName: "Project Orion",
      taskId: "task-1",
      taskTitle: "Improve reports filters",
    });
  });

  it("validates create-task title state without HTTP dependencies", () => {
    const picker = useTopBarTaskPicker();

    picker.setCreateTaskTitle("   ");

    expect(picker.validateCreateTaskInput()).toBeNull();
    expect(picker.createTaskErrorMessage.value).toBeTruthy();

    picker.setCreateTaskTitle("  Review PM scope rules  ");

    expect(picker.validateCreateTaskInput()).toEqual({ title: "Review PM scope rules" });
    expect(picker.createTaskErrorMessage.value).toBeNull();
  });

  it("tracks cached project tasks and resets transient create state on close", () => {
    const picker = useTopBarTaskPicker();
    const tasks = [createTask("task-1", "project-1", "Improve reports filters")];

    picker.openDialog(null);
    picker.setCachedTasks("project-1", tasks);
    picker.setCreateTaskTitle("Draft task");
    picker.setCreateTaskError("task failed");
    picker.closeDialog();

    expect(picker.getCachedTasks("project-1")).toBe(tasks);
    expect(picker.isDialogOpen.value).toBe(false);
    expect(picker.createTaskTitle.value).toBe("");
    expect(picker.createTaskErrorMessage.value).toBeNull();
  });
});

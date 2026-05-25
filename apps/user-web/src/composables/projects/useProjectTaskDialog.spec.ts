import type { TaskResponse } from "@gitiempo/shared";
import { describe, expect, it } from "vitest";

import { useProjectTaskDialog } from "./useProjectTaskDialog";

function createTask(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    createdAt: "2026-04-20T12:00:00.000Z",
    id: "task-1",
    isActive: true,
    projectId: "project-1",
    status: "open",
    title: "Improve reports filters",
    updatedAt: "2026-04-21T10:00:00.000Z",
    workspaceId: "workspace-1",
    ...overrides,
  };
}

describe("useProjectTaskDialog", () => {
  it("opens create mode and validates project plus title input", () => {
    const dialog = useProjectTaskDialog();

    dialog.openCreateDialog();
    dialog.setDialogTaskTitle("   ");

    expect(dialog.validateDialog()).toBeNull();
    expect(dialog.dialogErrors.value.projectId).toBe("Select a project.");
    expect(dialog.dialogErrors.value.title).toBeNull();

    dialog.setDialogProjectId("project-1");
    expect(dialog.validateDialog()).toBeNull();
    expect(dialog.dialogErrors.value.title).toBeTruthy();

    dialog.setDialogTaskTitle("  Write release checklist  ");

    expect(dialog.validateDialog()).toEqual({
      input: { title: "Write release checklist" },
      mode: "create",
      projectId: "project-1",
    });
  });

  it("opens edit mode from a task and validates update input", () => {
    const dialog = useProjectTaskDialog();

    dialog.openEditDialog(createTask());
    dialog.setDialogTaskTitle("Review PM scope rules");
    dialog.setDialogTaskStatus("closed");

    expect(dialog.dialogTitle.value).toBe("Edit task");
    expect(dialog.dialogSaveLabel.value).toBe("Save changes");
    expect(dialog.validateDialog()).toEqual({
      input: { status: "closed", title: "Review PM scope rules" },
      mode: "edit",
      projectId: "project-1",
    });
  });

  it("resets transient request errors on field changes and close", () => {
    const dialog = useProjectTaskDialog();

    dialog.openCreateDialog("project-1");
    dialog.setDialogRequestError("conflict");
    dialog.setDialogTaskTitle("New title");

    expect(dialog.dialogRequestErrorMessage.value).toBeNull();

    dialog.setDialogRequestError("conflict");
    dialog.closeDialog();

    expect(dialog.isDialogOpen.value).toBe(false);
    expect(dialog.dialogTaskTitle.value).toBe("");
    expect(dialog.dialogRequestErrorMessage.value).toBeNull();
  });
});

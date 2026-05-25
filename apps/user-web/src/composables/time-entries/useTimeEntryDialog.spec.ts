import type { TimeEntryResponse } from "@gitiempo/shared";
import { describe, expect, it } from "vitest";

import { useTimeEntryDialog } from "./useTimeEntryDialog";

const taskId = "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2001";

function createEntry(overrides: Partial<TimeEntryResponse> = {}): TimeEntryResponse {
  const { githubIssue = null, ...entryOverrides } = overrides;

  return {
    createdAt: "2026-04-21T10:30:00.000Z",
    description: "Existing note",
    durationSeconds: 5400,
    endedAt: "2026-04-21T10:30:00.000Z",
    id: "entry-1",
    isBillable: true,
    project: { id: "project-1", name: "Project Orion" },
    projectId: "project-1",
    source: "manual",
    startedAt: "2026-04-21T09:00:00.000Z",
    task: { id: taskId, title: "Improve reports filters" },
    taskId,
    updatedAt: "2026-04-21T10:30:00.000Z",
    user: {
      avatarUrl: null,
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: "user-1",
    },
    userId: "user-1",
    workspaceId: "workspace-1",
    githubIssue,
    ...entryOverrides,
  };
}

describe("useTimeEntryDialog", () => {
  it("initializes create mode with an optional day preset and validates required fields", () => {
    const dialog = useTimeEntryDialog();

    dialog.openCreateDialogState("2026-04-21");

    expect(dialog.dialogMode.value).toBe("create");
    expect(dialog.dialogTitle.value).toBe("New time entry");
    expect(dialog.dialogStartedAt.value?.toISOString()).toBe("2026-04-21T09:00:00.000Z");
    expect(dialog.dialogEndedAt.value?.toISOString()).toBe("2026-04-21T10:00:00.000Z");
    expect(dialog.validateDialog()).toBeNull();
    expect(dialog.dialogErrors.value.projectId).toBe("Select a project.");
    expect(dialog.dialogErrors.value.taskId).toBe("Select a visible task.");
  });

  it("validates a complete create/edit payload and trims descriptions", () => {
    const dialog = useTimeEntryDialog();

    dialog.openCreateDialogState();
    dialog.setDialogProjectId("project-1");
    dialog.setDialogTaskValue({
      id: taskId,
      isActive: true,
      projectId: "project-1",
      title: "Improve reports filters",
    });
    dialog.setDialogStartedAt(new Date("2026-04-21T09:15:00.000Z"));
    dialog.setDialogEndedAt(new Date("2026-04-21T10:45:00.000Z"));
    dialog.setDialogDescription("  Manual cleanup  ");
    dialog.setDialogIsBillable(true);

    expect(dialog.validateDialog()).toEqual({
      description: "Manual cleanup",
      endedAt: "2026-04-21T10:45:00.000Z",
      isBillable: true,
      startedAt: "2026-04-21T09:15:00.000Z",
      taskId,
    });
    expect(dialog.dialogErrors.value.description).toBeNull();
  });

  it("initializes edit mode and can use the entry task as a fallback option", () => {
    const dialog = useTimeEntryDialog();
    const entry = createEntry();

    dialog.openEditDialogState(entry);
    dialog.setDialogTaskFromEntryFallback(entry);

    expect(dialog.dialogMode.value).toBe("edit");
    expect(dialog.dialogTitle.value).toBe("Edit time entry");
    expect(dialog.editingEntry.value).toBe(entry);
    expect(dialog.dialogProjectId.value).toBe("project-1");
    expect(dialog.dialogDescription.value).toBe("Existing note");
    expect(dialog.dialogIsBillable.value).toBe(true);
    expect(dialog.dialogTaskValue.value).toEqual({
      id: taskId,
      isActive: true,
      projectId: "project-1",
      title: "Improve reports filters",
    });
  });

  it("resets dependent task state when the dialog project changes", () => {
    const dialog = useTimeEntryDialog();

    dialog.openCreateDialogState();
    dialog.setDialogTaskOptions([
      { id: "task-1", isActive: true, projectId: "project-1", title: "Improve reports filters" },
    ]);
    dialog.updateDialogTaskSuggestions("reports");
    dialog.setDialogTasksError("task load failed");
    dialog.setDialogTaskValue({
      id: taskId,
      isActive: true,
      projectId: "project-1",
      title: "Improve reports filters",
    });
    dialog.setDialogProjectId("project-2");

    expect(dialog.dialogProjectId.value).toBe("project-2");
    expect(dialog.dialogTaskValue.value).toBeNull();
    expect(dialog.dialogTaskOptions.value).toEqual([]);
    expect(dialog.dialogTaskSuggestions.value).toEqual([]);
    expect(dialog.dialogTasksErrorMessage.value).toBeNull();
  });
});

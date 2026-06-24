import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  createNewTaskLookupOption,
  TIME_ENTRY_NEW_TASK_ID,
} from "./time-entry-task-lookup";
import { useTimeEntryDialog } from "./useTimeEntryDialog";

const TEST_PROJECT_ID = "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1001";
const TEST_TASK_ID = "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2001";

describe("useTimeEntryDialog", () => {
  beforeAll(() => {
    vi.stubEnv("TZ", "Europe/Kiev");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("seeds day-level create dialogs from the rendered local day", () => {
    const dialog = useTimeEntryDialog();

    dialog.openCreateDialogState("2026-04-21");

    expect(dialog.dialogStartedAt.value).toEqual(new Date(2026, 3, 21, 9, 0, 0, 0));
    expect(dialog.dialogEndedAt.value).toEqual(new Date(2026, 3, 21, 10, 0, 0, 0));
  });

  it("ignores malformed day keys instead of creating utc-shifted presets", () => {
    const dialog = useTimeEntryDialog();

    dialog.openCreateDialogState("invalid-day");

    expect(dialog.dialogStartedAt.value).toBeNull();
    expect(dialog.dialogEndedAt.value).toBeNull();
  });

  it("seeds create-mode billable state from the selected task default", () => {
    const dialog = useTimeEntryDialog();

    dialog.openCreateDialogState();
    dialog.setTaskValue({
      defaultBillableForTimeEntries: false,
      id: "task-1",
      isActive: true,
      projectId: "project-1",
      title: "Improve reports filters",
    });

    expect(dialog.dialogIsBillable.value).toBe(false);

    dialog.setTaskValue({
      defaultBillableForTimeEntries: true,
      id: "task-2",
      isActive: true,
      projectId: "project-1",
      title: "Write release checklist",
    });

    expect(dialog.dialogIsBillable.value).toBe(true);
  });

  it("does not replace an edit-mode entry billable override when task changes", () => {
    const dialog = useTimeEntryDialog();

    dialog.openEditDialogState({
      createdAt: "2026-04-21T10:30:00.000Z",
      description: null,
      durationSeconds: 5400,
      endedAt: "2026-04-21T10:30:00.000Z",
      githubIssue: null,
      id: "entry-1",
      isBillable: false,
      project: { id: "project-1", name: "Project Orion" },
      projectId: "project-1",
      source: "manual",
      startedAt: "2026-04-21T09:00:00.000Z",
      task: { id: "task-1", title: "Improve reports filters" },
      taskId: "task-1",
      updatedAt: "2026-04-21T10:30:00.000Z",
      user: {
        avatarUrl: null,
        displayName: "Alexey Tsukanov",
        email: "alexey@example.com",
        id: "user-1",
      },
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    dialog.setTaskValue({
      defaultBillableForTimeEntries: true,
      id: "task-2",
      isActive: true,
      projectId: "project-1",
      title: "Write release checklist",
    });

    expect(dialog.dialogIsBillable.value).toBe(false);
  });

  it("appends New task after visible task suggestions", () => {
    const dialog = useTimeEntryDialog();

    dialog.openCreateDialogState();
    dialog.setProjectId(TEST_PROJECT_ID);
    dialog.setTaskOptions([
      {
        defaultBillableForTimeEntries: true,
        id: TEST_TASK_ID,
        isActive: true,
        projectId: TEST_PROJECT_ID,
        title: "Improve reports filters",
      },
    ]);
    dialog.updateTaskSuggestions("");

    expect(dialog.dialogTaskSuggestions.value.map((task) => task.title)).toEqual([
      "Improve reports filters",
      "New task",
    ]);
    expect(dialog.dialogTaskSuggestions.value.at(-1)?.id).toBe(
      TIME_ENTRY_NEW_TASK_ID,
    );
  });

  it("validates a required new task title before returning the draft entry", () => {
    const dialog = useTimeEntryDialog();

    dialog.openCreateDialogState();
    dialog.setProjectId(TEST_PROJECT_ID);
    dialog.setTaskValue(createNewTaskLookupOption(TEST_PROJECT_ID));
    dialog.setStartedAt(new Date("2026-04-21T09:00:00.000Z"));
    dialog.setEndedAt(new Date("2026-04-21T10:00:00.000Z"));

    expect(dialog.validateDialog()).toBeNull();
    expect(dialog.dialogErrors.value.newTaskTitle).toBeTruthy();

    dialog.setNewTaskTitle("Write release checklist");

    expect(dialog.validateDialog()).toEqual({
      draftInput: {
        description: null,
        endedAt: "2026-04-21T10:00:00.000Z",
        isBillable: false,
        startedAt: "2026-04-21T09:00:00.000Z",
      },
      kind: "new-task",
      taskTitle: "Write release checklist",
    });
  });

  it("returns a contract-safe input only after selecting an existing task", () => {
    const dialog = useTimeEntryDialog();

    dialog.openCreateDialogState();
    dialog.setProjectId(TEST_PROJECT_ID);
    dialog.setTaskValue({
      defaultBillableForTimeEntries: true,
      id: TEST_TASK_ID,
      isActive: true,
      projectId: TEST_PROJECT_ID,
      title: "Improve reports filters",
    });
    dialog.setStartedAt(new Date("2026-04-21T09:00:00.000Z"));
    dialog.setEndedAt(new Date("2026-04-21T10:00:00.000Z"));

    expect(dialog.validateDialog()).toEqual({
      input: {
        description: null,
        endedAt: "2026-04-21T10:00:00.000Z",
        isBillable: true,
        startedAt: "2026-04-21T09:00:00.000Z",
        taskId: TEST_TASK_ID,
      },
      kind: "existing-task",
    });
  });
});

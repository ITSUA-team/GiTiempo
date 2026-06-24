import { describe, expect, it } from "vitest";

import {
  createInlineNewTaskOption,
  INLINE_NEW_TASK_ID,
  isInlineNewTaskId,
  isInlineNewTaskOption,
  validateInlineNewTaskInput,
} from "./inline-new-task";

describe("inline-new-task", () => {
  it("builds the shared New task sentinel option", () => {
    const option = createInlineNewTaskOption({
      projectId: "project-1",
    });

    expect(option).toEqual({
      id: INLINE_NEW_TASK_ID,
      isNewTask: true,
      projectId: "project-1",
      title: "New task",
    });
    expect(isInlineNewTaskOption(option)).toBe(true);
  });

  it("recognizes the shared New task id across call sites", () => {
    expect(isInlineNewTaskId(INLINE_NEW_TASK_ID)).toBe(true);
    expect(isInlineNewTaskId("task-1")).toBe(false);
  });

  it("reuses one task-create validator for inline creation flows", () => {
    const parsed = validateInlineNewTaskInput({
      defaultBillableForTimeEntries: false,
      title: "  Write release checklist  ",
    });

    expect(parsed.success).toBe(true);

    if (!parsed.success) {
      return;
    }

    expect(parsed.data).toEqual({
      defaultBillableForTimeEntries: false,
      title: "Write release checklist",
    });
  });
});

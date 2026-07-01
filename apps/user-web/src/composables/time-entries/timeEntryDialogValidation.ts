import {
  createManualTimeEntryDraftSchema,
  createManualTimeEntrySchema,
  createTaskSchema,
} from "@gitiempo/shared";
import type { ZodError } from "zod";

import {
  isGitHubIssueTaskLookupOption,
  isNewTaskLookupOption,
  isTaskLookupOption,
  type TaskLookupValue,
} from "./time-entry-task-lookup";

const GITHUB_ISSUE_VALIDATION_TASK_ID = "00000000-0000-0000-0000-000000000000";

export interface TimeEntryFormErrors {
  description: string | null;
  endedAt: string | null;
  newTaskTitle: string | null;
  projectId: string | null;
  startedAt: string | null;
  taskId: string | null;
}

export type ValidatedTimeEntryDialogInput = {
  description?: string | null;
  endedAt: string;
  isBillable: boolean;
  startedAt: string;
  taskId: string;
};

export type ValidatedTimeEntryDialogResult =
  | {
      input: ValidatedTimeEntryDialogInput;
      kind: "existing-task";
    }
  | {
      draftInput: Omit<ValidatedTimeEntryDialogInput, "taskId">;
      kind: "new-task";
      taskTitle: string;
    };

interface ValidateTimeEntryDialogInputOptions {
  description: string;
  endedAt: Date | null;
  isBillable: boolean;
  newTaskTitle: string;
  projectId: string | null;
  selectedTask: TaskLookupValue;
  startedAt: Date | null;
}

type TimeEntryFormErrorField = keyof TimeEntryFormErrors;

function getTimeEntryFormErrorField(
  path: PropertyKey | undefined,
): TimeEntryFormErrorField | null {
  if (path === "selectedTask" || path === "taskId") {
    return "taskId";
  }

  if (
    path === "description" ||
    path === "endedAt" ||
    path === "newTaskTitle" ||
    path === "projectId" ||
    path === "startedAt"
  ) {
    return path;
  }

  return null;
}

export function createDefaultTimeEntryFormErrors(): TimeEntryFormErrors {
  return {
    description: null,
    endedAt: null,
    newTaskTitle: null,
    projectId: null,
    startedAt: null,
    taskId: null,
  };
}

function createTimeEntryFormErrors(error: ZodError): TimeEntryFormErrors {
  const errors = createDefaultTimeEntryFormErrors();

  for (const issue of error.issues) {
    const field = getTimeEntryFormErrorField(issue.path[0]);

    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return errors;
}

export function validateTimeEntryDialogInput({
  description,
  endedAt,
  isBillable,
  newTaskTitle,
  projectId,
  selectedTask,
  startedAt,
}: ValidateTimeEntryDialogInputOptions): {
  errors: TimeEntryFormErrors;
  input: ValidatedTimeEntryDialogResult | null;
} {
  const nextErrors = createDefaultTimeEntryFormErrors();
  const selectedTaskOption = isTaskLookupOption(selectedTask) ? selectedTask : null;
  const isCreatingNewTask = isNewTaskLookupOption(selectedTaskOption);
  let validatedTaskTitle: string | null = null;

  if (!projectId) {
    nextErrors.projectId = "Select a project.";
  }

  if (!selectedTaskOption) {
    nextErrors.taskId = "Select a visible task.";
  }

  if (isCreatingNewTask) {
    const parsedTaskInput = createTaskSchema.safeParse({
      title: newTaskTitle.trim(),
    });

    if (!parsedTaskInput.success) {
      nextErrors.newTaskTitle =
        parsedTaskInput.error.flatten().fieldErrors.title?.[0] ??
        "Task title is invalid.";
    } else {
      validatedTaskTitle = parsedTaskInput.data.title;
    }
  }

  if (!startedAt) {
    nextErrors.startedAt = "Select a start date and time.";
  }

  if (!endedAt) {
    nextErrors.endedAt = "Select an end date and time.";
  }

  if (
    !projectId ||
    !selectedTaskOption ||
    !startedAt ||
    !endedAt ||
    nextErrors.newTaskTitle
  ) {
    return {
      errors: nextErrors,
      input: null,
    };
  }

  const draftInput = {
    description: description.trim().length > 0 ? description.trim() : null,
    endedAt: endedAt.toISOString(),
    isBillable,
    startedAt: startedAt.toISOString(),
  };
  const parsed = isCreatingNewTask
    ? createManualTimeEntryDraftSchema.safeParse(draftInput)
    : createManualTimeEntrySchema.safeParse({
        ...draftInput,
        taskId: isGitHubIssueTaskLookupOption(selectedTaskOption)
          ? GITHUB_ISSUE_VALIDATION_TASK_ID
          : selectedTaskOption.id,
      });

  if (!parsed.success) {
    return {
      errors: {
        ...nextErrors,
        ...createTimeEntryFormErrors(parsed.error),
      },
      input: null,
    };
  }

  if (isCreatingNewTask) {
    if (!validatedTaskTitle) {
      return {
        errors: nextErrors,
        input: null,
      };
    }

    return {
      errors: createDefaultTimeEntryFormErrors(),
      input: {
        draftInput,
        kind: "new-task",
        taskTitle: validatedTaskTitle,
      },
    };
  }

  return {
    errors: createDefaultTimeEntryFormErrors(),
    input: {
      input: {
        ...draftInput,
        taskId: selectedTaskOption.id,
      },
      kind: "existing-task",
    },
  };
}

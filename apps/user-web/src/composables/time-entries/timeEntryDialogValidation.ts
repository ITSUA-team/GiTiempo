import type { ZodError } from "zod";

import type { TaskLookupOption } from "./time-entry-task-lookup";
import {
  timeEntryDialogFormSchema,
  type ValidatedTimeEntryDialogInput,
} from "../../validation/time-entry-dialog";

export type { ValidatedTimeEntryDialogInput } from "../../validation/time-entry-dialog";

export interface TimeEntryFormErrors {
  description: string | null;
  endedAt: string | null;
  projectId: string | null;
  startedAt: string | null;
  taskId: string | null;
}

interface ValidateTimeEntryDialogInputOptions {
  description: string;
  endedAt: Date | null;
  isBillable: boolean;
  projectId: string | null;
  selectedTask: TaskLookupOption | null;
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
  projectId,
  selectedTask,
  startedAt,
}: ValidateTimeEntryDialogInputOptions): {
  errors: TimeEntryFormErrors;
  input: ValidatedTimeEntryDialogInput | null;
} {
  const parsed = timeEntryDialogFormSchema.safeParse({
    description,
    endedAt,
    isBillable,
    projectId,
    selectedTask,
    startedAt,
  });

  if (!parsed.success) {
    return {
      errors: createTimeEntryFormErrors(parsed.error),
      input: null,
    };
  }

  return {
    errors: createDefaultTimeEntryFormErrors(),
    input: parsed.data,
  };
}

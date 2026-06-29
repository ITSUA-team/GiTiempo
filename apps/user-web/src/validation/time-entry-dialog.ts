import { createManualTimeEntrySchema } from "@gitiempo/shared";
import { z } from "zod";

import {
  isTaskLookupOption,
  type TaskLookupOption,
} from "../composables/time-entries/time-entry-task-lookup";

const selectedProjectIdSchema = z.custom<string>(
  (value) => typeof value === "string" && value.length > 0,
  { message: "Select a project." },
);

const selectedTaskSchema = z.custom<TaskLookupOption>(
  (value) => isTaskLookupOption(value as TaskLookupOption | null),
  { message: "Select a visible task." },
);

function createRequiredDateSchema(message: string) {
  return z.custom<Date>(
    (value) => value instanceof Date && !Number.isNaN(value.getTime()),
    { message },
  );
}

export const timeEntryDialogFormSchema = z
  .object({
    description: z.string(),
    endedAt: createRequiredDateSchema("Select an end date and time."),
    isBillable: z.boolean(),
    projectId: selectedProjectIdSchema,
    selectedTask: selectedTaskSchema,
    startedAt: createRequiredDateSchema("Select a start date and time."),
  })
  .transform((value) => ({
    description:
      value.description.trim().length > 0 ? value.description.trim() : null,
    endedAt: value.endedAt.toISOString(),
    isBillable: value.isBillable,
    startedAt: value.startedAt.toISOString(),
    taskId: value.selectedTask.id,
  }))
  .superRefine((input, context) => {
    const parsed = createManualTimeEntrySchema.safeParse(input);

    if (parsed.success) {
      return;
    }

    for (const issue of parsed.error.issues) {
      context.addIssue({
        code: "custom",
        message: issue.message,
        path: issue.path,
      });
    }
  });

export type ValidatedTimeEntryDialogInput = z.infer<
  typeof timeEntryDialogFormSchema
>;

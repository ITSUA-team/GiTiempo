import { z } from "zod";

import { syncedGitHubIssueSchema } from "./github.js";

export const taskStatusSchema = z.enum(["open", "closed"]);

export const taskResponseSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  projectId: z.uuid(),
  title: z.string(),
  status: taskStatusSchema,
  defaultBillableForTimeEntries: z.boolean(),
  isActive: z.boolean(),
  githubIssue: syncedGitHubIssueSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const taskListResponseSchema = z.array(taskResponseSchema);

export const taskListQuerySchema = z
  .object({
    includeInactive: z
      .preprocess((value) => {
        if (value === "true") return true;
        if (value === "false") return false;
        return value;
      }, z.boolean())
      .optional()
      .default(false),
  })
  .strict();

export const createTaskSchema = z
  .object({
    title: z.string().min(1).max(500),
    defaultBillableForTimeEntries: z.boolean().optional(),
  })
  .strict();

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    status: taskStatusSchema.optional(),
    defaultBillableForTimeEntries: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.status !== undefined ||
      data.defaultBillableForTimeEntries !== undefined ||
      data.isActive !== undefined,
    {
      message: "At least one field must be provided",
      path: [],
    },
  );

export const backfillTaskBillableDefaultSchema = z
  .object({
    updateTimeEntries: z.literal(true),
  })
  .strict();

export const taskBillableDefaultBackfillResponseSchema = z.object({
  timeEntriesUpdated: z.number().int().min(0),
});

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskResponse = z.infer<typeof taskResponseSchema>;
export type TaskListResponse = z.infer<typeof taskListResponseSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type BackfillTaskBillableDefaultInput = z.infer<
  typeof backfillTaskBillableDefaultSchema
>;
export type TaskBillableDefaultBackfillResponse = z.infer<
  typeof taskBillableDefaultBackfillResponseSchema
>;

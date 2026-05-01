import { z } from "zod";

export const taskStatusSchema = z.enum(["open", "closed"]);

export const taskResponseSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  projectId: z.uuid(),
  title: z.string(),
  status: taskStatusSchema,
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const taskListResponseSchema = z.array(taskResponseSchema);

export const createTaskSchema = z
  .object({
    title: z.string().min(1).max(500),
  })
  .strict();

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    status: taskStatusSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.status !== undefined ||
      data.isActive !== undefined,
    {
      message: "At least one field must be provided",
      path: [],
    },
  );

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskResponse = z.infer<typeof taskResponseSchema>;
export type TaskListResponse = z.infer<typeof taskListResponseSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

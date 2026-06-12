import { z } from "zod";
import { projectMemberSchema } from "./projects.js";

export const taskStatusSchema = z.enum(["open", "closed"]);
export const taskPrioritySchema = z.enum(["low", "medium", "high"]);

const taskDescriptionSchema = z.string().max(2000).nullable();
const taskAssigneeIdsSchema = z
  .array(z.uuid())
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "Assignee ids must be unique",
  });
export const taskAssigneesSchema = z.array(projectMemberSchema);

export const taskResponseSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  projectId: z.uuid(),
  title: z.string(),
  description: taskDescriptionSchema,
  priority: taskPrioritySchema,
  status: taskStatusSchema,
  assignees: taskAssigneesSchema,
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const taskListResponseSchema = z.array(taskResponseSchema);

export const createTaskSchema = z
  .object({
    title: z.string().min(1).max(500),
    description: taskDescriptionSchema.optional(),
    priority: taskPrioritySchema.optional(),
    status: taskStatusSchema.optional(),
    assigneeIds: taskAssigneeIdsSchema.optional(),
  })
  .strict();

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    description: taskDescriptionSchema.optional(),
    priority: taskPrioritySchema.optional(),
    status: taskStatusSchema.optional(),
    assigneeIds: taskAssigneeIdsSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.priority !== undefined ||
      data.status !== undefined ||
      data.assigneeIds !== undefined ||
      data.isActive !== undefined,
    {
      message: "At least one field must be provided",
      path: [],
    },
  );

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type TaskAssignees = z.infer<typeof taskAssigneesSchema>;
export type TaskResponse = z.infer<typeof taskResponseSchema>;
export type TaskListResponse = z.infer<typeof taskListResponseSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

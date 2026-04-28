import { z } from "zod";
import { workspaceRoleSchema } from "./workspace-members.js";

export const projectResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  color: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const projectListResponseSchema = z.array(projectResponseSchema);

export const createProjectSchema = z
  .object({
    name: z.string().min(1).max(255),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .nullable()
      .optional(),
  })
  .strict();

export const updateProjectSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .nullable()
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.name !== undefined ||
      data.color !== undefined ||
      data.isActive !== undefined,
    {
      message: "At least one field must be provided",
      path: [],
    },
  );

export const projectAssignmentResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: workspaceRoleSchema,
  assignedBy: z.string().uuid(),
  assignedAt: z.string().datetime(),
});

export const projectAssignmentListResponseSchema = z.array(
  projectAssignmentResponseSchema,
);

export const createProjectAssignmentSchema = z
  .object({
    userId: z.string().uuid(),
  })
  .strict();

export type ProjectResponse = z.infer<typeof projectResponseSchema>;
export type ProjectListResponse = z.infer<
  typeof projectListResponseSchema
>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectAssignmentResponse = z.infer<
  typeof projectAssignmentResponseSchema
>;
export type ProjectAssignmentListResponse = z.infer<
  typeof projectAssignmentListResponseSchema
>;
export type CreateProjectAssignmentInput = z.infer<
  typeof createProjectAssignmentSchema
>;

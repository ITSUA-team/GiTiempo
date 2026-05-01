import { z } from "zod";
import { workspaceRoleSchema } from "./workspace-members.js";

export const projectVisibilitySchema = z.enum(["public", "private"]);
export const projectSourceSchema = z.enum(["manual", "github"]);

export const projectResponseSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  name: z.string(),
  color: z.string().nullable(),
  visibility: projectVisibilitySchema,
  source: projectSourceSchema,
  totalHours: z.number().min(0),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const projectListResponseSchema = z.array(projectResponseSchema);

export const managementProjectSummaryResponseSchema = z.object({
  activeProjects: z.number().int().min(0),
  privateProjects: z.number().int().min(0),
  publicProjects: z.number().int().min(0),
});

export const myProjectSummaryResponseSchema = z.object({
  visibleProjects: z.number().int().min(0),
  trackedHoursWeek: z.number().min(0),
  trackedHoursMonth: z.number().min(0),
});

export const createProjectSchema = z
  .object({
    name: z.string().min(1).max(255),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .nullable()
      .optional(),
    visibility: projectVisibilitySchema.optional(),
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
    visibility: projectVisibilitySchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.name !== undefined ||
      data.color !== undefined ||
      data.visibility !== undefined ||
      data.isActive !== undefined,
    {
      message: "At least one field must be provided",
      path: [],
    },
  );

export const projectAssignmentResponseSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  projectId: z.uuid(),
  userId: z.uuid(),
  email: z.email(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: workspaceRoleSchema,
  assignedBy: z.uuid(),
  assignedAt: z.iso.datetime(),
});

export const projectAssignmentListResponseSchema = z.array(
  projectAssignmentResponseSchema,
);

export const createProjectAssignmentSchema = z
  .object({
    userId: z.uuid(),
  })
  .strict();

export type ProjectResponse = z.infer<typeof projectResponseSchema>;
export type ProjectListResponse = z.infer<
  typeof projectListResponseSchema
>;
export type ProjectVisibility = z.infer<typeof projectVisibilitySchema>;
export type ProjectSource = z.infer<typeof projectSourceSchema>;
export type ManagementProjectSummaryResponse = z.infer<
  typeof managementProjectSummaryResponseSchema
>;
export type MyProjectSummaryResponse = z.infer<
  typeof myProjectSummaryResponseSchema
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

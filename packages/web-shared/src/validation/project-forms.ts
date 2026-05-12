import { z } from "zod";
import { createProjectSchema } from "@gitiempo/shared";

// Re-export for use in forms — name field gets a user-friendly message
export const createProjectFormSchema = createProjectSchema.extend({
  name: z.string().trim().min(1, "Project name is required").max(255),
  managerUserId: z.string().nullable().optional(),
});

export type CreateProjectFormInput = z.infer<typeof createProjectFormSchema>;

export const projectEditFormSchema = z.object({
  visibility: z.enum(["public", "private"]),
  memberIds: z.array(z.string()),
});

export type ProjectEditFormInput = z.infer<typeof projectEditFormSchema>;

export const memberAssignFormSchema = z.object({
  projectIds: z.array(z.string()),
});

export type MemberAssignFormInput = z.infer<typeof memberAssignFormSchema>;

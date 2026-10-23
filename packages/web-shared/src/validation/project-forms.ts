import { z } from "zod";
import {
  createProjectSchema,
  roundingStepMinutesSchema,
} from "@gitiempo/shared";

/**
 * Form-level schema accepting 0 (inherit sentinel) alongside 1–60.
 * PrimeVue Select cannot match null as a selected option value,
 * so forms use 0 internally and convert to null at the submit boundary.
 */
const formRoundingStepSchema = z.union([
  z.literal(0),
  roundingStepMinutesSchema,
]);

// Re-export for use in forms — name field gets a user-friendly message
export const createProjectFormSchema = createProjectSchema.extend({
  name: z.string().trim().min(1, "Project name is required").max(255),
  managerUserId: z.string().nullable().optional(),
  timeRoundingStepMinutes: formRoundingStepSchema.nullable().optional(),
});

export type CreateProjectFormInput = z.infer<typeof createProjectFormSchema>;

export const importProjectFormSchema = createProjectFormSchema.extend({
  name: z.string().optional(),
});

export type ImportProjectFormInput = z.infer<typeof importProjectFormSchema>;

export const projectEditFormSchema = z.object({
  defaultBillableForTasks: z.boolean(),
  timeRoundingStepMinutes: formRoundingStepSchema.nullable().optional(),
  managerUserId: z.string().nullable().optional(),
  visibility: z.enum(["public", "private"]),
  memberIds: z.array(z.string()),
});

export type ProjectEditFormInput = z.infer<typeof projectEditFormSchema>;

export const memberAssignFormSchema = z.object({
  projectIds: z.array(z.string()),
});

export type MemberAssignFormInput = z.infer<typeof memberAssignFormSchema>;

import { z } from "zod";
import { createWorkspaceInviteSchema, workspaceRoleSchema } from "@gitiempo/shared";

export const workspaceInviteFormSchema = createWorkspaceInviteSchema.extend({
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),
  role: z
    .string()
    .trim()
    .min(1, "Select a role.")
    .pipe(workspaceRoleSchema),
});

export type WorkspaceInviteFormInput = z.infer<typeof workspaceInviteFormSchema>;

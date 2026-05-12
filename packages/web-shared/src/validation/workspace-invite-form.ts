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

export function parseInviteForm(data: unknown): {
  success: true;
  data: WorkspaceInviteFormInput;
} | {
  success: false;
  fieldErrors: Record<string, string>;
} {
  const result = workspaceInviteFormSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const fieldErrors: Record<string, string> = {};

  for (const issue of result.error.issues) {
    const key = issue.path[0];

    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }

  return { success: false, fieldErrors };
}

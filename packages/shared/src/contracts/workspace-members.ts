import { z } from "zod";

export const workspaceRoleSchema = z.enum(["admin", "pm", "member"]);

export const workspaceMemberResponseSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  userId: z.uuid(),
  email: z.email(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: workspaceRoleSchema,
  joinedAt: z.iso.datetime(),
});

export const workspaceMemberListResponseSchema = z.array(
  workspaceMemberResponseSchema,
);

export const updateWorkspaceMemberRoleSchema = z
  .object({
    role: workspaceRoleSchema,
  })
  .strict();

export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;
export type WorkspaceMemberResponse = z.infer<
  typeof workspaceMemberResponseSchema
>;
export type WorkspaceMemberListResponse = z.infer<
  typeof workspaceMemberListResponseSchema
>;
export type UpdateWorkspaceMemberRoleInput = z.infer<
  typeof updateWorkspaceMemberRoleSchema
>;

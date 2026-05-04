import { z } from "zod";
import { workspaceRoleSchema } from "./workspace-members.js";

export const workspaceInviteStatusSchema = z.enum([
  "pending",
  "accepted",
  "expired",
]);

export const workspaceInviteResponseSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  email: z.email(),
  invitedBy: z.uuid(),
  role: workspaceRoleSchema,
  status: workspaceInviteStatusSchema,
  expiresAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
});

export const workspaceInviteListResponseSchema = z.array(
  workspaceInviteResponseSchema,
);

export const createWorkspaceInviteSchema = z
  .object({
    email: z.email(),
    role: workspaceRoleSchema,
  })
  .strict();

export const acceptWorkspaceInviteSchema = z
  .object({
    token: z.string().min(1),
    firebaseIdToken: z.string().min(1),
  })
  .strict();

export type WorkspaceInviteStatus = z.infer<
  typeof workspaceInviteStatusSchema
>;
export type WorkspaceInviteResponse = z.infer<
  typeof workspaceInviteResponseSchema
>;
export type WorkspaceInviteListResponse = z.infer<
  typeof workspaceInviteListResponseSchema
>;
export type CreateWorkspaceInviteInput = z.infer<
  typeof createWorkspaceInviteSchema
>;
export type AcceptWorkspaceInviteInput = z.infer<
  typeof acceptWorkspaceInviteSchema
>;

import { z } from "zod";
import { workspaceRoleSchema } from "./workspace-members.js";

/**
 * Public-facing user schema (server -> client).
 *
 * NOTE: `firebaseUid` is intentionally NOT exposed to clients.
 * It is an internal identifier from the auth provider.
 */
export const userResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: workspaceRoleSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

/**
 * Body for `PATCH /users/me`.
 *
 * Both fields are optional, but at least one must be provided.
 * Empty body is rejected with 400.
 */
export const updateUserSchema = z
  .object({
    displayName: z.string().min(1).max(255).optional(),
    avatarUrl: z.url().max(2048).nullable().optional(),
  })
  .refine(
    (data) =>
      data.displayName !== undefined || data.avatarUrl !== undefined,
    {
      message: "At least one field must be provided",
      path: [],
    },
  );

export const currentUserWorkspaceMembershipResponseSchema = z
  .object({
    workspaceId: z.uuid(),
    workspaceName: z.string().min(1),
    role: workspaceRoleSchema,
    isCurrent: z.boolean(),
  })
  .strict();

export const currentUserWorkspaceMembershipListResponseSchema = z
  .object({
    items: z.array(currentUserWorkspaceMembershipResponseSchema),
  })
  .strict()
  .refine(
    ({ items }) => items.filter((item) => item.isCurrent).length === 1,
    {
      message: "Exactly one current workspace membership is required",
      path: ["items"],
    },
  );

export type UserResponse = z.infer<typeof userResponseSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CurrentUserWorkspaceMembershipResponse = z.infer<
  typeof currentUserWorkspaceMembershipResponseSchema
>;
export type CurrentUserWorkspaceMembershipListResponse = z.infer<
  typeof currentUserWorkspaceMembershipListResponseSchema
>;

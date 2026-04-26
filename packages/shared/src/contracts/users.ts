import { z } from "zod";
import { workspaceRoleSchema } from "./workspace-members.js";

/**
 * Public-facing user schema (server -> client).
 *
 * NOTE: `firebaseUid` is intentionally NOT exposed to clients.
 * It is an internal identifier from the auth provider.
 */
export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: workspaceRoleSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
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
    avatarUrl: z.string().url().max(2048).nullable().optional(),
  })
  .refine(
    (data) =>
      data.displayName !== undefined || data.avatarUrl !== undefined,
    {
      message: "At least one field must be provided",
      path: [],
    },
  );

export type UserResponse = z.infer<typeof userResponseSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

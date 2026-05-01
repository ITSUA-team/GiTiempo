import { z } from "zod";

export const workspaceResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const updateWorkspaceSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
  })
  .strict()
  .refine((data) => data.name !== undefined, {
    message: "At least one field must be provided",
    path: [],
  });

export const workspaceSettingsResponseSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  currency: z.string().length(3),
  defaultHourlyRate: z.number().nonnegative().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const updateWorkspaceSettingsSchema = z
  .object({
    currency: z.string().regex(/^[A-Z]{3}$/).optional(),
    defaultHourlyRate: z.number().nonnegative().nullable().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.currency !== undefined || data.defaultHourlyRate !== undefined,
    {
      message: "At least one field must be provided",
      path: [],
    },
  );

export type WorkspaceResponse = z.infer<typeof workspaceResponseSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type WorkspaceSettingsResponse = z.infer<
  typeof workspaceSettingsResponseSchema
>;
export type UpdateWorkspaceSettingsInput = z.infer<
  typeof updateWorkspaceSettingsSchema
>;

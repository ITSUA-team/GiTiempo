import { z } from 'zod';

const timeZoneNamePattern = /^(?:UTC|[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+)$/;

function isSupportedRuntimeTimeZone(timeZone: string): boolean {
  const supportedValuesOf = Intl.supportedValuesOf;

  if (typeof supportedValuesOf !== 'function') return false;

  try {
    return supportedValuesOf('timeZone').includes(timeZone);
  } catch {
    return false;
  }
}

function isConstructorValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });

    return true;
  } catch {
    return false;
  }
}

function isValidTimeZone(timeZone: string): boolean {
  if (!timeZoneNamePattern.test(timeZone)) return false;
  if (timeZone === 'UTC') return true;

  return (
    isSupportedRuntimeTimeZone(timeZone) || isConstructorValidTimeZone(timeZone)
  );
}

const timeZoneSchema = z
  .string()
  .min(1)
  .max(64)
  .refine(isValidTimeZone, { message: 'Invalid time zone' });

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
    message: 'At least one field must be provided',
    path: [],
  });

export const workspaceSettingsResponseSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  currency: z.string().length(3),
  defaultHourlyRate: z.number().nonnegative().nullable(),
  timeZone: timeZoneSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const githubOrganizationLoginSchema = z
  .string()
  .trim()
  .min(1, 'Organization login is required')
  .max(255);

export const workspaceGitHubOrganizationRecoveryReasonValues = [
  'workspace_github_organization_connection_required',
  'workspace_github_organization_not_visible',
  'workspace_github_organization_app_access_blocked',
  'workspace_github_organization_provider_retryable',
] as const;

export const workspaceGitHubOrganizationRecoveryReasonSchema = z.enum(
  workspaceGitHubOrganizationRecoveryReasonValues,
);

export const workspaceGitHubOrganizationRecoveryStepIdValues = [
  'install',
  'approve',
  'reconnect',
  'retry',
] as const;

export const workspaceGitHubOrganizationRecoveryStepIdSchema = z.enum(
  workspaceGitHubOrganizationRecoveryStepIdValues,
);

export const workspaceGitHubOrganizationRecoveryStepStatusValues = [
  'action_required',
  'blocked',
  'complete',
  'disconnected',
  'ready',
  'unknown',
] as const;

export const workspaceGitHubOrganizationRecoveryStepStatusSchema = z.enum(
  workspaceGitHubOrganizationRecoveryStepStatusValues,
);

export const workspaceGitHubOrganizationRecoveryStepSchema = z
  .object({
    id: workspaceGitHubOrganizationRecoveryStepIdSchema,
    status: workspaceGitHubOrganizationRecoveryStepStatusSchema,
  })
  .strict();

export const workspaceGitHubOrganizationRecoveryStepsSchema = z.tuple([
  workspaceGitHubOrganizationRecoveryStepSchema.extend({
    id: z.literal('install'),
  }),
  workspaceGitHubOrganizationRecoveryStepSchema.extend({
    id: z.literal('approve'),
  }),
  workspaceGitHubOrganizationRecoveryStepSchema.extend({
    id: z.literal('reconnect'),
  }),
  workspaceGitHubOrganizationRecoveryStepSchema.extend({
    id: z.literal('retry'),
  }),
]);

export const workspaceGitHubOrganizationRecoveryPayloadSchema = z
  .object({
    organizationLogin: githubOrganizationLoginSchema,
    reason: workspaceGitHubOrganizationRecoveryReasonSchema,
    steps: workspaceGitHubOrganizationRecoveryStepsSchema,
  })
  .strict();

export const workspaceGitHubOrganizationRecoveryErrorSchema = z
  .object({
    statusCode: z.number().int().positive(),
    code: workspaceGitHubOrganizationRecoveryReasonSchema,
    error: z.string().min(1),
    message: z.string().min(1),
    recovery: workspaceGitHubOrganizationRecoveryPayloadSchema,
    requestId: z.string().min(1).optional(),
  })
  .strict();

export const workspaceGitHubOrganizationResponseSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  organizationLogin: githubOrganizationLoginSchema,
  createdByUserId: z.uuid(),
  createdAt: z.iso.datetime(),
});

export const workspaceGitHubOrganizationListResponseSchema = z.object({
  items: z.array(workspaceGitHubOrganizationResponseSchema),
});

export const addWorkspaceGitHubOrganizationSchema = z
  .object({
    organizationLogin: githubOrganizationLoginSchema,
  })
  .strict();

export const updateWorkspaceSettingsSchema = z
  .object({
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    defaultHourlyRate: z.number().nonnegative().nullable().optional(),
    timeZone: timeZoneSchema.optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.currency !== undefined ||
      data.defaultHourlyRate !== undefined ||
      data.timeZone !== undefined,
    {
      message: 'At least one field must be provided',
      path: [],
    },
  );

export type WorkspaceResponse = z.infer<typeof workspaceResponseSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type WorkspaceSettingsResponse = z.infer<
  typeof workspaceSettingsResponseSchema
>;
export type WorkspaceGitHubOrganizationResponse = z.infer<
  typeof workspaceGitHubOrganizationResponseSchema
>;
export type WorkspaceGitHubOrganizationListResponse = z.infer<
  typeof workspaceGitHubOrganizationListResponseSchema
>;
export type AddWorkspaceGitHubOrganizationInput = z.infer<
  typeof addWorkspaceGitHubOrganizationSchema
>;
export type WorkspaceGitHubOrganizationRecoveryReason = z.infer<
  typeof workspaceGitHubOrganizationRecoveryReasonSchema
>;
export type WorkspaceGitHubOrganizationRecoveryStepId = z.infer<
  typeof workspaceGitHubOrganizationRecoveryStepIdSchema
>;
export type WorkspaceGitHubOrganizationRecoveryStepStatus = z.infer<
  typeof workspaceGitHubOrganizationRecoveryStepStatusSchema
>;
export type WorkspaceGitHubOrganizationRecoveryStep = z.infer<
  typeof workspaceGitHubOrganizationRecoveryStepSchema
>;
export type WorkspaceGitHubOrganizationRecoveryPayload = z.infer<
  typeof workspaceGitHubOrganizationRecoveryPayloadSchema
>;
export type WorkspaceGitHubOrganizationRecoveryError = z.infer<
  typeof workspaceGitHubOrganizationRecoveryErrorSchema
>;
export type UpdateWorkspaceSettingsInput = z.infer<
  typeof updateWorkspaceSettingsSchema
>;

const workspaceGitHubOrganizationRecoveryStepsByReason = {
  workspace_github_organization_connection_required: [
    { id: 'install', status: 'unknown' },
    { id: 'approve', status: 'action_required' },
    { id: 'reconnect', status: 'disconnected' },
    { id: 'retry', status: 'blocked' },
  ],
  workspace_github_organization_app_access_blocked: [
    { id: 'install', status: 'complete' },
    { id: 'approve', status: 'blocked' },
    { id: 'reconnect', status: 'action_required' },
    { id: 'retry', status: 'blocked' },
  ],
  workspace_github_organization_provider_retryable: [
    { id: 'install', status: 'unknown' },
    { id: 'approve', status: 'action_required' },
    { id: 'reconnect', status: 'complete' },
    { id: 'retry', status: 'ready' },
  ],
  workspace_github_organization_not_visible: [
    { id: 'install', status: 'action_required' },
    { id: 'approve', status: 'action_required' },
    { id: 'reconnect', status: 'complete' },
    { id: 'retry', status: 'blocked' },
  ],
} satisfies Record<
  WorkspaceGitHubOrganizationRecoveryReason,
  WorkspaceGitHubOrganizationRecoveryPayload['steps']
>;

export function buildWorkspaceGitHubOrganizationRecoveryPayload(
  organizationLogin: string,
  reason: WorkspaceGitHubOrganizationRecoveryReason,
): WorkspaceGitHubOrganizationRecoveryPayload {
  return {
    organizationLogin,
    reason,
    steps: workspaceGitHubOrganizationRecoveryStepsByReason[reason].map(
      (step) => ({ ...step }),
    ) as WorkspaceGitHubOrganizationRecoveryPayload['steps'],
  };
}

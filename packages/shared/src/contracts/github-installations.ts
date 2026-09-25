import { z } from 'zod';

const providerIdSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .max(30);
const organizationLoginSchema = z
  .string()
  .trim()
  .min(1)
  .max(39)
  .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/);
const setupStateSchema = z.string().min(32).max(256);

export const workspaceGitHubInstallationSchema = z
  .object({
    id: z.uuid(),
    organizationId: providerIdSchema,
    organizationLogin: organizationLoginSchema,
    installationId: providerIdSchema,
    status: z.enum(['verified', 'suspended', 'unavailable', 'disconnected']),
    verifiedAt: z.iso.datetime().nullable(),
    recoveryReason: z.string().max(500).nullable(),
  })
  .strict();

export const workspaceGitHubInstallationListSchema = z
  .object({
    items: z.array(workspaceGitHubInstallationSchema),
  })
  .strict();

export const githubInstallationSetupRequestSchema = z
  .object({
    organizationLogin: organizationLoginSchema,
  })
  .strict();

export const githubInstallationSetupResponseSchema = z
  .object({
    state: setupStateSchema,
    installationUrl: z.url(),
    expiresAt: z.iso.datetime(),
    existingInstallationId: providerIdSchema.optional(),
  })
  .strict();

export const githubInstallationCompleteRequestSchema = z
  .object({
    state: setupStateSchema,
    installationId: providerIdSchema,
  })
  .strict();

export const githubTrackingErrorCodeSchema = z.enum([
  'project_assignment_required',
  'github_installation_required',
  'github_installation_unavailable',
  'github_installation_permissions_required',
  'github_organization_not_allowed',
  'github_resource_unavailable',
  'github_project_mapping_required',
  'github_project_mapping_ambiguous',
  'github_provider_unavailable',
]);

export type GitHubTrackingErrorCode = z.infer<
  typeof githubTrackingErrorCodeSchema
>;

export const githubTrackingErrorMessages: Record<
  GitHubTrackingErrorCode,
  string
> = {
  project_assignment_required:
    'You are not assigned to this project. Contact your workspace administrator or project manager to get access and start tracking time.',
  github_installation_required:
    'Your workspace needs a verified GitHub App installation. Contact your workspace administrator to set it up.',
  github_installation_unavailable:
    'Your workspace GitHub App installation is unavailable. Contact your workspace administrator to restore access.',
  github_installation_permissions_required:
    'Your workspace GitHub App needs additional permissions. Contact your workspace administrator to grant access.',
  github_organization_not_allowed:
    'This GitHub organization is not allowed in your workspace. Contact your workspace administrator.',
  github_resource_unavailable:
    'This GitHub issue or repository is unavailable. Contact your workspace administrator to check GitHub App access.',
  github_project_mapping_required:
    'This issue is not linked to a GiTiempo project. Contact your workspace administrator or project manager to set up the project.',
  github_project_mapping_ambiguous:
    'This issue matches more than one GiTiempo project. Contact your workspace administrator or project manager to resolve the project mapping.',
  github_provider_unavailable:
    'GitHub is temporarily unavailable. Please try again later.',
};

export const githubTrackingErrorStatuses: Record<
  GitHubTrackingErrorCode,
  number
> = {
  project_assignment_required: 403,
  github_installation_required: 409,
  github_installation_unavailable: 403,
  github_installation_permissions_required: 403,
  github_organization_not_allowed: 403,
  github_resource_unavailable: 404,
  github_project_mapping_required: 409,
  github_project_mapping_ambiguous: 409,
  github_provider_unavailable: 503,
};

export const githubTrackingErrorSchema = z.object({
  code: githubTrackingErrorCodeSchema,
  error: z.string(),
  message: z.string(),
});

export const githubInstallationAssociationParamsSchema = z
  .object({
    associationId: z.uuid(),
  })
  .strict();

export type GitHubInstallationAssociationParams = z.infer<
  typeof githubInstallationAssociationParamsSchema
>;

export type WorkspaceGitHubInstallation = z.infer<
  typeof workspaceGitHubInstallationSchema
>;
export type WorkspaceGitHubInstallationList = z.infer<
  typeof workspaceGitHubInstallationListSchema
>;
export type GitHubInstallationSetupRequest = z.infer<
  typeof githubInstallationSetupRequestSchema
>;
export type GitHubInstallationSetupResponse = z.infer<
  typeof githubInstallationSetupResponseSchema
>;
export type GitHubInstallationCompleteRequest = z.infer<
  typeof githubInstallationCompleteRequestSchema
>;
export type GitHubTrackingError = z.infer<typeof githubTrackingErrorSchema>;

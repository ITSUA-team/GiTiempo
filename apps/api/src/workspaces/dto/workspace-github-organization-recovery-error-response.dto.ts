import { createZodDto } from 'nestjs-zod';
import { workspaceGitHubOrganizationRecoveryErrorSchema } from '@gitiempo/shared';

export class WorkspaceGitHubOrganizationRecoveryErrorResponseDto extends createZodDto(
  workspaceGitHubOrganizationRecoveryErrorSchema,
) {}

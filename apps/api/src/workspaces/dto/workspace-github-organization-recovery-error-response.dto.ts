import { createZodDto } from './../../common/zod-dto.js';
import { workspaceGitHubOrganizationRecoveryErrorSchema } from '@gitiempo/shared';

export class WorkspaceGitHubOrganizationRecoveryErrorResponseDto extends createZodDto(
  workspaceGitHubOrganizationRecoveryErrorSchema,
) {}

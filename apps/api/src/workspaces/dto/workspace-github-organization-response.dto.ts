import { createZodDto } from './../../common/zod-dto.js';
import { workspaceGitHubOrganizationResponseSchema } from '@gitiempo/shared';

export class WorkspaceGitHubOrganizationResponseDto extends createZodDto(
  workspaceGitHubOrganizationResponseSchema,
) {}

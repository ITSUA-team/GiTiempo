import { createZodDto } from './../../common/zod-dto.js';
import { workspaceGitHubOrganizationListResponseSchema } from '@gitiempo/shared';

export class WorkspaceGitHubOrganizationListResponseDto extends createZodDto(
  workspaceGitHubOrganizationListResponseSchema,
) {}

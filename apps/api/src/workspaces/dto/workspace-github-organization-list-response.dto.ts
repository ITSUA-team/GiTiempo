import { createZodDto } from 'nestjs-zod';
import { workspaceGitHubOrganizationListResponseSchema } from '@gitiempo/shared';

export class WorkspaceGitHubOrganizationListResponseDto extends createZodDto(
  workspaceGitHubOrganizationListResponseSchema,
) {}

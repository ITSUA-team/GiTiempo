import { createZodDto } from 'nestjs-zod';
import { workspaceGitHubOrganizationResponseSchema } from '@gitiempo/shared';

export class WorkspaceGitHubOrganizationResponseDto extends createZodDto(
  workspaceGitHubOrganizationResponseSchema,
) {}

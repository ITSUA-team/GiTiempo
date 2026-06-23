import { createZodDto } from 'nestjs-zod';
import { addWorkspaceGitHubOrganizationSchema } from '@gitiempo/shared';

export class AddWorkspaceGitHubOrganizationDto extends createZodDto(
  addWorkspaceGitHubOrganizationSchema,
) {}

import { createZodDto } from './../../common/zod-dto.js';
import { addWorkspaceGitHubOrganizationSchema } from '@gitiempo/shared';

export class AddWorkspaceGitHubOrganizationDto extends createZodDto(
  addWorkspaceGitHubOrganizationSchema,
) {}

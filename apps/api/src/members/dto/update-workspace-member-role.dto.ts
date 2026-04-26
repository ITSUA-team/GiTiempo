import { createZodDto } from 'nestjs-zod';
import { updateWorkspaceMemberRoleSchema } from '@gitiempo/shared';

export class UpdateWorkspaceMemberRoleDto extends createZodDto(
  updateWorkspaceMemberRoleSchema,
) {}

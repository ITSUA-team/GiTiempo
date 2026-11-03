import { createZodDto } from 'nestjs-zod';
import { updateWorkspaceMemberPermissionsSchema } from '@gitiempo/shared';

export class UpdateWorkspaceMemberPermissionsDto extends createZodDto(
  updateWorkspaceMemberPermissionsSchema,
) {}

import { createZodDto } from './../../common/zod-dto.js';
import { updateWorkspaceMemberPermissionsSchema } from '@gitiempo/shared';

export class UpdateWorkspaceMemberPermissionsDto extends createZodDto(
  updateWorkspaceMemberPermissionsSchema,
) {}

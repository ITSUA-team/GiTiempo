import { createZodDto } from './../../common/zod-dto.js';
import { updateWorkspaceMemberRoleSchema } from '@gitiempo/shared';

export class UpdateWorkspaceMemberRoleDto extends createZodDto(
  updateWorkspaceMemberRoleSchema,
) {}

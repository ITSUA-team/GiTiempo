import { createZodDto } from './../../common/zod-dto.js';
import { createWorkspaceInviteSchema } from '@gitiempo/shared';

export class CreateWorkspaceInviteDto extends createZodDto(
  createWorkspaceInviteSchema,
) {}

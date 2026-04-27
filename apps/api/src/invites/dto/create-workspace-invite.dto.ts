import { createZodDto } from 'nestjs-zod';
import { createWorkspaceInviteSchema } from '@gitiempo/shared';

export class CreateWorkspaceInviteDto extends createZodDto(
  createWorkspaceInviteSchema,
) {}

import { createZodDto } from 'nestjs-zod';
import { workspaceInviteResponseSchema } from '@gitiempo/shared';

export class WorkspaceInviteResponseDto extends createZodDto(
  workspaceInviteResponseSchema,
) {}

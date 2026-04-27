import { createZodDto } from 'nestjs-zod';
import { workspaceInviteListResponseSchema } from '@gitiempo/shared';

export class WorkspaceInviteListResponseDto extends createZodDto(
  workspaceInviteListResponseSchema,
) {}

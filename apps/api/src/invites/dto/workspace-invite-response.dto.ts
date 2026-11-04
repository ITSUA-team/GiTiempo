import { createZodDto } from './../../common/zod-dto.js';
import { workspaceInviteResponseSchema } from '@gitiempo/shared';

export class WorkspaceInviteResponseDto extends createZodDto(
  workspaceInviteResponseSchema,
) {}

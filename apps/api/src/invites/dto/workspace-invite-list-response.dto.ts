import { createZodDto } from './../../common/zod-dto.js';
import { workspaceInviteListResponseSchema } from '@gitiempo/shared';

export class WorkspaceInviteListResponseDto extends createZodDto(
  workspaceInviteListResponseSchema,
) {}

import { createZodDto } from './../../common/zod-dto.js';
import { workspaceMemberListResponseSchema } from '@gitiempo/shared';

export class WorkspaceMemberListResponseDto extends createZodDto(
  workspaceMemberListResponseSchema,
) {}

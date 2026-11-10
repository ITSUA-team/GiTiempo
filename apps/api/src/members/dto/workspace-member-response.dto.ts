import { createZodDto } from './../../common/zod-dto.js';
import { workspaceMemberResponseSchema } from '@gitiempo/shared';

export class WorkspaceMemberResponseDto extends createZodDto(
  workspaceMemberResponseSchema,
) {}

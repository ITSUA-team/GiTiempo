import { createZodDto } from 'nestjs-zod';
import { workspaceMemberListResponseSchema } from '@gitiempo/shared';

export class WorkspaceMemberListResponseDto extends createZodDto(
  workspaceMemberListResponseSchema,
) {}

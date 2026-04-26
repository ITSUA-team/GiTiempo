import { createZodDto } from 'nestjs-zod';
import { workspaceMemberResponseSchema } from '@gitiempo/shared';

export class WorkspaceMemberResponseDto extends createZodDto(
  workspaceMemberResponseSchema,
) {}

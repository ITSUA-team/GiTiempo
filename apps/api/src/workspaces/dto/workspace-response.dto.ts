import { createZodDto } from 'nestjs-zod';
import { workspaceResponseSchema } from '@gitiempo/shared';

export class WorkspaceResponseDto extends createZodDto(
  workspaceResponseSchema,
) {}

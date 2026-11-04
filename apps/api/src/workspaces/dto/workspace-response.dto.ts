import { createZodDto } from './../../common/zod-dto.js';
import { workspaceResponseSchema } from '@gitiempo/shared';

export class WorkspaceResponseDto extends createZodDto(
  workspaceResponseSchema,
) {}

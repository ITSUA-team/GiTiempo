import { createZodDto } from './../../common/zod-dto.js';
import { projectAssignmentResponseSchema } from '@gitiempo/shared';

export class ProjectAssignmentResponseDto extends createZodDto(
  projectAssignmentResponseSchema,
) {}

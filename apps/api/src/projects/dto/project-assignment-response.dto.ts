import { createZodDto } from 'nestjs-zod';
import { projectAssignmentResponseSchema } from '@gitiempo/shared';

export class ProjectAssignmentResponseDto extends createZodDto(
  projectAssignmentResponseSchema,
) {}

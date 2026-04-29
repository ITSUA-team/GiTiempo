import { createZodDto } from 'nestjs-zod';
import { projectAssignmentListResponseSchema } from '@gitiempo/shared';

export class ProjectAssignmentListResponseDto extends createZodDto(
  projectAssignmentListResponseSchema,
) {}

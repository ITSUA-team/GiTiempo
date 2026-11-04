import { createZodDto } from './../../common/zod-dto.js';
import { projectAssignmentListResponseSchema } from '@gitiempo/shared';

export class ProjectAssignmentListResponseDto extends createZodDto(
  projectAssignmentListResponseSchema,
) {}

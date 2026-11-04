import { createZodDto } from './../../common/zod-dto.js';
import { createProjectAssignmentSchema } from '@gitiempo/shared';

export class CreateProjectAssignmentDto extends createZodDto(
  createProjectAssignmentSchema,
) {}

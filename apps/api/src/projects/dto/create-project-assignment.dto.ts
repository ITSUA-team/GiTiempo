import { createZodDto } from 'nestjs-zod';
import { createProjectAssignmentSchema } from '@gitiempo/shared';

export class CreateProjectAssignmentDto extends createZodDto(
  createProjectAssignmentSchema,
) {}

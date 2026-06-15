import { createZodDto } from 'nestjs-zod';
import { projectBillableDefaultBackfillResponseSchema } from '@gitiempo/shared';

export class ProjectBillableDefaultBackfillResponseDto extends createZodDto(
  projectBillableDefaultBackfillResponseSchema,
) {}

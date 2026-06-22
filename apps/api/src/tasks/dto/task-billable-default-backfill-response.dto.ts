import { createZodDto } from 'nestjs-zod';
import { taskBillableDefaultBackfillResponseSchema } from '@gitiempo/shared';

export class TaskBillableDefaultBackfillResponseDto extends createZodDto(
  taskBillableDefaultBackfillResponseSchema,
) {}

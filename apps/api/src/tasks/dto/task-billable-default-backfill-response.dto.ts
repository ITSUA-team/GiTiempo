import { createZodDto } from './../../common/zod-dto.js';
import { taskBillableDefaultBackfillResponseSchema } from '@gitiempo/shared';

export class TaskBillableDefaultBackfillResponseDto extends createZodDto(
  taskBillableDefaultBackfillResponseSchema,
) {}

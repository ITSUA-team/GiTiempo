import { createZodDto } from './../../common/zod-dto.js';
import { projectBillableDefaultBackfillResponseSchema } from '@gitiempo/shared';

export class ProjectBillableDefaultBackfillResponseDto extends createZodDto(
  projectBillableDefaultBackfillResponseSchema,
) {}

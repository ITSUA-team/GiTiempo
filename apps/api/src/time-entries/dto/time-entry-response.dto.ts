import { createZodDto } from './../../common/zod-dto.js';
import { timeEntryResponseSchema } from '@gitiempo/shared';

export class TimeEntryResponseDto extends createZodDto(
  timeEntryResponseSchema,
) {}

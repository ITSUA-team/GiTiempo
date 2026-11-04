import { createZodDto } from './../../common/zod-dto.js';
import { timeEntryListResponseSchema } from '@gitiempo/shared';

export class TimeEntryListResponseDto extends createZodDto(
  timeEntryListResponseSchema,
) {}

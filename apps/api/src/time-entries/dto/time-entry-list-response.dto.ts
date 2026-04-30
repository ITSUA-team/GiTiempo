import { createZodDto } from 'nestjs-zod';
import { timeEntryListResponseSchema } from '@gitiempo/shared';

export class TimeEntryListResponseDto extends createZodDto(
  timeEntryListResponseSchema,
) {}

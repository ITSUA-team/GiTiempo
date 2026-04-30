import { createZodDto } from 'nestjs-zod';
import { timeEntryResponseSchema } from '@gitiempo/shared';

export class TimeEntryResponseDto extends createZodDto(
  timeEntryResponseSchema,
) {}

import { createZodDto } from 'nestjs-zod';
import { timeEntryListQuerySchema } from '@gitiempo/shared';

export class TimeEntryListQueryDto extends createZodDto(
  timeEntryListQuerySchema,
) {}

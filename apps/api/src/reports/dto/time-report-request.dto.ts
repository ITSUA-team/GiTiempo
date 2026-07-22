import { createZodDto } from 'nestjs-zod';
import { timeReportRequestSchema } from '@gitiempo/shared';

export class TimeReportRequestDto extends createZodDto(
  timeReportRequestSchema,
) {}

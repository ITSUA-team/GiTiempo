import { createZodDto } from 'nestjs-zod';
import { timeReportResponseSchema } from '@gitiempo/shared';

export class TimeReportResponseDto extends createZodDto(
  timeReportResponseSchema,
) {}

import { createZodDto } from 'nestjs-zod';
import { timeReportExportRequestSchema } from '@gitiempo/shared';

export class TimeReportExportRequestDto extends createZodDto(
  timeReportExportRequestSchema,
) {}

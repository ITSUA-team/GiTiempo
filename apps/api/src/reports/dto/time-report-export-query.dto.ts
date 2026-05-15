import { createZodDto } from 'nestjs-zod';
import { timeReportExportQuerySchema } from '@gitiempo/shared';

export class TimeReportExportQueryDto extends createZodDto(
  timeReportExportQuerySchema,
) {}

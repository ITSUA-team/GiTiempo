import { createZodDto } from 'nestjs-zod';
import { reportPdfExportRequestSchema } from '@gitiempo/shared';

export class ReportPdfExportRequestDto extends createZodDto(
  reportPdfExportRequestSchema,
) {}

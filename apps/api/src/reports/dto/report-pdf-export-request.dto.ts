import { createZodDto } from './../../common/zod-dto.js';
import { reportPdfExportRequestSchema } from '@gitiempo/shared';

export class ReportPdfExportRequestDto extends createZodDto(
  reportPdfExportRequestSchema,
) {}

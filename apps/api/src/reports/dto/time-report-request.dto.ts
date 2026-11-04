import { createZodDto } from './../../common/zod-dto.js';
import { timeReportRequestSchema } from '@gitiempo/shared';

export class TimeReportRequestDto extends createZodDto(
  timeReportRequestSchema,
) {}

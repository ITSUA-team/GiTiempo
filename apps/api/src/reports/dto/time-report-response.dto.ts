import { createZodDto } from './../../common/zod-dto.js';
import { timeReportResponseSchema } from '@gitiempo/shared';

export class TimeReportResponseDto extends createZodDto(
  timeReportResponseSchema,
) {}

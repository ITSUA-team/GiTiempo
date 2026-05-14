import { createZodDto } from 'nestjs-zod';
import { timeReportQuerySchema } from '@gitiempo/shared';

export class TimeReportQueryDto extends createZodDto(timeReportQuerySchema) {}

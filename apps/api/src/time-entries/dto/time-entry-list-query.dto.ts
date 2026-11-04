import { createZodDto } from './../../common/zod-dto.js';
import { timeEntryListQuerySchema } from '@gitiempo/shared';

export class TimeEntryListQueryDto extends createZodDto(
  timeEntryListQuerySchema,
) {}

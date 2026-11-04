import { createZodDto } from './../../common/zod-dto.js';
import { backfillTaskBillableDefaultSchema } from '@gitiempo/shared';

export class BackfillTaskBillableDefaultDto extends createZodDto(
  backfillTaskBillableDefaultSchema,
) {}

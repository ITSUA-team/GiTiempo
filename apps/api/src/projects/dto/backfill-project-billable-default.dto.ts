import { createZodDto } from './../../common/zod-dto.js';
import { backfillProjectBillableDefaultSchema } from '@gitiempo/shared';

export class BackfillProjectBillableDefaultDto extends createZodDto(
  backfillProjectBillableDefaultSchema,
) {}

import { createZodDto } from 'nestjs-zod';
import { backfillProjectBillableDefaultSchema } from '@gitiempo/shared';

export class BackfillProjectBillableDefaultDto extends createZodDto(
  backfillProjectBillableDefaultSchema,
) {}

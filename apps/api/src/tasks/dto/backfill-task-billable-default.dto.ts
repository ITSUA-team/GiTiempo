import { createZodDto } from 'nestjs-zod';
import { backfillTaskBillableDefaultSchema } from '@gitiempo/shared';

export class BackfillTaskBillableDefaultDto extends createZodDto(
  backfillTaskBillableDefaultSchema,
) {}

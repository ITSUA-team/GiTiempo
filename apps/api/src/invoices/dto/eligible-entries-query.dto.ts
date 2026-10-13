import { createZodDto } from 'nestjs-zod';
import { eligibleEntriesQuerySchema } from '@gitiempo/shared';

export class EligibleEntriesQueryDto extends createZodDto(
  eligibleEntriesQuerySchema,
) {}

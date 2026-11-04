import { createZodDto } from './../../common/zod-dto.js';
import { eligibleEntriesQuerySchema } from '@gitiempo/shared';

export class EligibleEntriesQueryDto extends createZodDto(
  eligibleEntriesQuerySchema,
) {}

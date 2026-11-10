import { createZodDto } from './../../common/zod-dto.js';
import { eligibleEntriesResponseSchema } from '@gitiempo/shared';

export class EligibleEntriesResponseDto extends createZodDto(
  eligibleEntriesResponseSchema,
) {}

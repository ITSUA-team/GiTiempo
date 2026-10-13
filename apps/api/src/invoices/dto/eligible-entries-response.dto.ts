import { createZodDto } from 'nestjs-zod';
import { eligibleEntriesResponseSchema } from '@gitiempo/shared';

export class EligibleEntriesResponseDto extends createZodDto(
  eligibleEntriesResponseSchema,
) {}

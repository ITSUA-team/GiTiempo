import { createZodDto } from 'nestjs-zod';
import { currentTimeEntryResponseSchema } from '@gitiempo/shared';

export class CurrentTimeEntryResponseDto extends createZodDto(
  currentTimeEntryResponseSchema,
) {}

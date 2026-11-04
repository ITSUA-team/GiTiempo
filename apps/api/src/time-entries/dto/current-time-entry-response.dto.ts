import { createZodDto } from './../../common/zod-dto.js';
import { currentTimeEntryResponseSchema } from '@gitiempo/shared';

export class CurrentTimeEntryResponseDto extends createZodDto(
  currentTimeEntryResponseSchema,
) {}

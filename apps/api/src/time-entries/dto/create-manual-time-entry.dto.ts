import { createZodDto } from './../../common/zod-dto.js';
import { createManualTimeEntrySchema } from '@gitiempo/shared';

export class CreateManualTimeEntryDto extends createZodDto(
  createManualTimeEntrySchema,
) {}

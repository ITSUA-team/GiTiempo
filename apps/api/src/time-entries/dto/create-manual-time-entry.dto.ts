import { createZodDto } from 'nestjs-zod';
import { createManualTimeEntrySchema } from '@gitiempo/shared';

export class CreateManualTimeEntryDto extends createZodDto(
  createManualTimeEntrySchema,
) {}

import { createZodDto } from 'nestjs-zod';
import { updateTimeEntrySchema } from '@gitiempo/shared';

export class UpdateTimeEntryDto extends createZodDto(updateTimeEntrySchema) {}

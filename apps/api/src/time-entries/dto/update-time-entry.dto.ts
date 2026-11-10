import { createZodDto } from './../../common/zod-dto.js';
import { updateTimeEntrySchema } from '@gitiempo/shared';

export class UpdateTimeEntryDto extends createZodDto(updateTimeEntrySchema) {}

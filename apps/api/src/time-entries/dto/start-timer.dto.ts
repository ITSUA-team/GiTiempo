import { createZodDto } from './../../common/zod-dto.js';
import { startTimerSchema } from '@gitiempo/shared';

export class StartTimerDto extends createZodDto(startTimerSchema) {}

import { createZodDto } from './../../common/zod-dto.js';
import { stopTimerSchema } from '@gitiempo/shared';

export class StopTimerDto extends createZodDto(stopTimerSchema) {}

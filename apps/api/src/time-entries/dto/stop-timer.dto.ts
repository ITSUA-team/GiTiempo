import { createZodDto } from 'nestjs-zod';
import { stopTimerSchema } from '@gitiempo/shared';

export class StopTimerDto extends createZodDto(stopTimerSchema) {}

import { createZodDto } from 'nestjs-zod';
import { startTimerSchema } from '@gitiempo/shared';

export class StartTimerDto extends createZodDto(startTimerSchema) {}

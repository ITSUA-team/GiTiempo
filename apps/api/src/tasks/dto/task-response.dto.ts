import { createZodDto } from 'nestjs-zod';
import { taskResponseSchema } from '@gitiempo/shared';

export class TaskResponseDto extends createZodDto(taskResponseSchema) {}

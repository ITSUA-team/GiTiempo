import { createZodDto } from 'nestjs-zod';
import { taskListResponseSchema } from '@gitiempo/shared';

export class TaskListResponseDto extends createZodDto(taskListResponseSchema) {}

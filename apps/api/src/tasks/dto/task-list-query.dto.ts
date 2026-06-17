import { createZodDto } from 'nestjs-zod';
import { taskListQuerySchema } from '@gitiempo/shared';

export class TaskListQueryDto extends createZodDto(taskListQuerySchema) {}

import { createZodDto } from './../../common/zod-dto.js';
import { taskListQuerySchema } from '@gitiempo/shared';

export class TaskListQueryDto extends createZodDto(taskListQuerySchema) {}

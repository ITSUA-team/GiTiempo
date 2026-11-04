import { createZodDto } from './../../common/zod-dto.js';
import { taskListResponseSchema } from '@gitiempo/shared';

export class TaskListResponseDto extends createZodDto(taskListResponseSchema) {}

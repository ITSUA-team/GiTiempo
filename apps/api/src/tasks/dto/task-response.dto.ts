import { createZodDto } from './../../common/zod-dto.js';
import { taskResponseSchema } from '@gitiempo/shared';

export class TaskResponseDto extends createZodDto(taskResponseSchema) {}

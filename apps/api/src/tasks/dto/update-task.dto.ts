import { createZodDto } from './../../common/zod-dto.js';
import { updateTaskSchema } from '@gitiempo/shared';

export class UpdateTaskDto extends createZodDto(updateTaskSchema) {}

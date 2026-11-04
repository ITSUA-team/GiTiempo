import { createZodDto } from './../../common/zod-dto.js';
import { createTaskSchema } from '@gitiempo/shared';

export class CreateTaskDto extends createZodDto(createTaskSchema) {}

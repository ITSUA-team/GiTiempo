import { createZodDto } from 'nestjs-zod';
import { updateTaskSchema } from '@gitiempo/shared';

export class UpdateTaskDto extends createZodDto(updateTaskSchema) {}

import { createZodDto } from 'nestjs-zod';
import { createTaskSchema } from '@gitiempo/shared';

export class CreateTaskDto extends createZodDto(createTaskSchema) {}

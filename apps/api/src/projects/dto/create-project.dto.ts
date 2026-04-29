import { createZodDto } from 'nestjs-zod';
import { createProjectSchema } from '@gitiempo/shared';

export class CreateProjectDto extends createZodDto(createProjectSchema) {}

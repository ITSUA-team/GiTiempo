import { createZodDto } from 'nestjs-zod';
import { projectResponseSchema } from '@gitiempo/shared';

export class ProjectResponseDto extends createZodDto(projectResponseSchema) {}

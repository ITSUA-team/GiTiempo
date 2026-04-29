import { createZodDto } from 'nestjs-zod';
import { projectListResponseSchema } from '@gitiempo/shared';

export class ProjectListResponseDto extends createZodDto(
  projectListResponseSchema,
) {}

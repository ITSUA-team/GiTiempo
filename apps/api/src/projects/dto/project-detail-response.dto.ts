import { createZodDto } from 'nestjs-zod';
import { projectDetailResponseSchema } from '@gitiempo/shared';

export class ProjectDetailResponseDto extends createZodDto(
  projectDetailResponseSchema,
) {}

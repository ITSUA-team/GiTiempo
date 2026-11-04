import { createZodDto } from './../../common/zod-dto.js';
import { projectDetailResponseSchema } from '@gitiempo/shared';

export class ProjectDetailResponseDto extends createZodDto(
  projectDetailResponseSchema,
) {}

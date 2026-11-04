import { createZodDto } from './../../common/zod-dto.js';
import { projectListResponseSchema } from '@gitiempo/shared';

export class ProjectListResponseDto extends createZodDto(
  projectListResponseSchema,
) {}

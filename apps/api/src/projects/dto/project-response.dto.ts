import { createZodDto } from './../../common/zod-dto.js';
import { projectResponseSchema } from '@gitiempo/shared';

export class ProjectResponseDto extends createZodDto(projectResponseSchema) {}

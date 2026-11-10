import { createZodDto } from './../../common/zod-dto.js';
import { createProjectSchema } from '@gitiempo/shared';

export class CreateProjectDto extends createZodDto(createProjectSchema) {}

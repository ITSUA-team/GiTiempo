import { createZodDto } from './../../common/zod-dto.js';
import { updateProjectSchema } from '@gitiempo/shared';

export class UpdateProjectDto extends createZodDto(updateProjectSchema) {}

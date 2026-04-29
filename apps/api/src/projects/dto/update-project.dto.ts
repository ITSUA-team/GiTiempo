import { createZodDto } from 'nestjs-zod';
import { updateProjectSchema } from '@gitiempo/shared';

export class UpdateProjectDto extends createZodDto(updateProjectSchema) {}

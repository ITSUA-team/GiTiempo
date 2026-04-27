import { createZodDto } from 'nestjs-zod';
import { updateWorkspaceSchema } from '@gitiempo/shared';

export class UpdateWorkspaceDto extends createZodDto(updateWorkspaceSchema) {}

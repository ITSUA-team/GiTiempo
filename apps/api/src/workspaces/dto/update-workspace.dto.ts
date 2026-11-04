import { createZodDto } from './../../common/zod-dto.js';
import { updateWorkspaceSchema } from '@gitiempo/shared';

export class UpdateWorkspaceDto extends createZodDto(updateWorkspaceSchema) {}

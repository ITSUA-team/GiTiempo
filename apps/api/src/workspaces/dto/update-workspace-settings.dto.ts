import { createZodDto } from 'nestjs-zod';
import { updateWorkspaceSettingsSchema } from '@gitiempo/shared';

export class UpdateWorkspaceSettingsDto extends createZodDto(
  updateWorkspaceSettingsSchema,
) {}

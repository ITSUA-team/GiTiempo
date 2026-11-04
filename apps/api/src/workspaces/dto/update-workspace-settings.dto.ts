import { createZodDto } from './../../common/zod-dto.js';
import { updateWorkspaceSettingsSchema } from '@gitiempo/shared';

export class UpdateWorkspaceSettingsDto extends createZodDto(
  updateWorkspaceSettingsSchema,
) {}

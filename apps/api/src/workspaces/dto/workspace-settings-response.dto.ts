import { createZodDto } from './../../common/zod-dto.js';
import { workspaceSettingsResponseSchema } from '@gitiempo/shared';

export class WorkspaceSettingsResponseDto extends createZodDto(
  workspaceSettingsResponseSchema,
) {}

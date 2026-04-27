import { createZodDto } from 'nestjs-zod';
import { workspaceSettingsResponseSchema } from '@gitiempo/shared';

export class WorkspaceSettingsResponseDto extends createZodDto(
  workspaceSettingsResponseSchema,
) {}

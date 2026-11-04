import { createZodDto } from './../../common/zod-dto.js';
import { switchWorkspaceRequestSchema } from '@gitiempo/shared';

export class SwitchWorkspaceDto extends createZodDto(
  switchWorkspaceRequestSchema,
) {}

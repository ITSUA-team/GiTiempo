import { createZodDto } from 'nestjs-zod';
import { switchWorkspaceRequestSchema } from '@gitiempo/shared';

export class SwitchWorkspaceDto extends createZodDto(
  switchWorkspaceRequestSchema,
) {}

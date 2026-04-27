import { createZodDto } from 'nestjs-zod';
import { acceptWorkspaceInviteSchema } from '@gitiempo/shared';

export class AcceptWorkspaceInviteDto extends createZodDto(
  acceptWorkspaceInviteSchema,
) {}

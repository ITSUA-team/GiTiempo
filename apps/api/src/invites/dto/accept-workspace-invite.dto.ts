import { createZodDto } from './../../common/zod-dto.js';
import { acceptWorkspaceInviteSchema } from '@gitiempo/shared';

export class AcceptWorkspaceInviteDto extends createZodDto(
  acceptWorkspaceInviteSchema,
) {}

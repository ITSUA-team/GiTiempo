import { createZodDto } from './../../common/zod-dto.js';
import { currentUserWorkspaceMembershipListResponseSchema } from '@gitiempo/shared';

export class CurrentUserWorkspaceMembershipListResponseDto extends createZodDto(
  currentUserWorkspaceMembershipListResponseSchema,
) {}

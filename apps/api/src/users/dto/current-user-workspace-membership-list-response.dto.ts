import { createZodDto } from 'nestjs-zod';
import { currentUserWorkspaceMembershipListResponseSchema } from '@gitiempo/shared';

export class CurrentUserWorkspaceMembershipListResponseDto extends createZodDto(
  currentUserWorkspaceMembershipListResponseSchema,
) {}

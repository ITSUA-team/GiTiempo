import { createZodDto } from './../../common/zod-dto.js';
import { identityRecoveryResolveRequestSchema } from '@gitiempo/shared';

/** Body for `POST /auth/identity-recovery/resolve`. */
export class IdentityRecoveryResolveRequestDto extends createZodDto(
  identityRecoveryResolveRequestSchema,
) {}

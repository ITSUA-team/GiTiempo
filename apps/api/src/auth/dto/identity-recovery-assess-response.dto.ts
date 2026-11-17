import { createZodDto } from './../../common/zod-dto.js';
import { identityRecoveryAssessResponseSchema } from '@gitiempo/shared';

/** Item of the `GET /auth/identity-recovery/assess` response. */
export class IdentityRecoveryAssessResponseDto extends createZodDto(
  identityRecoveryAssessResponseSchema,
) {}

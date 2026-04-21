import { createZodDto } from 'nestjs-zod';
import { tokenPairResponseSchema } from '@gitiempo/shared';

/** Response shape for `/auth/login` and `/auth/refresh`. */
export class TokenPairResponseDto extends createZodDto(
  tokenPairResponseSchema,
) {}

import { createZodDto } from './../../common/zod-dto.js';
import { updateUserSchema } from '@gitiempo/shared';

/**
 * Body for `PATCH /users/me`. Validated by the global ZodValidationPipe.
 */
export class UpdateUserDto extends createZodDto(updateUserSchema) {}

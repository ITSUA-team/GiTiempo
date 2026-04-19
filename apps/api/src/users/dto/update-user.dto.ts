import { createZodDto } from 'nestjs-zod';
import { updateUserSchema } from '@gitiempo/shared';

/**
 * Body for `PATCH /users/me`. Validated by the global ZodValidationPipe.
 */
export class UpdateUserDto extends createZodDto(updateUserSchema) {}

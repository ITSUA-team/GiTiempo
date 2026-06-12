import { createZodDto } from 'nestjs-zod';
import { registerRequestSchema } from '@gitiempo/shared';

/** Body for `POST /auth/register`. */
export class RegisterDto extends createZodDto(registerRequestSchema) {}

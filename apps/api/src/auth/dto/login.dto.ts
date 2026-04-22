import { createZodDto } from 'nestjs-zod';
import { loginRequestSchema } from '@gitiempo/shared';

/** Body for `POST /auth/login`. */
export class LoginDto extends createZodDto(loginRequestSchema) {}

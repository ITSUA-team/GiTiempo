import { createZodDto } from './../../common/zod-dto.js';
import { loginRequestSchema } from '@gitiempo/shared';

/** Body for `POST /auth/login`. */
export class LoginDto extends createZodDto(loginRequestSchema) {}

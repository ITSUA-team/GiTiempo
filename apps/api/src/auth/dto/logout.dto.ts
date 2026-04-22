import { createZodDto } from 'nestjs-zod';
import { logoutRequestSchema } from '@gitiempo/shared';

/** Body for `POST /auth/logout`. */
export class LogoutDto extends createZodDto(logoutRequestSchema) {}

import { createZodDto } from 'nestjs-zod';
import { refreshRequestSchema } from '@gitiempo/shared';

/** Body for `POST /auth/refresh`. */
export class RefreshDto extends createZodDto(refreshRequestSchema) {}

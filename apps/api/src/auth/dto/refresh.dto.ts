import { createZodDto } from './../../common/zod-dto.js';
import { refreshRequestSchema } from '@gitiempo/shared';

/** Body for `POST /auth/refresh`. */
export class RefreshDto extends createZodDto(refreshRequestSchema) {}

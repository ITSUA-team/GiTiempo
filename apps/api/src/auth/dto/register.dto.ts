import { createZodDto } from './../../common/zod-dto.js';
import { registerRequestSchema } from '@gitiempo/shared';

export class RegisterDto extends createZodDto(registerRequestSchema) {}

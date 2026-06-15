import { createZodDto } from 'nestjs-zod';
import { registerRequestSchema } from '@gitiempo/shared';

export class RegisterDto extends createZodDto(registerRequestSchema) {}

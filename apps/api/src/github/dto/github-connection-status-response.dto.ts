import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { githubConnectionStatusResponseSchema } from '@gitiempo/shared';

export class GithubConnectionStatusResponseDto extends createZodDto(
  githubConnectionStatusResponseSchema as unknown as z.ZodObject<z.ZodRawShape>,
) {}

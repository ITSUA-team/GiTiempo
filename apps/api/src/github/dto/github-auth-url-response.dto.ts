import { createZodDto } from 'nestjs-zod';
import { githubAuthUrlResponseSchema } from '@gitiempo/shared';

export class GithubAuthUrlResponseDto extends createZodDto(
  githubAuthUrlResponseSchema,
) {}

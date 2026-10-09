import { createZodDto } from 'nestjs-zod';
import { githubDisconnectResponseSchema } from '@gitiempo/shared';

export class GithubDisconnectResponseDto extends createZodDto(
  githubDisconnectResponseSchema,
) {}

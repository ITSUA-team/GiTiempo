import { createZodDto } from 'nestjs-zod';
import { githubSessionRequestSchema } from '@gitiempo/shared';

/** Body for `POST /auth/github/session`: the one-time handoff code. */
export class GithubSessionDto extends createZodDto(
  githubSessionRequestSchema,
) {}

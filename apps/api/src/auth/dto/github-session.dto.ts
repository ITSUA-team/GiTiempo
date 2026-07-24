import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/** Body for `POST /auth/github/session`: the one-time handoff code. */
export const githubSessionRequestSchema = z
  .object({
    code: z.string().min(1).max(4096),
  })
  .strict();

export class GithubSessionDto extends createZodDto(
  githubSessionRequestSchema,
) {}

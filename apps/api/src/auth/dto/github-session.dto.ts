import { createZodDto } from 'nestjs-zod';
import { githubSessionRequestSchema } from '@gitiempo/shared';

/**
 * Body for `POST /auth/github/session`: the one-time handoff code, plus the
 * `verifier` proving possession for a transaction bound by a challenge. Web
 * clients omit it — their transaction is bound by the state cookie instead — but
 * a challenged handoff is refused without it. See the shared schema for why the
 * verifier's encoding is the client's to choose.
 */
export class GithubSessionDto extends createZodDto(
  githubSessionRequestSchema,
) {}

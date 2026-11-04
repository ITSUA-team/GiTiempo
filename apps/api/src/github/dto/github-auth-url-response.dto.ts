import { createZodDto } from './../../common/zod-dto.js';
import { githubAuthUrlResponseSchema } from '@gitiempo/shared';

export class GithubAuthUrlResponseDto extends createZodDto(
  githubAuthUrlResponseSchema,
) {}

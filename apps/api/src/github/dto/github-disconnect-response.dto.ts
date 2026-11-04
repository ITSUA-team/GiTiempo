import { createZodDto } from './../../common/zod-dto.js';
import { githubDisconnectResponseSchema } from '@gitiempo/shared';

export class GithubDisconnectResponseDto extends createZodDto(
  githubDisconnectResponseSchema,
) {}

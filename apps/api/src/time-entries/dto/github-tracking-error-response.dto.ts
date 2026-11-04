import { githubTrackingErrorSchema } from '@gitiempo/shared';
import { createZodDto } from './../../common/zod-dto.js';

export class GitHubTrackingErrorResponseDto extends createZodDto(
  githubTrackingErrorSchema,
) {}

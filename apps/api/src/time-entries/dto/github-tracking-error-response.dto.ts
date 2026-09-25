import { githubTrackingErrorSchema } from '@gitiempo/shared';
import { createZodDto } from 'nestjs-zod';

export class GitHubTrackingErrorResponseDto extends createZodDto(
  githubTrackingErrorSchema,
) {}

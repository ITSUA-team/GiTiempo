import { createZodDto } from 'nestjs-zod';
import { startTimerFromGitHubReferenceSchema } from '@gitiempo/shared';

export class StartTimerFromGitHubReferenceDto extends createZodDto(
  startTimerFromGitHubReferenceSchema,
) {}

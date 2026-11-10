import { createZodDto } from './../../common/zod-dto.js';
import { startTimerFromGitHubReferenceSchema } from '@gitiempo/shared';

export class StartTimerFromGitHubReferenceDto extends createZodDto(
  startTimerFromGitHubReferenceSchema,
) {}

import { createZodDto } from './../../common/zod-dto.js';
import { startTimerFromGitHubSchema } from '@gitiempo/shared';

export class StartTimerFromGitHubDto extends createZodDto(
  startTimerFromGitHubSchema,
) {}

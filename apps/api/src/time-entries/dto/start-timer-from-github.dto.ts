import { createZodDto } from 'nestjs-zod';
import { startTimerFromGitHubSchema } from '@gitiempo/shared';

export class StartTimerFromGitHubDto extends createZodDto(
  startTimerFromGitHubSchema,
) {}

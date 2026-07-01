import { createZodDto } from 'nestjs-zod';
import { ensureGitHubIssueTaskSchema } from '@gitiempo/shared';

export class EnsureGitHubIssueTaskDto extends createZodDto(
  ensureGitHubIssueTaskSchema,
) {}

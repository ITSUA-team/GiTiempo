import { createZodDto } from './../../common/zod-dto.js';
import { ensureGitHubIssueTaskSchema } from '@gitiempo/shared';

export class EnsureGitHubIssueTaskDto extends createZodDto(
  ensureGitHubIssueTaskSchema,
) {}

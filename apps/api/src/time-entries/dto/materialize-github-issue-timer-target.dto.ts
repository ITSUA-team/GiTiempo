import { createZodDto } from 'nestjs-zod';
import {
  githubIssueTimerTargetResponseSchema,
  materializeGitHubIssueTimerTargetSchema,
} from '@gitiempo/shared';

export class MaterializeGitHubIssueTimerTargetDto extends createZodDto(
  materializeGitHubIssueTimerTargetSchema,
) {}

export class GitHubIssueTimerTargetResponseDto extends createZodDto(
  githubIssueTimerTargetResponseSchema,
) {}

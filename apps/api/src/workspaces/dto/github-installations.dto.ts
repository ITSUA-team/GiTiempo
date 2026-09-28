import { createZodDto } from 'nestjs-zod';
import {
  githubInstallationAssociationParamsSchema,
  githubInstallationCompleteRequestSchema,
  githubInstallationSetupRequestSchema,
  githubInstallationSetupResponseSchema,
  workspaceGitHubInstallationListSchema,
  workspaceGitHubInstallationSchema,
} from '@gitiempo/shared';

export class GithubInstallationAssociationParamsDto extends createZodDto(
  githubInstallationAssociationParamsSchema,
) {}

export class GithubInstallationSetupDto extends createZodDto(
  githubInstallationSetupRequestSchema,
) {}
export class GithubInstallationSetupResponseDto extends createZodDto(
  githubInstallationSetupResponseSchema,
) {}
export class GithubInstallationCompleteDto extends createZodDto(
  githubInstallationCompleteRequestSchema,
) {}
export class WorkspaceGithubInstallationDto extends createZodDto(
  workspaceGitHubInstallationSchema,
) {}
export class WorkspaceGithubInstallationListDto extends createZodDto(
  workspaceGitHubInstallationListSchema,
) {}

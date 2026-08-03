import { createZodDto } from 'nestjs-zod';
import {
  importGitHubProjectsResponseSchema,
  importGitHubProjectsSchema,
  projectGitHubProjectListResponseSchema,
  importGitHubRepositoriesResponseSchema,
  importGitHubRepositoriesSchema,
  projectGitHubRepositoryListResponseSchema,
} from '@gitiempo/shared';

export class ImportGitHubRepositoriesDto extends createZodDto(
  importGitHubRepositoriesSchema,
) {}

export class ImportGitHubRepositoriesResponseDto extends createZodDto(
  importGitHubRepositoriesResponseSchema,
) {}

export class ProjectGitHubRepositoryListResponseDto extends createZodDto(
  projectGitHubRepositoryListResponseSchema,
) {}

export class ImportGitHubProjectsDto extends createZodDto(
  importGitHubProjectsSchema,
) {}

export class ImportGitHubProjectsResponseDto extends createZodDto(
  importGitHubProjectsResponseSchema,
) {}

export class ProjectGitHubProjectListResponseDto extends createZodDto(
  projectGitHubProjectListResponseSchema,
) {}

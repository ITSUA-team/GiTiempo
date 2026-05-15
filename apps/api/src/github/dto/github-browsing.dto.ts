import { createZodDto } from 'nestjs-zod';
import {
  githubIssueListQuerySchema,
  githubOwnerListQuerySchema,
  githubOwnerListResponseSchema,
  githubProjectIssueListResponseSchema,
  githubProjectListQuerySchema,
  githubProjectListResponseSchema,
  githubRepositoryIssueListResponseSchema,
  githubRepositoryListQuerySchema,
  githubRepositoryListResponseSchema,
} from '@gitiempo/shared';

export class GithubOwnerListQueryDto extends createZodDto(
  githubOwnerListQuerySchema,
) {}

export class GithubOwnerListResponseDto extends createZodDto(
  githubOwnerListResponseSchema,
) {}

export class GithubRepositoryListQueryDto extends createZodDto(
  githubRepositoryListQuerySchema,
) {}

export class GithubRepositoryListResponseDto extends createZodDto(
  githubRepositoryListResponseSchema,
) {}

export class GithubProjectListQueryDto extends createZodDto(
  githubProjectListQuerySchema,
) {}

export class GithubProjectListResponseDto extends createZodDto(
  githubProjectListResponseSchema,
) {}

export class GithubIssueListQueryDto extends createZodDto(
  githubIssueListQuerySchema,
) {}

export class GithubRepositoryIssueListResponseDto extends createZodDto(
  githubRepositoryIssueListResponseSchema,
) {}

export class GithubProjectIssueListResponseDto extends createZodDto(
  githubProjectIssueListResponseSchema,
) {}

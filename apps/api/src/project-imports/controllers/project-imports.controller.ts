import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user';
import {
  ImportGitHubProjectsDto,
  ImportGitHubProjectsResponseDto,
  ProjectGitHubProjectListResponseDto,
  ImportGitHubRepositoriesDto,
  ImportGitHubRepositoriesResponseDto,
  ProjectGitHubRepositoryListResponseDto,
} from '../import-github-repositories.dto';
import { ProjectImportsService } from '../services/project-imports.service';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectImportsController {
  constructor(private readonly projectImports: ProjectImportsService) {}

  @Get('github/projects')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List GitHub projects already imported',
  })
  @ApiOkResponse({ type: ProjectGitHubProjectListResponseDto })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  @ZodSerializerDto(ProjectGitHubProjectListResponseDto)
  listImportedGitHubProjects(
    @CurrentUser() user: AuthUser,
  ): Promise<ProjectGitHubProjectListResponseDto> {
    return this.projectImports.listImportedGitHubProjects(user);
  }

  @Post('import/github-projects')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Import GitHub projects as GiTiempo projects',
    description: [
      'Each project owner is asserted against the workspace GitHub organization',
      'policy before anything is written. A GitHub project already imported is',
      'reported as already-imported and its GiTiempo project is left untouched.',
    ].join(' '),
  })
  @ApiOkResponse({ type: ImportGitHubProjectsResponseDto })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  @ZodSerializerDto(ImportGitHubProjectsResponseDto)
  importGitHubProjects(
    @CurrentUser() user: AuthUser,
    @Body() body: ImportGitHubProjectsDto,
  ): Promise<ImportGitHubProjectsResponseDto> {
    return this.projectImports.importGitHubProjects(user, body);
  }

  @Get('github/repositories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List GitHub repositories already imported as projects',
  })
  @ApiOkResponse({ type: ProjectGitHubRepositoryListResponseDto })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  @ZodSerializerDto(ProjectGitHubRepositoryListResponseDto)
  listImportedGitHubRepositories(
    @CurrentUser() user: AuthUser,
  ): Promise<ProjectGitHubRepositoryListResponseDto> {
    return this.projectImports.listImportedGitHubRepositories(user);
  }

  @Post('import/github')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Import GitHub repositories as projects',
    description: [
      'Each repository is verified against the caller GitHub connection and the',
      'workspace organization policy before anything is written. A repository',
      'already imported is reported as already-imported and its project is left',
      'untouched. Failures are reported per repository rather than aborting the',
      'batch.',
    ].join(' '),
  })
  @ApiOkResponse({ type: ImportGitHubRepositoriesResponseDto })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  @ZodSerializerDto(ImportGitHubRepositoriesResponseDto)
  importGitHubRepositories(
    @CurrentUser() user: AuthUser,
    @Body() body: ImportGitHubRepositoriesDto,
  ): Promise<ImportGitHubRepositoriesResponseDto> {
    return this.projectImports.importGitHubRepositories(user, body);
  }
}

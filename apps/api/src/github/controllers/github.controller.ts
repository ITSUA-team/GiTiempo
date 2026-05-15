import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import type { Response } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SkipAuth } from '../../auth/decorators/skip-auth.decorator';
import type { AuthUser } from '../../auth/types/auth-user';
import { GithubAuthUrlResponseDto } from '../dto/github-auth-url-response.dto';
import {
  GithubIssueListQueryDto,
  GithubOwnerListQueryDto,
  GithubOwnerListResponseDto,
  GithubProjectIssueListResponseDto,
  GithubProjectListQueryDto,
  GithubProjectListResponseDto,
  GithubRepositoryIssueListResponseDto,
  GithubRepositoryListQueryDto,
  GithubRepositoryListResponseDto,
} from '../dto/github-browsing.dto';
import { GithubConnectionStatusResponseDto } from '../dto/github-connection-status-response.dto';
import { GithubService } from '../services/github.service';

@ApiTags('github')
@Controller('github')
export class GithubController {
  constructor(private readonly github: GithubService) {}

  @Get('connection')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current GitHub connection status' })
  @ApiOkResponse({ type: GithubConnectionStatusResponseDto })
  @ZodSerializerDto(GithubConnectionStatusResponseDto)
  connectionStatus(
    @CurrentUser() user: AuthUser,
  ): Promise<GithubConnectionStatusResponseDto> {
    return this.github.connectionStatus(user);
  }

  @Get('auth-url')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create GitHub OAuth authorization URL' })
  @ApiOkResponse({ type: GithubAuthUrlResponseDto })
  @ZodSerializerDto(GithubAuthUrlResponseDto)
  authUrl(@CurrentUser() user: AuthUser): Promise<GithubAuthUrlResponseDto> {
    return this.github.authUrl(user);
  }

  @Get('owners')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List GitHub owners available for browsing' })
  @ApiOkResponse({ type: GithubOwnerListResponseDto })
  @ZodSerializerDto(GithubOwnerListResponseDto)
  listOwners(
    @CurrentUser() user: AuthUser,
    @Query() query: GithubOwnerListQueryDto,
  ): Promise<GithubOwnerListResponseDto> {
    return this.github.listOwners(user, query);
  }

  @Get('repos')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List GitHub repositories for an owner scope' })
  @ApiOkResponse({ type: GithubRepositoryListResponseDto })
  @ZodSerializerDto(GithubRepositoryListResponseDto)
  listRepositories(
    @CurrentUser() user: AuthUser,
    @Query() query: GithubRepositoryListQueryDto,
  ): Promise<GithubRepositoryListResponseDto> {
    return this.github.listRepositories(user, query);
  }

  @Get('projects')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List GitHub Projects V2 for an owner scope' })
  @ApiOkResponse({ type: GithubProjectListResponseDto })
  @ZodSerializerDto(GithubProjectListResponseDto)
  listProjects(
    @CurrentUser() user: AuthUser,
    @Query() query: GithubProjectListQueryDto,
  ): Promise<GithubProjectListResponseDto> {
    return this.github.listProjects(user, query);
  }

  @Get('repos/:owner/:repo/issues')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List GitHub repository issues' })
  @ApiOkResponse({ type: GithubRepositoryIssueListResponseDto })
  @ZodSerializerDto(GithubRepositoryIssueListResponseDto)
  listRepositoryIssues(
    @CurrentUser() user: AuthUser,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query() query: GithubIssueListQueryDto,
  ): Promise<GithubRepositoryIssueListResponseDto> {
    return this.github.listRepositoryIssues(user, owner, repo, query);
  }

  @Get('projects/:projectId/issues')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List GitHub Project V2 issue items' })
  @ApiOkResponse({ type: GithubProjectIssueListResponseDto })
  @ZodSerializerDto(GithubProjectIssueListResponseDto)
  listProjectIssues(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Query() query: GithubIssueListQueryDto,
  ): Promise<GithubProjectIssueListResponseDto> {
    return this.github.listProjectIssues(user, projectId, query);
  }

  @Get('callback')
  @SkipAuth()
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const redirect = await this.github.completeCallback({ code, state, error });
    response.redirect(302, redirect);
  }

  @Delete('connection')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect GitHub account' })
  @ApiNoContentResponse()
  disconnect(@CurrentUser() user: AuthUser): Promise<void> {
    return this.github.disconnect(user);
  }
}

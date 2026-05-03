import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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

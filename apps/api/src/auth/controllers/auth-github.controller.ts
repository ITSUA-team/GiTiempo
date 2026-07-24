import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { SkipAuth } from '../decorators/skip-auth.decorator';
import { GithubSessionDto } from '../dto/github-session.dto';
import { TokenPairResponseDto } from '../dto/token-pair-response.dto';
import {
  AuthGithubService,
  type GithubLoginApp,
} from '../services/auth-github.service';

@ApiTags('auth')
@Controller('auth/github')
export class AuthGithubController {
  constructor(private readonly github: AuthGithubService) {}

  @Get('start')
  @SkipAuth()
  @ApiOperation({ summary: 'Start backend GitHub sign-in' })
  start(
    @Query('app') app: string | undefined,
    @Res() response: Response,
  ): void {
    const target: GithubLoginApp = app === 'admin' ? 'admin' : 'user';
    response.redirect(302, this.github.buildStartUrl(target));
  }

  @Get('callback')
  @SkipAuth()
  @ApiOperation({ summary: 'GitHub sign-in OAuth callback' })
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const redirect = await this.github.completeCallback({ code, state, error });
    response.redirect(302, redirect);
  }

  @Post('session')
  @SkipAuth()
  @ApiOperation({
    summary: 'Exchange a GitHub sign-in handoff code for a session',
  })
  @ApiOkResponse({ type: TokenPairResponseDto })
  @ZodSerializerDto(TokenPairResponseDto)
  session(@Body() body: GithubSessionDto): Promise<TokenPairResponseDto> {
    return this.github.exchangeSession(body.code);
  }
}

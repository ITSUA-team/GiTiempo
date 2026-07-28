import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { SkipAuth } from '../decorators/skip-auth.decorator';
import { GithubSessionDto } from '../dto/github-session.dto';
import { TokenPairResponseDto } from '../dto/token-pair-response.dto';
import {
  AuthGithubService,
  GITHUB_OAUTH_STATE_COOKIE,
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
    const { url, stateNonce } = this.github.startAuthorization(target);
    // Bind the transaction to this browser: the callback is only honored when it
    // presents this HttpOnly cookie whose nonce matches the signed state.
    response.cookie(
      GITHUB_OAUTH_STATE_COOKIE,
      stateNonce,
      this.github.stateCookieOptions(),
    );
    response.redirect(302, url);
  }

  @Get('callback')
  @SkipAuth()
  @ApiOperation({ summary: 'GitHub sign-in OAuth callback' })
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const cookies = request.cookies as Record<string, string> | undefined;
    const stateNonce = cookies?.[GITHUB_OAUTH_STATE_COOKIE];
    // Single-use: consume the binding cookie so the callback cannot be replayed.
    response.clearCookie(GITHUB_OAUTH_STATE_COOKIE, {
      path: this.github.stateCookieOptions().path,
    });
    const redirect = await this.github.completeCallback({
      code,
      state,
      error,
      stateNonce,
    });
    response.redirect(302, redirect);
  }

  @Post('session')
  @HttpCode(HttpStatus.OK)
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

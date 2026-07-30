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
import {
  ApiFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { SkipAuth } from '../decorators/skip-auth.decorator';
import { GithubSessionDto } from '../dto/github-session.dto';
import { TokenPairResponseDto } from '../dto/token-pair-response.dto';
import {
  AuthGithubService,
  GITHUB_OAUTH_STATE_COOKIE,
  parseGithubLoginApp,
} from '../services/auth-github.service';

@ApiTags('auth')
@Controller('auth/github')
export class AuthGithubController {
  constructor(private readonly github: AuthGithubService) {}

  @Get('start')
  @SkipAuth()
  @ApiOperation({ summary: 'Start backend GitHub sign-in' })
  @ApiQuery({
    name: 'app',
    required: false,
    enum: ['user', 'admin', 'extension'],
    description:
      'Which client started the flow. An absent or unrecognized value resolves to `user`. `extension` returns the outcome to the configured browser-extension destination instead of a web app route.',
  })
  @ApiQuery({
    name: 'redirect',
    required: false,
    type: String,
    description:
      'Same-app absolute path to return to after sign-in. Re-sanitized server-side, then signed into the OAuth state. Ignored for the `extension` target, which has no in-app route to return to.',
  })
  @ApiQuery({
    name: 'challenge',
    required: false,
    type: String,
    description:
      'Hex SHA-256 of a secret the client keeps. **Required for the `extension` target** and ignored otherwise: that target cannot be bound by the state cookie, so it proves possession of the matching verifier when exchanging the handoff code.',
  })
  @ApiFoundResponse({
    description:
      'Redirect to the GitHub authorization page. Never returns a body.',
    headers: {
      Location: {
        description: 'GitHub authorization URL.',
        schema: { type: 'string' },
      },
      'Set-Cookie': {
        description:
          '`gh_oauth_state` nonce (HttpOnly, SameSite=Lax) that binds the transaction to this browser.',
        schema: { type: 'string' },
      },
    },
  })
  start(
    @Query('app') app: string | undefined,
    @Query('redirect') redirect: string | undefined,
    @Query('challenge') challenge: string | undefined,
    @Res() response: Response,
  ): void {
    const target = parseGithubLoginApp(app);
    // The SPA forwards its normalized protected-route target so the callback can
    // return the user there after sign-in; the service re-sanitizes it.
    const { url, stateNonce } = this.github.startAuthorization(
      target,
      redirect,
      challenge,
    );
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
  @ApiQuery({
    name: 'code',
    required: false,
    type: String,
    description:
      'GitHub authorization code. Absent when the user denied the request.',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    type: String,
    description:
      'Signed state minted by `/auth/github/start`. Its `app` claim decides which client to return to.',
  })
  @ApiQuery({
    name: 'error',
    required: false,
    type: String,
    description: 'GitHub error code, present when the user denied the request.',
  })
  @ApiFoundResponse({
    description:
      'Redirect back to the originating SPA. On success to its `/auth/github/callback` with a single-use handoff `code`; otherwise to its `/login` with `githubError` set to `denied`, `state`, `email`, or `failed`. Never returns a body, and never fails the request.',
    headers: {
      Location: {
        description: 'Absolute SPA URL to return the browser to.',
        schema: { type: 'string' },
      },
      'Set-Cookie': {
        description:
          'Cleared `gh_oauth_state` cookie — the state binding is single-use.',
        schema: { type: 'string' },
      },
    },
  })
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
    return this.github.exchangeSession(body.code, body.verifier);
  }
}

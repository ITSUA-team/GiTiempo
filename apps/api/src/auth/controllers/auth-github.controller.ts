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
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { SkipAuth } from '../decorators/skip-auth.decorator';
import { GithubSessionDto } from '../dto/github-session.dto';
import { TokenPairResponseDto } from '../dto/token-pair-response.dto';
import {
  AuthGithubService,
  GITHUB_OAUTH_STATE_COOKIE,
  parseGithubExtensionBrowser,
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
    name: 'browser',
    required: false,
    enum: ['chrome', 'firefox'],
    description:
      'Which browser the `extension` target began in, selecting between destinations the operator configured. An absent or unrecognized value resolves to `chrome`. Ignored for web targets. It names a configured destination rather than supplying one, so the callback still only ever redirects to a URL the server owns.',
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
          '`gh_oauth_state` nonce (HttpOnly, SameSite=Lax) that binds the transaction to the browser. **Web targets only.** The `extension` target receives no cookie, because its authorization window does not carry one to the callback; it is bound by the `challenge` above instead.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description:
      'The `extension` target was requested without a well-formed `challenge`. Refused here rather than at the callback, so an unbound extension transaction cannot exist.',
  })
  @ApiServiceUnavailableResponse({
    description:
      'GitHub sign-in is not configured: the sign-in OAuth App credentials are missing, or the `extension` target was requested without a configured extension destination. Raised before the browser leaves for GitHub, so the failure is not discovered after the user has already authorized.',
  })
  start(
    @Query('app') app: string | undefined,
    @Query('redirect') redirect: string | undefined,
    @Query('challenge') challenge: string | undefined,
    @Query('browser') browser: string | undefined,
    @Res() response: Response,
  ): void {
    const target = parseGithubLoginApp(app);
    // The SPA forwards its normalized protected-route target so the callback can
    // return the user there after sign-in; the service re-sanitizes it.
    const { url, stateNonce } = this.github.startAuthorization(
      target,
      redirect,
      challenge,
      parseGithubExtensionBrowser(browser),
    );
    // Bind the transaction to this browser: the callback is only honored when it
    // presents this HttpOnly cookie whose nonce matches the signed state. Skipped
    // for the extension, whose authorization window does not carry the cookie to
    // the callback — that is why it is bound by proof of possession at the session
    // exchange instead. Setting a cookie nothing reads would suggest a binding
    // that is not there.
    if (target !== 'extension') {
      response.cookie(
        GITHUB_OAUTH_STATE_COOKIE,
        stateNonce,
        this.github.stateCookieOptions(),
      );
    }
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
    description: [
      'Redirect back to whichever client the signed state names. Never returns a body, and never fails the request — an outcome the caller cannot observe is worse than an error it can.',
      '',
      '**Web targets** return to that app: on success to its `/auth/github/callback` SPA route with a single-use handoff `code`, otherwise to its `/login`.',
      '',
      "**The `extension` target** returns to the configured extension destination on every outcome, with the same `code` or indicator on that URL's own query. It has no route to load: the browser navigation is intercepted as soon as it matches, and an outcome sent to a web page would leave the extension's authorization window waiting forever.",
      '',
      'Failures carry `githubError` set to `denied`, `state`, `email`, or `failed`.',
    ].join('\n'),
    headers: {
      Location: {
        description:
          'Absolute URL to return the browser to: an app route for the web targets, the configured extension destination for `extension`.',
        schema: { type: 'string' },
      },
      'Set-Cookie': {
        description:
          'Cleared `gh_oauth_state` cookie — the state binding is single-use. Web targets only; the `extension` target was never given one.',
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
  @ApiUnauthorizedResponse({
    description:
      'The handoff code is unknown, already used, expired, or — for a transaction bound by a `challenge` — presented without the matching `verifier`. The reasons are deliberately indistinguishable to the caller, and a mismatched attempt consumes the code, so this cannot be used to probe one.',
  })
  @ZodSerializerDto(TokenPairResponseDto)
  session(@Body() body: GithubSessionDto): Promise<TokenPairResponseDto> {
    return this.github.exchangeSession(body.code, body.verifier);
  }
}

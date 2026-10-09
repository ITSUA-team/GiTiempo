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
import { GithubAccountService } from '../../github/services/github-account.service';
import { GithubEncryptionService } from '../../github/services/github-encryption.service';
import { GITHUB_ACCOUNT_SESSION_COOKIE } from '../../github/services/github-account-session';
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
  constructor(
    private readonly github: AuthGithubService,
    private readonly accounts: GithubAccountService,
    private readonly encryption: GithubEncryptionService,
  ) {}

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
  @ApiOperation({
    summary: 'GitHub OAuth sign-in or authenticated account-link callback',
  })
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
      'Signed sign-in state or opaque `account_link.*` state. Each namespace is verified independently without fallback.',
  })
  @ApiQuery({
    name: 'error',
    required: false,
    type: String,
    description: 'GitHub error code, present when the user denied the request.',
  })
  @ApiFoundResponse({
    description: [
      'Redirect the browser to the outcome destination for the verified flow. Never returns a body.',
      '',
      '**Web targets** return to that app: on success to its `/auth/github/callback` SPA route with a single-use handoff `code`, otherwise to its `/login`.',
      '',
      "**The `extension` target** returns to the configured extension destination on every outcome, with the same `code` or indicator on that URL's own query. It has no route to load: the browser navigation is intercepted as soon as it matches, and an outcome sent to a web page would leave the extension's authorization window waiting forever.",
      '',
      'Sign-in failures carry a safe `githubError`, including denial, invalid state, email/member resolution, identity mismatch or provider failure.',
      '',
      '**Authenticated account linking** uses the separate opaque `account_link.*` namespace and returns only to user-web `/profile`, with `github=connected` or `github=error` and a safe `code`. It does not issue a sign-in handoff or switch the current GiTiempo account.',
    ].join('\n'),
    headers: {
      Location: {
        description:
          'Absolute URL to return the browser to: an app route for sign-in, the configured extension destination for extension sign-in, or the fixed user Profile route for authenticated linking.',
        schema: { type: 'string' },
      },
      'Set-Cookie': {
        description:
          'Cleared flow-specific binding cookie: `gh_oauth_state` for web sign-in or `github_account_session` for authenticated linking. Extension sign-in uses its existing proof-of-possession binding.',
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
    if (state?.startsWith('account_link.')) {
      let sessionToken: string | undefined;
      try {
        const encrypted = cookies?.[GITHUB_ACCOUNT_SESSION_COOKIE];
        if (encrypted) sessionToken = this.encryption.decrypt(encrypted);
      } catch {
        // An invalid session binding must not fall back to sign-in.
      }
      response.clearCookie(GITHUB_ACCOUNT_SESSION_COOKIE, {
        path: '/auth/github',
      });
      const redirect = await this.accounts.completeCallback({
        code,
        state,
        error,
        sessionToken,
      });
      response.redirect(302, redirect);
      return;
    }
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

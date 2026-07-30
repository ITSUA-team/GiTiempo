import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response } from 'express';
import { AuthGithubController } from './auth-github.controller';
import {
  AuthGithubService,
  GITHUB_OAUTH_STATE_COOKIE,
} from '../services/auth-github.service';

const cookieOptions = {
  httpOnly: true as const,
  secure: false,
  sameSite: 'lax' as const,
  path: '/auth/github',
  maxAge: 600_000,
};

function makeRes() {
  return { cookie: vi.fn(), clearCookie: vi.fn(), redirect: vi.fn() };
}

describe('AuthGithubController', () => {
  let controller: AuthGithubController;
  const github = {
    startAuthorization: vi.fn(),
    stateCookieOptions: vi.fn(() => cookieOptions),
    completeCallback: vi.fn(),
    exchangeSession: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    github.stateCookieOptions.mockReturnValue(cookieOptions);
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthGithubController],
      providers: [{ provide: AuthGithubService, useValue: github }],
    }).compile();
    controller = module.get(AuthGithubController);
  });

  it('GET /start binds the state to a cookie and redirects to the authorize URL', () => {
    github.startAuthorization.mockReturnValue({
      url: 'https://github.test/authorize',
      stateNonce: 'nonce-value',
    });
    const res = makeRes();

    controller.start('admin', undefined, undefined, res as unknown as Response);

    expect(github.startAuthorization).toHaveBeenCalledWith(
      'admin',
      undefined,
      undefined,
    );
    expect(res.cookie).toHaveBeenCalledWith(
      GITHUB_OAUTH_STATE_COOKIE,
      'nonce-value',
      cookieOptions,
    );
    expect(res.redirect).toHaveBeenCalledWith(
      302,
      'https://github.test/authorize',
    );
  });

  it('GET /start defaults an unknown app to the user app', () => {
    github.startAuthorization.mockReturnValue({ url: 'u', stateNonce: 'n' });

    controller.start(
      undefined,
      undefined,
      undefined,
      makeRes() as unknown as Response,
    );

    expect(github.startAuthorization).toHaveBeenCalledWith(
      'user',
      undefined,
      undefined,
    );
  });

  it('GET /start reaches the extension target', () => {
    github.startAuthorization.mockReturnValue({ url: 'u', stateNonce: 'n' });

    controller.start(
      'extension',
      undefined,
      'a'.repeat(64),
      makeRes() as unknown as Response,
    );

    expect(github.startAuthorization).toHaveBeenCalledWith(
      'extension',
      undefined,
      'a'.repeat(64),
    );
  });

  it.each(['extenson', 'Extension', 'ext', ''])(
    'GET /start resolves the near-miss target %o to the user app, not the extension',
    (app) => {
      github.startAuthorization.mockReturnValue({ url: 'u', stateNonce: 'n' });

      controller.start(
        app,
        undefined,
        undefined,
        makeRes() as unknown as Response,
      );

      // A typo must not deliver a handoff code to a client that is not waiting
      // for it: the extension's authorization window would never resolve, and
      // the user would sit on a window that does nothing.
      expect(github.startAuthorization).toHaveBeenCalledWith(
        'user',
        undefined,
        undefined,
      );
    },
  );

  it('GET /start forwards the redirect target to the service', () => {
    github.startAuthorization.mockReturnValue({ url: 'u', stateNonce: 'n' });

    controller.start(
      'user',
      '/time-entries',
      undefined,
      makeRes() as unknown as Response,
    );

    expect(github.startAuthorization).toHaveBeenCalledWith(
      'user',
      '/time-entries',
      undefined,
    );
  });

  it('GET /callback reads and clears the cookie, then redirects to the completed target', async () => {
    github.completeCallback.mockResolvedValue(
      'https://spa.test/auth/github/callback?code=x',
    );
    const res = makeRes();
    const req = {
      cookies: { [GITHUB_OAUTH_STATE_COOKIE]: 'nonce-value' },
    };

    await controller.callback(
      'the-code',
      'the-state',
      undefined,
      req as unknown as Request,
      res as unknown as Response,
    );

    expect(github.completeCallback).toHaveBeenCalledWith({
      code: 'the-code',
      state: 'the-state',
      error: undefined,
      stateNonce: 'nonce-value',
    });
    expect(res.clearCookie).toHaveBeenCalledWith(GITHUB_OAUTH_STATE_COOKIE, {
      path: '/auth/github',
    });
    expect(res.redirect).toHaveBeenCalledWith(
      302,
      'https://spa.test/auth/github/callback?code=x',
    );
  });

  it('GET /callback passes an undefined nonce when no cookie is present', async () => {
    github.completeCallback.mockResolvedValue(
      'https://spa.test/login?githubError=state',
    );
    const res = makeRes();

    await controller.callback(
      'c',
      's',
      undefined,
      { cookies: {} } as unknown as Request,
      res as unknown as Response,
    );

    expect(github.completeCallback).toHaveBeenCalledWith({
      code: 'c',
      state: 's',
      error: undefined,
      stateNonce: undefined,
    });
  });

  it('POST /session delegates the handoff code to the service', async () => {
    const pair = {
      accessToken: 'a',
      refreshToken: 'r',
      accessTokenExpiresIn: 900,
    };
    github.exchangeSession.mockResolvedValue(pair);

    await expect(
      controller.session({ code: 'handoff' } as never),
    ).resolves.toBe(pair);
    expect(github.exchangeSession).toHaveBeenCalledWith('handoff', undefined);
  });

  it('POST /session forwards a public client verifier alongside the code', async () => {
    github.exchangeSession.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      accessTokenExpiresIn: 900,
    });

    await controller.session({ code: 'handoff', verifier: 'v' } as never);

    expect(github.exchangeSession).toHaveBeenCalledWith('handoff', 'v');
  });
});

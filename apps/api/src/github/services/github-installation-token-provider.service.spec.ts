import { generateKeyPairSync } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../config/env.validation';
import {
  GithubInstallationTokenPermissionError,
  GithubInstallationTokenProviderService,
} from './github-installation-token-provider.service';

const privateKey = generateKeyPairSync('rsa', { modulusLength: 2048 })
  .privateKey.export({ type: 'pkcs1', format: 'pem' })
  .toString();

function service() {
  return new GithubInstallationTokenProviderService({
    get: (key: string) =>
      ({ GITHUB_APP_ID: '123', GITHUB_APP_PRIVATE_KEY: privateKey })[
        key as 'GITHUB_APP_ID'
      ],
  } as unknown as ConfigService<Env, true>);
}

describe('GithubInstallationTokenProviderService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('deduplicates concurrent token renewal and never returns the App JWT', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          token: 'ghs_installation_secret',
          expires_at: new Date(Date.now() + 3_600_000).toISOString(),
        }),
        { status: 201 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const provider = service();
    const [first, second] = await Promise.all([
      provider.getToken({ installationId: '55', authorizationVersion: 1 }),
      provider.getToken({ installationId: '55', authorizationVersion: 1 }),
    ]);
    expect(first).toBe('ghs_installation_secret');
    expect(second).toBe('ghs_installation_secret');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]?.headers.Authorization).not.toContain(
      'ghs_installation_secret',
    );
  });

  it('invalidates a cached credential when installation authorization changes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            token: 'first',
            expires_at: new Date(Date.now() + 3_600_000).toISOString(),
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            token: 'second',
            expires_at: new Date(Date.now() + 3_600_000).toISOString(),
          }),
          { status: 201 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const provider = service();
    await provider.getToken({ installationId: '55', authorizationVersion: 1 });
    provider.invalidate('55');
    await expect(
      provider.getToken({ installationId: '55', authorizationVersion: 2 }),
    ).resolves.toBe('second');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('renews a credential inside the expiry skew instead of serving it from cache', async () => {
    const fetchMock = vi.fn().mockImplementation(async () =>
      Response.json({
        token: 'short-lived',
        expires_at: new Date(Date.now() + 30_000).toISOString(),
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const provider = service();
    const scope = {
      installationId: '55',
      authorizationVersion: 1,
      repositories: ['private'],
      permissions: { issues: 'read' as const, metadata: 'read' as const },
    };
    await provider.getToken(scope);
    await provider.getToken(scope);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      JSON.parse(fetchMock.mock.calls[0]?.[1]?.body ?? '{}'),
    ).toMatchObject({
      repositories: ['private'],
      permissions: { issues: 'read', metadata: 'read' },
    });
  });

  it('retries only a transient mint response once', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            token: 'renewed',
            expires_at: new Date(Date.now() + 3_600_000).toISOString(),
          }),
          { status: 201 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      service().getToken({ installationId: '55', authorizationVersion: 1 }),
    ).resolves.toBe('renewed');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([403, 422])(
    'does not retry a denied requested scope (%i)',
    async (status) => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('', { status }));
      vi.stubGlobal('fetch', fetchMock);

      await expect(
        service().getToken({ installationId: '55', authorizationVersion: 1 }),
      ).rejects.toBeInstanceOf(GithubInstallationTokenPermissionError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
});

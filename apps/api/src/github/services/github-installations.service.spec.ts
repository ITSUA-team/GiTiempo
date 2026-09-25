import { createHmac } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../../config/env.validation';
import type { AuthUser } from '../../auth/types/auth-user';
import { GithubInstallationsService } from './github-installations.service';
import {
  GithubInstallationAuthenticationError,
  GithubInstallationPermissionError,
} from './github-api-client.service';

function service(db: object, secret = 'webhook-secret') {
  const transactional = {
    ...db,
    transaction: async <T>(
      callback: (tx: typeof transactional) => Promise<T>,
    ) => callback(transactional),
  };
  return new GithubInstallationsService(
    transactional as never,
    {
      get: (key: string) =>
        ({
          GITHUB_APP_WEBHOOK_SECRET: secret,
          GITHUB_APP_ID: '123',
        })[key],
    } as unknown as ConfigService<Env, true>,
    {} as never,
    { invalidate: vi.fn() } as never,
    {} as never,
  );
}

function signature(secret: string, body: Buffer) {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

describe('GithubInstallationsService lifecycle webhooks', () => {
  it.each([
    'sha256=bad',
    `sha256=${'é'.repeat(64)}`,
    `sha256=${'0'.repeat(64)}`,
  ])(
    'rejects an invalid signature before any delivery or installation write: %s',
    async (invalidSignature) => {
      const insert = vi.fn();
      const subject = service({ insert });
      await expect(
        subject.handleWebhook(
          {
            signature: invalidSignature,
            deliveryId: 'delivery-1',
            event: 'installation',
          },
          Buffer.from('{"action":"suspend"}'),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(insert).not.toHaveBeenCalled();
    },
  );

  it('deduplicates a signed repeated delivery without a lifecycle write', async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const onConflictDoNothing = vi.fn().mockReturnValue({ returning });
    const values = vi.fn().mockReturnValue({ onConflictDoNothing });
    const insert = vi.fn().mockReturnValue({ values });
    const update = vi.fn();
    const body = Buffer.from('{"action":"suspend","installation":{"id":55}}');
    const subject = service({ insert, update });
    vi.spyOn(
      subject as unknown as {
        isInstallationCurrentlyActive: () => Promise<boolean>;
      },
      'isInstallationCurrentlyActive',
    ).mockResolvedValue(false);
    await subject.handleWebhook(
      {
        signature: signature('webhook-secret', body),
        deliveryId: 'delivery-1',
        event: 'installation',
      },
      body,
    );
    expect(values).toHaveBeenCalledWith({
      deliveryId: 'delivery-1',
      event: 'installation',
    });
    expect(update).not.toHaveBeenCalled();
  });

  it.each(['suspend', 'deleted', 'new_permissions_accepted'])(
    'invalidates unavailable lifecycle %s without out-of-order reactivation',
    async (action) => {
      const deliveryReturning = vi.fn().mockResolvedValue([{ id: 'delivery' }]);
      const insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi
            .fn()
            .mockReturnValue({ returning: deliveryReturning }),
        }),
      });
      const suspended = { installationId: '55' };
      const updateReturning = vi.fn().mockResolvedValue([suspended]);
      const update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ returning: updateReturning }),
        }),
      });
      const body = Buffer.from(
        JSON.stringify({ action, installation: { id: 55 } }),
      );
      const subject = service({ insert, update });
      vi.spyOn(
        subject as unknown as {
          isInstallationCurrentlyActive: () => Promise<boolean>;
        },
        'isInstallationCurrentlyActive',
      ).mockResolvedValue(false);
      await subject.handleWebhook(
        {
          signature: signature('webhook-secret', body),
          deliveryId: 'delivery-2',
          event: 'installation',
        },
        body,
      );
      expect(update).toHaveBeenCalledTimes(1);
      const unsuspendBody = Buffer.from(
        '{"action":"unsuspend","installation":{"id":55}}',
      );
      await subject.handleWebhook(
        {
          signature: signature('webhook-secret', unsuspendBody),
          deliveryId: 'delivery-3',
          event: 'installation',
        },
        unsuspendBody,
      );
      expect(update).toHaveBeenCalledTimes(1);
    },
  );

  it('does not let a delayed suspension invalidate a freshly active installation', async () => {
    const insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'delivery' }]),
        }),
      }),
    });
    const update = vi.fn();
    const body = Buffer.from('{"action":"suspend","installation":{"id":55}}');
    const subject = service({ insert, update });
    vi.spyOn(
      subject as unknown as {
        isInstallationCurrentlyActive: () => Promise<boolean>;
      },
      'isInstallationCurrentlyActive',
    ).mockResolvedValue(true);

    await subject.handleWebhook(
      {
        signature: signature('webhook-secret', body),
        deliveryId: 'delivery-delayed',
        event: 'installation',
      },
      body,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('invalidates cached credentials when active installation permissions change', async () => {
    const insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'delivery' }]),
        }),
      }),
    });
    const update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });
    const body = Buffer.from(
      '{"action":"new_permissions_accepted","installation":{"id":55}}',
    );
    const subject = service({ insert, update });
    vi.spyOn(
      subject as unknown as {
        isInstallationCurrentlyActive: () => Promise<boolean>;
      },
      'isInstallationCurrentlyActive',
    ).mockResolvedValue(true);

    await subject.handleWebhook(
      {
        signature: signature('webhook-secret', body),
        deliveryId: 'delivery-permissions',
        event: 'installation',
      },
      body,
    );

    expect(update).toHaveBeenCalledTimes(1);
    expect(
      (
        subject as unknown as {
          tokenProvider: { invalidate: ReturnType<typeof vi.fn> };
        }
      ).tokenProvider.invalidate,
    ).toHaveBeenCalledWith('55');
  });
});

describe('GithubInstallationsService setup authority', () => {
  const user = {
    sub: '11111111-1111-1111-1111-111111111111',
    workspaceId: '22222222-2222-2222-2222-222222222222',
    role: 'admin' as const,
    email: 'admin@example.com',
    firebaseUid: 'firebase-admin',
  };

  function authoritySubject(
    overrides: {
      accessible?: boolean;
      membership?: object;
      installation?: object;
    } = {},
  ) {
    const connections = {
      getValidAccessToken: vi.fn().mockResolvedValue('user-token'),
    };
    const tokens = {
      appToken: vi.fn().mockResolvedValue('app-token'),
      getToken: vi.fn().mockResolvedValue('installation-token'),
    };
    const subject = new GithubInstallationsService(
      {} as never,
      {
        get: (key: string) => ({ GITHUB_APP_ID: '123' })[key],
      } as unknown as ConfigService<Env, true>,
      connections as never,
      tokens as never,
      {} as never,
    );
    const privateSubject = subject as unknown as {
      userCanAccessInstallation: (
        token: string,
        installationId: string,
      ) => Promise<boolean>;
      fetchOrganizationMembership: (
        organizationLogin: string,
        token: string,
      ) => Promise<unknown>;
      fetchGitHub: (path: string, token: string) => Promise<unknown>;
      verifySetupAuthority: (...args: unknown[]) => Promise<unknown>;
    };
    vi.spyOn(privateSubject, 'userCanAccessInstallation').mockResolvedValue(
      overrides.accessible ?? true,
    );
    const membership = {
      state: 'active',
      role: 'admin',
      organization: { id: 7, login: 'octo' },
      ...overrides.membership,
    };
    const installation = {
      id: 55,
      app_id: 123,
      target_type: 'Organization',
      account: { id: 7, login: 'octo' },
      permissions: { issues: 'read', members: 'read' },
      ...overrides.installation,
    };
    vi.spyOn(privateSubject, 'fetchOrganizationMembership').mockResolvedValue(
      membership,
    );
    vi.spyOn(privateSubject, 'fetchGitHub').mockResolvedValue(installation);
    return privateSubject;
  }

  it('refuses visible installations when the user is not an active organization owner', async () => {
    const subject = authoritySubject({ membership: { role: 'member' } });
    await expect(
      subject.verifySetupAuthority(user, 'ignored', 'octo', '55'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a spoofed installation from another App and missing required permissions', async () => {
    const wrongApp = authoritySubject({ installation: { app_id: 999 } });
    await expect(
      wrongApp.verifySetupAuthority(user, '7', 'octo', '55'),
    ).rejects.toBeInstanceOf(BadRequestException);
    const missingPermission = authoritySubject({
      installation: { permissions: { issues: 'read' } },
    });
    await expect(
      missingPermission.verifySetupAuthority(user, '7', 'octo', '55'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('asks the user to reconnect GitHub when their token cannot see the installation', async () => {
    const subject = authoritySubject({ accessible: false });
    await expect(
      subject.verifySetupAuthority(user, '7', 'octo', '55'),
    ).rejects.toEqual(
      expect.objectContaining({
        message: 'Reconnect GitHub, then retry installation verification',
      }),
    );
    await expect(
      subject.verifySetupAuthority(user, '7', 'octo', '55'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([
    [{ membership: { organization: { id: 8, login: 'octo' } } }],
    [{ membership: { organization: { id: 7, login: 'other-org' } } }],
  ])(
    'refuses setup authority when the active owner proof is no longer bound to the requested organization',
    async (overrides) => {
      const subject = authoritySubject(overrides);
      await expect(
        subject.verifySetupAuthority(user, '7', 'octo', '55'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );

  it('rejects expired, replayed, or cross-session setup state before provider verification', async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const db = {
      update: vi.fn().mockReturnValue({
        set: vi
          .fn()
          .mockReturnValue({ where: vi.fn().mockReturnValue({ returning }) }),
      }),
    };
    const subject = service(db) as unknown as {
      requireAdmin: () => Promise<void>;
      verifySetupAuthority: () => Promise<unknown>;
      complete: (
        user: AuthUser,
        input: { state: string; installationId: string },
      ) => Promise<unknown>;
    };
    vi.spyOn(subject, 'requireAdmin').mockResolvedValue();
    vi.spyOn(subject, 'verifySetupAuthority').mockResolvedValue({});
    await expect(
      subject.complete(user, { state: 'a'.repeat(32), installationId: '55' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(subject.verifySetupAuthority).not.toHaveBeenCalled();
  });
});

describe('GithubInstallationsService tracking recovery', () => {
  it('reports a denied organization separately from a missing installation', async () => {
    const subject = service({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });
    const privateSubject = subject as unknown as {
      activeAssociationForOwner: (
        workspaceId: string,
        owner: string,
      ) => Promise<unknown>;
    };

    await expect(
      privateSubject.activeAssociationForOwner('workspace-1', 'Denied-Org'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'github_organization_not_allowed',
      }),
    });
  });

  it('marks a missing App installation unavailable instead of retrying it as an outage', async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where }),
    });
    const subject = service({ update });
    const invalidate = vi.fn();
    const privateSubject = subject as unknown as {
      assertLiveInstallation: (association: unknown) => Promise<void>;
      githubFetch: (path: string, token: string) => Promise<Response>;
      tokenProvider: {
        appToken: () => Promise<string>;
        invalidate: typeof invalidate;
      };
    };
    privateSubject.tokenProvider = {
      appToken: vi.fn().mockResolvedValue('app-token'),
      invalidate,
    };
    vi.spyOn(privateSubject, 'githubFetch').mockResolvedValue(
      new Response('{}', { status: 404 }),
    );

    await expect(
      privateSubject.assertLiveInstallation({
        id: 'association-1',
        installationId: '55',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'github_installation_unavailable',
      }),
    });
    expect(update).toHaveBeenCalledOnce();
    expect(invalidate).toHaveBeenCalledWith('55');
  });
});

describe('GithubInstallationsService board verification', () => {
  const association = {
    id: 'association-id',
    workspaceId: '22222222-2222-2222-2222-222222222222',
    organizationId: '7',
    organizationLogin: 'octo',
    normalizedOrganizationLogin: 'octo',
    installationId: '55',
    appId: '123',
    status: 'verified',
    authorizationVersion: 4,
  };
  const context = {
    associationId: association.id,
    authorizationVersion: association.authorizationVersion,
    organizationLogin: 'octo',
    repository: { id: 'repo-id', owner: 'octo', name: 'repo' },
    issue: { id: 'issue-id', number: 42 },
  };
  const project = {
    found: true,
    owner: { type: 'organization' as const, login: 'octo' },
    title: 'Board',
    number: 1,
    url: 'https://github.com/orgs/octo/projects/1',
  };

  function boardSubject(api: object) {
    const subject = service({}) as unknown as {
      api: object;
      tokenProvider: {
        getToken: ReturnType<typeof vi.fn>;
        invalidate: ReturnType<typeof vi.fn>;
      };
      findAssociationById: ReturnType<typeof vi.fn>;
      verifyBoard: (
        input: {
          associationId: string;
          authorizationVersion: number;
          organizationLogin: string;
          repository: { id: string; owner: string; name: string };
          issue: { id: string; number: number };
        },
        projectId: string,
      ) => Promise<boolean>;
    };
    subject.api = api;
    subject.tokenProvider = {
      getToken: vi.fn().mockResolvedValue('installation-token'),
      invalidate: vi.fn(),
    };
    subject.findAssociationById = vi.fn().mockResolvedValue(association);
    return subject;
  }

  it('checks every project page until it finds the selected issue', async () => {
    const listProjectIssues = vi
      .fn()
      .mockResolvedValueOnce({
        items: [],
        pagination: { nextPageToken: 'second-page' },
      })
      .mockResolvedValueOnce({
        items: [
          {
            issue: {
              id: 'issue-id',
              repository: { fullName: 'octo/repo' },
            },
          },
        ],
        pagination: { nextPageToken: null },
      });
    const subject = boardSubject({
      getProject: vi.fn().mockResolvedValue(project),
      listProjectIssues,
    });

    await expect(subject.verifyBoard(context, 'PVT_kwDO')).resolves.toBe(true);
    expect(listProjectIssues).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ pageToken: 'second-page' }),
    );
  });

  it('renews an installation credential once after an authentication failure', async () => {
    const subject = boardSubject({
      getProject: vi
        .fn()
        .mockRejectedValueOnce(new GithubInstallationAuthenticationError())
        .mockResolvedValueOnce(project),
      listProjectIssues: vi.fn().mockResolvedValue({
        items: [],
        pagination: { nextPageToken: null },
      }),
    });

    await expect(subject.verifyBoard(context, 'PVT_kwDO')).resolves.toBe(false);
    expect(subject.tokenProvider.invalidate).toHaveBeenCalledWith('55');
    expect(subject.tokenProvider.getToken).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      new GithubInstallationPermissionError(),
      'github_installation_permissions_required',
    ],
    [new ServiceUnavailableException(), 'github_provider_unavailable'],
  ])(
    'maps getProject failures without leaking provider errors',
    async (failure, code) => {
      const subject = boardSubject({
        getProject: vi.fn().mockRejectedValue(failure),
        listProjectIssues: vi.fn(),
      });

      await expect(
        subject.verifyBoard(context, 'PVT_kwDO'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code }),
      });
    },
  );

  it('maps a later pagination failure to the provider-unavailable domain code', async () => {
    const subject = boardSubject({
      getProject: vi.fn().mockResolvedValue(project),
      listProjectIssues: vi
        .fn()
        .mockResolvedValueOnce({
          items: [],
          pagination: { nextPageToken: 'second-page' },
        })
        .mockRejectedValueOnce(new ServiceUnavailableException()),
    });

    await expect(
      subject.verifyBoard(context, 'PVT_kwDO'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'github_provider_unavailable',
      }),
    });
  });

  it('skips a missing board candidate so another mapping can be checked', async () => {
    const subject = boardSubject({
      getProject: vi.fn().mockRejectedValue(new NotFoundException()),
      listProjectIssues: vi.fn(),
    });

    await expect(subject.verifyBoard(context, 'PVT_removed')).resolves.toBe(
      false,
    );
  });
});

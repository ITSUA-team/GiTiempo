import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  addWorkspaceGitHubOrganizationSchema,
  buildWorkspaceGitHubOrganizationRecoveryPayload,
  workspaceGitHubOrganizationRecoveryErrorSchema,
  updateWorkspaceSettingsSchema,
  workspaceGitHubOrganizationRecoveryPayloadSchema,
  workspaceGitHubOrganizationRecoveryReasonSchema,
  workspaceGitHubOrganizationRecoveryStepSchema,
  workspaceGitHubOrganizationListResponseSchema,
  workspaceGitHubOrganizationResponseSchema,
  workspaceSettingsResponseSchema,
} from './workspaces.js';

const settingsResponse = {
  id: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001',
  workspaceId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002',
  currency: 'USD',
  defaultHourlyRate: 100,
  timeZone: 'UTC',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
};

const originalSupportedValuesOf = Intl.supportedValuesOf;

function stubSupportedValuesOf(value: typeof Intl.supportedValuesOf | undefined): void {
  if (!value) {
    Reflect.deleteProperty(Intl, 'supportedValuesOf');
    return;
  }

  Object.defineProperty(Intl, 'supportedValuesOf', {
    configurable: true,
    value,
  });
}

afterEach(() => {
  if (originalSupportedValuesOf) {
    Object.defineProperty(Intl, 'supportedValuesOf', {
      configurable: true,
      value: originalSupportedValuesOf,
    });
  } else {
    Reflect.deleteProperty(Intl, 'supportedValuesOf');
  }

  vi.restoreAllMocks();
});

describe('workspaceSettingsResponseSchema', () => {
  it('accepts valid workspace settings with a time zone', () => {
    const result = workspaceSettingsResponseSchema.parse(settingsResponse);

    expect(result.timeZone).toBe('UTC');
  });

  it('rejects invalid response time zones', () => {
    const result = workspaceSettingsResponseSchema.safeParse({
      ...settingsResponse,
      timeZone: 'Not/AZone',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['timeZone']);
  });
});

describe('updateWorkspaceSettingsSchema', () => {
  it('accepts valid time zone updates', () => {
    const result = updateWorkspaceSettingsSchema.parse({
      timeZone: 'Europe/Kyiv',
    });

    expect(result.timeZone).toBe('Europe/Kyiv');
  });

  it('accepts constructor-valid time zones omitted by supportedValuesOf', () => {
    const supportedValuesOf = vi.fn().mockReturnValue(['Europe/Kyiv']);
    stubSupportedValuesOf(supportedValuesOf);

    const result = updateWorkspaceSettingsSchema.parse({
      timeZone: 'Pacific/Chatham',
    });

    expect(result.timeZone).toBe('Pacific/Chatham');
    expect(supportedValuesOf).toHaveBeenCalledWith('timeZone');
  });

  it('accepts constructor-valid time zones without supportedValuesOf', () => {
    stubSupportedValuesOf(undefined);

    const result = updateWorkspaceSettingsSchema.parse({
      timeZone: 'Pacific/Chatham',
    });

    expect(result.timeZone).toBe('Pacific/Chatham');
  });

  it('rejects invalid time zone updates', () => {
    const result = updateWorkspaceSettingsSchema.safeParse({
      timeZone: 'Not/AZone',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['timeZone']);
  });

  it('accepts timeZone as the only updated field', () => {
    const result = updateWorkspaceSettingsSchema.safeParse({
      timeZone: 'America/New_York',
    });

    expect(result.success).toBe(true);
  });
});

describe('workspaceGitHubOrganizationResponseSchema', () => {
  it('accepts valid allowed organization responses', () => {
    const result = workspaceGitHubOrganizationResponseSchema.parse({
      id: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9010',
      workspaceId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002',
      organizationLogin: 'Octo-Org',
      createdByUserId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9011',
      createdAt: '2026-06-18T00:00:00.000Z',
    });

    expect(result.organizationLogin).toBe('Octo-Org');
  });
});

describe('workspaceGitHubOrganizationListResponseSchema', () => {
  it('accepts empty organization lists', () => {
    const result = workspaceGitHubOrganizationListResponseSchema.parse({
      items: [],
    });

    expect(result.items).toEqual([]);
  });
});

describe('addWorkspaceGitHubOrganizationSchema', () => {
  it('accepts strict add payloads', () => {
    const result = addWorkspaceGitHubOrganizationSchema.parse({
      organizationLogin: '  octo-org  ',
    });

    expect(result.organizationLogin).toBe('octo-org');
  });

  it('rejects empty organization logins', () => {
    const result = addWorkspaceGitHubOrganizationSchema.safeParse({
      organizationLogin: '   ',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['organizationLogin']);
  });

  it('rejects unknown fields', () => {
    const result = addWorkspaceGitHubOrganizationSchema.safeParse({
      organizationLogin: 'octo-org',
      extra: true,
    });

    expect(result.success).toBe(false);
  });
});

describe('workspaceGitHubOrganizationRecoveryReasonSchema', () => {
  it('accepts frontend-safe recovery reasons', () => {
    expect(
      workspaceGitHubOrganizationRecoveryReasonSchema.safeParse(
        'workspace_github_organization_connection_required',
      ).success,
    ).toBe(true);
    expect(
      workspaceGitHubOrganizationRecoveryReasonSchema.safeParse(
        'workspace_github_organization_not_visible',
      ).success,
    ).toBe(true);
    expect(
      workspaceGitHubOrganizationRecoveryReasonSchema.safeParse(
        'workspace_github_organization_app_access_blocked',
      ).success,
    ).toBe(true);
    expect(
      workspaceGitHubOrganizationRecoveryReasonSchema.safeParse(
        'workspace_github_organization_provider_retryable',
      ).success,
    ).toBe(true);
  });

  it('rejects unknown recovery reasons', () => {
    const result = workspaceGitHubOrganizationRecoveryReasonSchema.safeParse(
      'github_app_access_blocked',
    );

    expect(result.success).toBe(false);
  });
});

describe('workspaceGitHubOrganizationRecoveryPayloadSchema', () => {
  it('accepts ordered GitHub App access recovery steps', () => {
    const result = workspaceGitHubOrganizationRecoveryPayloadSchema.parse({
      organizationLogin: 'My-test-org-for-clock',
      reason: 'workspace_github_organization_app_access_blocked',
      steps: [
        { id: 'install', status: 'complete' },
        { id: 'approve', status: 'blocked' },
        { id: 'reconnect', status: 'action_required' },
        { id: 'retry', status: 'blocked' },
      ],
    });

    expect(result.steps[1].status).toBe('blocked');
  });

  it('rejects unknown recovery step ids', () => {
    const result = workspaceGitHubOrganizationRecoveryStepSchema.safeParse({
      id: 'grant-access',
      status: 'complete',
    });

    expect(result.success).toBe(false);
  });

  it('rejects unknown recovery step statuses', () => {
    const result = workspaceGitHubOrganizationRecoveryStepSchema.safeParse({
      id: 'install',
      status: 'installed',
    });

    expect(result.success).toBe(false);
  });

  it('rejects unknown recovery step fields', () => {
    const result = workspaceGitHubOrganizationRecoveryPayloadSchema.safeParse({
      organizationLogin: 'My-test-org-for-clock',
      reason: 'workspace_github_organization_not_visible',
      steps: [
        {
          id: 'install',
          status: 'action_required',
          providerDetails: 'raw provider detail',
        },
        { id: 'approve', status: 'action_required' },
        { id: 'reconnect', status: 'complete' },
        { id: 'retry', status: 'blocked' },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('rejects recovery payloads that do not keep the ordered step contract', () => {
    const result = workspaceGitHubOrganizationRecoveryPayloadSchema.safeParse({
      organizationLogin: 'My-test-org-for-clock',
      reason: 'workspace_github_organization_not_visible',
      steps: [
        { id: 'approve', status: 'action_required' },
        { id: 'install', status: 'action_required' },
        { id: 'reconnect', status: 'complete' },
        { id: 'retry', status: 'blocked' },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe('buildWorkspaceGitHubOrganizationRecoveryPayload', () => {
  it('builds the canonical GitHub App access recovery matrix for every reason', () => {
    expect(
      ([
        'workspace_github_organization_connection_required',
        'workspace_github_organization_app_access_blocked',
        'workspace_github_organization_provider_retryable',
        'workspace_github_organization_not_visible',
      ] as const).map((reason) =>
        buildWorkspaceGitHubOrganizationRecoveryPayload(
          'My-test-org-for-clock',
          reason,
        ),
      ),
    ).toEqual([
      {
        organizationLogin: 'My-test-org-for-clock',
        reason: 'workspace_github_organization_connection_required',
        steps: [
          { id: 'install', status: 'unknown' },
          { id: 'approve', status: 'action_required' },
          { id: 'reconnect', status: 'disconnected' },
          { id: 'retry', status: 'blocked' },
        ],
      },
      {
        organizationLogin: 'My-test-org-for-clock',
        reason: 'workspace_github_organization_app_access_blocked',
        steps: [
          { id: 'install', status: 'complete' },
          { id: 'approve', status: 'blocked' },
          { id: 'reconnect', status: 'action_required' },
          { id: 'retry', status: 'blocked' },
        ],
      },
      {
        organizationLogin: 'My-test-org-for-clock',
        reason: 'workspace_github_organization_provider_retryable',
        steps: [
          { id: 'install', status: 'unknown' },
          { id: 'approve', status: 'action_required' },
          { id: 'reconnect', status: 'complete' },
          { id: 'retry', status: 'ready' },
        ],
      },
      {
        organizationLogin: 'My-test-org-for-clock',
        reason: 'workspace_github_organization_not_visible',
        steps: [
          { id: 'install', status: 'action_required' },
          { id: 'approve', status: 'action_required' },
          { id: 'reconnect', status: 'complete' },
          { id: 'retry', status: 'blocked' },
        ],
      },
    ]);
  });

  it('returns independent payload instances', () => {
    const first = buildWorkspaceGitHubOrganizationRecoveryPayload(
      'My-test-org-for-clock',
      'workspace_github_organization_not_visible',
    );
    const second = buildWorkspaceGitHubOrganizationRecoveryPayload(
      'My-test-org-for-clock',
      'workspace_github_organization_not_visible',
    );

    first.steps[0].status = 'unknown';

    expect(second.steps[0].status).toBe('action_required');
  });
});

describe('workspaceGitHubOrganizationRecoveryErrorSchema', () => {
  it('accepts recovery error payloads without raw provider details', () => {
    const result = workspaceGitHubOrganizationRecoveryErrorSchema.parse({
      statusCode: 503,
      code: 'workspace_github_organization_provider_retryable',
      error: 'ServiceUnavailable',
      message:
        'GitHub organization validation is temporarily unavailable. Try again.',
      recovery: {
        organizationLogin: 'My-test-org-for-clock',
        reason: 'workspace_github_organization_provider_retryable',
        steps: [
          { id: 'install', status: 'unknown' },
          { id: 'approve', status: 'action_required' },
          { id: 'reconnect', status: 'complete' },
          { id: 'retry', status: 'ready' },
        ],
      },
      requestId: 'request-1',
    });

    expect(result.statusCode).toBe(503);
    expect(result.recovery.steps[3]?.status).toBe('ready');
  });
});

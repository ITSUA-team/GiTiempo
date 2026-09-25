import { describe, expect, it } from 'vitest';
import {
  githubInstallationAssociationParamsSchema,
  githubInstallationCompleteRequestSchema,
  githubInstallationSetupRequestSchema,
  githubTrackingErrorMessages,
  githubTrackingErrorSchema,
  githubTrackingErrorStatuses,
  workspaceGitHubInstallationSchema,
} from './github-installations.js';
import { startTimerFromGitHubSchema } from './time-entries.js';

describe('installation and tracking contracts', () => {
  it('validates installation management path parameters', () => {
    expect(
      githubInstallationAssociationParamsSchema.safeParse({
        associationId: 'not-a-uuid',
      }).success,
    ).toBe(false);
    expect(
      githubInstallationAssociationParamsSchema.safeParse({
        associationId: '00000000-0000-4000-8000-000000000001',
        workspaceId: 'forged',
      }).success,
    ).toBe(false);
  });
  it.each([
    'workspaceId',
    'installationId',
    'accessToken',
    'projectId',
    'assignments',
    'issueTitle',
  ])('rejects a client authority override: %s', (field) => {
    expect(
      startTimerFromGitHubSchema.safeParse({
        githubRepo: 'org/repo',
        issueNumber: 1,
        [field]: 'forged',
      }).success,
    ).toBe(false);
  });
  it('accepts an optional board hint but no claimed verification', () => {
    expect(
      startTimerFromGitHubSchema.parse({
        githubRepo: 'org/repo',
        issueNumber: 1,
        githubProjectId: 'PVT_1',
      }),
    ).toEqual({
      githubRepo: 'org/repo',
      issueNumber: 1,
      githubProjectId: 'PVT_1',
    });
    expect(
      githubInstallationSetupRequestSchema.safeParse({
        organizationLogin: 'org',
        verified: true,
      }).success,
    ).toBe(false);
    expect(
      githubInstallationCompleteRequestSchema.safeParse({
        state: 's'.repeat(32),
        installationId: '12',
        workspaceId: 'another',
      }).success,
    ).toBe(false);
  });
  it('validates opaque setup context and installation identity', () => {
    expect(
      githubInstallationCompleteRequestSchema.safeParse({
        state: 'short',
        installationId: '12',
      }).success,
    ).toBe(false);
    for (const id of ['0', '-1', '1.2', 'abc']) {
      expect(
        githubInstallationCompleteRequestSchema.safeParse({
          state: 's'.repeat(32),
          installationId: id,
        }).success,
      ).toBe(false);
    }
  });
  it('rejects credentials in a status response', () => {
    const status = {
      id: '00000000-0000-4000-8000-000000000001',
      organizationId: '1',
      organizationLogin: 'org',
      installationId: '2',
      status: 'verified',
      verifiedAt: '2026-09-25T00:00:00Z',
      recoveryReason: null,
    };
    expect(workspaceGitHubInstallationSchema.safeParse(status).success).toBe(
      true,
    );
    expect(
      workspaceGitHubInstallationSchema.safeParse({
        ...status,
        accessToken: 'secret',
      }).success,
    ).toBe(false);
  });
  it('distinguishes every tracking failure without using a session 401', () => {
    for (const [code, message] of Object.entries(githubTrackingErrorMessages)) {
      expect(
        githubTrackingErrorSchema.safeParse({
          code,
          message,
          error: 'DomainError',
        }).success,
      ).toBe(true);
      expect(
        githubTrackingErrorStatuses[
          code as keyof typeof githubTrackingErrorStatuses
        ],
      ).not.toBe(401);
    }
    expect(githubTrackingErrorMessages.project_assignment_required).toBe(
      'You are not assigned to this project. Contact your workspace administrator or project manager to get access and start tracking time.',
    );
  });
});

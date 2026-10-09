import { describe, expect, it } from 'vitest';

import { buildGitHubWorkspaceAccessChecklist } from './github-workspace-access';

function getProfileHref(): string {
  const checklist = buildGitHubWorkspaceAccessChecklist({
    recovery: {
      organizationLogin: 'My-test-org-for-clock',
      reason: 'workspace_github_organization_permission_required',
      steps: [
        { id: 'authorize', status: 'action_required' },
        { id: 'permission', status: 'action_required' },
        { id: 'approve', status: 'action_required' },
        { id: 'retry', status: 'blocked' },
      ],
    },
    userAppUrl: 'http://localhost:5173',
  });
  const action = checklist.steps.find((step) => step.id === 'authorize')?.action;

  if (!action || action.kind !== 'link') {
    throw new Error('Expected OAuth authorization step to expose a link action.');
  }

  return action.href;
}

describe('buildGitHubWorkspaceAccessChecklist', () => {
  it('uses the Profile OAuth flow for authorization recovery', () => {
    expect(getProfileHref()).toBe('http://localhost:5173/profile');
  });

  it('derives recovery instructions from backend-provided recovery step values', () => {
    const checklist = buildGitHubWorkspaceAccessChecklist({
      recovery: {
        organizationLogin: 'My-test-org-for-clock',
        reason: 'workspace_github_organization_oauth_access_blocked',
        steps: [
          { id: 'authorize', status: 'complete' },
          { id: 'permission', status: 'action_required' },
          { id: 'approve', status: 'blocked' },
          { id: 'retry', status: 'blocked' },
        ],
      },
      userAppUrl: 'http://localhost:5173',
    });

    expect(checklist.steps.map((step) => step.description)).toEqual([
      'Your GitHub identity is authorized. Continue with any required organization permission review.',
      'Reconnect GitHub from your profile and grant organization permission before retrying.',
      'Open organization settings and approve or unblock OAuth access before retrying.',
      'Return to this Settings card and retry the same organization login after you finish the earlier steps.',
    ]);
  });
});

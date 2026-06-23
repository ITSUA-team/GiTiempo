import { describe, expect, it } from 'vitest';

import { buildGitHubWorkspaceAccessChecklist } from './github-workspace-access';

function getInstallHref(githubAppInstallUrl?: string | null): string {
  const checklist = buildGitHubWorkspaceAccessChecklist({
    githubAppInstallUrl,
    recovery: {
      organizationLogin: 'My-test-org-for-clock',
      reason: 'workspace_github_organization_not_visible',
      steps: [
        { id: 'install', status: 'action_required' },
        { id: 'approve', status: 'action_required' },
        { id: 'reconnect', status: 'complete' },
        { id: 'retry', status: 'blocked' },
      ],
    },
    userAppUrl: 'http://localhost:5173',
  });
  const action = checklist.steps.find((step) => step.id === 'install')?.action;

  if (!action || action.kind !== 'link') {
    throw new Error('Expected install step to expose a link action.');
  }

  return action.href;
}

describe('buildGitHubWorkspaceAccessChecklist', () => {
  it('opens the GitHub App installation request page by default', () => {
    expect(getInstallHref()).toBe(
      'https://github.com/apps/gi-tiempo/installations/new',
    );
    expect(getInstallHref('   ')).toBe(
      'https://github.com/apps/gi-tiempo/installations/new',
    );
  });

  it('uses a configured GitHub App install URL when provided', () => {
    expect(
      getInstallHref('https://github.com/apps/gitiempo-dev/installations/new'),
    ).toBe('https://github.com/apps/gitiempo-dev/installations/new');
  });

  it('derives recovery instructions from backend-provided recovery step values', () => {
    const checklist = buildGitHubWorkspaceAccessChecklist({
      recovery: {
        organizationLogin: 'My-test-org-for-clock',
        reason: 'workspace_github_organization_app_access_blocked',
        steps: [
          { id: 'install', status: 'complete' },
          { id: 'approve', status: 'blocked' },
          { id: 'reconnect', status: 'action_required' },
          { id: 'retry', status: 'blocked' },
        ],
      },
      userAppUrl: 'http://localhost:5173',
    });

    expect(checklist.steps.map((step) => step.description)).toEqual([
      'GiTiempo is already installed for this organization. Continue to the organization access review step.',
      'Open organization settings and unblock or approve the installed GiTiempo app before retrying.',
      'Reconnect after GitHub-side approval so GiTiempo gets a fresh authorization.',
      'Return to this Settings card and retry the same organization login after you finish the earlier steps.',
    ]);
  });
});

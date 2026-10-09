import type {
  WorkspaceGitHubOrganizationRecoveryPayload,
  WorkspaceGitHubOrganizationRecoveryStep,
} from '@gitiempo/shared';

export interface GitHubWorkspaceAccessLinkAction {
  ariaLabel: string;
  href: string;
  kind: 'link';
  label: string;
  target: '_blank' | '_self';
}

export interface GitHubWorkspaceAccessRetryAction {
  ariaLabel: string;
  kind: 'retry';
  label: string;
}

export type GitHubWorkspaceAccessStepAction =
  | GitHubWorkspaceAccessLinkAction
  | GitHubWorkspaceAccessRetryAction;

export interface GitHubWorkspaceAccessStep {
  action: GitHubWorkspaceAccessStepAction | null;
  description: string;
  id: 'approve' | 'authorize' | 'permission' | 'retry';
  title: string;
}

export interface GitHubWorkspaceAccessChecklist {
  organizationLogin: string;
  steps: GitHubWorkspaceAccessStep[];
}

interface BuildGitHubWorkspaceAccessChecklistOptions {
  recovery: WorkspaceGitHubOrganizationRecoveryPayload;
  userAppUrl?: string | null;
}

function buildOrganizationOAuthPolicyUrl(organizationLogin: string): string {
  return `https://github.com/organizations/${encodeURIComponent(
    organizationLogin,
  )}/settings/oauth_application_policy`;
}

export function buildGitHubProfileHref(
  userAppUrl: string | null | undefined,
): string | null {
  if (!userAppUrl) {
    return null;
  }

  try {
    return new URL('/profile', userAppUrl).toString();
  } catch {
    return null;
  }
}

function createLinkAction(input: {
  href: string | null;
  kindLabel: string;
  label: string;
  openInNewTab: boolean;
  organizationLogin: string;
}): GitHubWorkspaceAccessLinkAction | null {
  if (!input.href) {
    return null;
  }

  return {
    ariaLabel: `${input.kindLabel} for ${input.organizationLogin}`,
    href: input.href,
    kind: 'link',
    label: input.label,
    target: input.openInNewTab ? '_blank' : '_self',
  };
}

function getStepPresentation(
  step: WorkspaceGitHubOrganizationRecoveryStep,
): Omit<GitHubWorkspaceAccessStep, 'action' | 'id'> {
  switch (step.id) {
    case 'authorize':
      switch (step.status) {
        case 'action_required':
          return {
            description:
              'Open your profile and authorize GitHub before adding this organization.',
            title: 'Authorize your GitHub account',
          };
        case 'complete':
          return {
            description:
              'Your GitHub identity is authorized. Continue with any required organization permission review.',
            title: 'Authorize your GitHub account',
          };
        default:
          return {
            description:
              'Open your profile to refresh GitHub authorization before retrying.',
            title: 'Authorize your GitHub account',
          };
      }
    case 'permission':
      return {
        description:
          'Reconnect GitHub from your profile and grant organization permission before retrying.',
        title: 'Grant GitHub organization permission',
      };
    case 'reconnect':
      return {
        description:
          'Open your profile and reconnect GitHub before retrying this organization.',
        title: 'Reconnect GitHub',
      };
    case 'install':
      return {
        description:
          'Install the GitHub App for this organization, then retry the workspace check.',
        title: 'Install GitHub App',
      };
    case 'approve':
      switch (step.status) {
        case 'action_required':
          return {
            description:
              'Open the organization OAuth policy, then approve pending access.',
            title: 'Approve organization OAuth access',
          };
        case 'blocked':
          return {
            description:
              'Open organization settings and approve or unblock OAuth access before retrying.',
            title: 'Approve organization OAuth access',
          };
        case 'complete':
          return {
            description:
              'Organization OAuth access is already approved. Retry inside GiTiempo.',
            title: 'Approve organization OAuth access',
          };
        default:
          return {
            description:
              'Open organization settings to review the current OAuth application policy.',
            title: 'Approve organization OAuth access',
          };
      }
    case 'retry':
      switch (step.status) {
        case 'blocked':
          return {
            description:
              'Return to this Settings card and retry the same organization login after you finish the earlier steps.',
            title: 'Retry workspace allow-list check',
          };
        case 'ready':
          return {
            description:
              'Return to this Settings card and retry the same organization login.',
            title: 'Retry workspace allow-list check',
          };
        default:
          return {
            description:
              'Retry the same organization login from this Settings card once GitHub access is ready.',
            title: 'Retry workspace allow-list check',
          };
      }
  }
}

export function buildGitHubWorkspaceAccessChecklist({
  recovery,
  userAppUrl,
}: BuildGitHubWorkspaceAccessChecklistOptions): GitHubWorkspaceAccessChecklist {
  const organizationLogin = recovery.organizationLogin;
  const organizationOAuthPolicyUrl =
    buildOrganizationOAuthPolicyUrl(organizationLogin);
  const reconnectHref = buildGitHubProfileHref(userAppUrl);

  return {
    organizationLogin,
    steps: recovery.steps.map((step) => {
      if (step.id === 'retry') {
        const presentation = getStepPresentation(step);

        return {
          action: {
            ariaLabel: `Retry workspace allow-list check for ${organizationLogin}`,
            kind: 'retry',
            label: 'Retry check',
          },
          description: presentation.description,
          id: step.id,
          title: presentation.title,
        };
      }

      if (step.id === 'authorize' || step.id === 'permission') {
        const presentation = getStepPresentation(step);

        return {
          action: createLinkAction({
            href: reconnectHref,
            kindLabel: 'Open GitHub profile authorization',
            label: 'Open profile',
            openInNewTab: false,
            organizationLogin,
          }),
          description: presentation.description,
          id: step.id,
          title: presentation.title,
        };
      }

      if (step.id === 'approve') {
        const presentation = getStepPresentation(step);

        return {
          action: createLinkAction({
            href: organizationOAuthPolicyUrl,
            kindLabel: 'Review GitHub organization OAuth access',
            label: 'Review GitHub',
            openInNewTab: true,
            organizationLogin,
          }),
          description: presentation.description,
          id: step.id,
          title: presentation.title,
        };
      }

      return {
        action: null,
        description: 'Retry the workspace allow-list check once GitHub access is ready.',
        id: 'retry',
        title: 'Retry workspace allow-list check',
      };

    }),
  };
}

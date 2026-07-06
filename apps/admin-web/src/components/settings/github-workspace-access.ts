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
  id: 'approve' | 'install' | 'reconnect' | 'retry';
  title: string;
}

export interface GitHubWorkspaceAccessChecklist {
  organizationLogin: string;
  steps: GitHubWorkspaceAccessStep[];
}

interface BuildGitHubWorkspaceAccessChecklistOptions {
  githubAppInstallUrl?: string | null;
  recovery: WorkspaceGitHubOrganizationRecoveryPayload;
  userAppUrl?: string | null;
}

const defaultGitHubAppInstallUrl =
  'https://github.com/apps/gi-tiempo/installations/new';

function resolveGitHubAppInstallUrl(
  githubAppInstallUrl: string | null | undefined,
): string {
  const configuredUrl = githubAppInstallUrl?.trim();

  return configuredUrl || defaultGitHubAppInstallUrl;
}

function buildOrganizationInstallationsUrl(organizationLogin: string): string {
  return `https://github.com/organizations/${encodeURIComponent(
    organizationLogin,
  )}/settings/installations`;
}

export function buildUserProfileHref(
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
    case 'install':
      switch (step.status) {
        case 'action_required':
          return {
            description:
              'Choose the organization, install GiTiempo, and select the required repositories.',
            title: 'Install GitHub App for organization',
          };
        case 'complete':
          return {
            description:
              'GiTiempo is already installed for this organization. Continue to the organization access review step.',
            title: 'Install GitHub App for organization',
          };
        default:
          return {
            description:
              'Open the GitHub App installation request page if this organization still needs GiTiempo access.',
            title: 'Install GitHub App for organization',
          };
      }
    case 'approve':
      switch (step.status) {
        case 'action_required':
          return {
            description:
              'Open organization settings, approve pending access, or finish the installation request.',
            title: 'Approve or unblock organization access',
          };
        case 'blocked':
          return {
            description:
              'Open organization settings and unblock or approve the installed GiTiempo app before retrying.',
            title: 'Approve or unblock organization access',
          };
        case 'complete':
          return {
            description:
              'Organization access is already approved. Continue to reconnect or retry inside GiTiempo.',
            title: 'Approve or unblock organization access',
          };
        default:
          return {
            description:
              'Open organization settings to review the current GiTiempo app access state.',
            title: 'Approve or unblock organization access',
          };
      }
    case 'reconnect':
      switch (step.status) {
        case 'action_required':
          return {
            description:
              'Reconnect after GitHub-side approval so GiTiempo gets a fresh authorization.',
            title: 'Reconnect your GitHub account',
          };
        case 'complete':
          return {
            description:
              'Your GitHub account is already connected in GiTiempo. Retry after any GitHub-side changes finish.',
            title: 'Reconnect your GitHub account',
          };
        case 'disconnected':
          return {
            description:
              'Connect GitHub before retrying this organization in the workspace allow-list.',
            title: 'Reconnect your GitHub account',
          };
        default:
          return {
            description:
              'Use the existing profile connection flow to refresh GiTiempo GitHub authorization.',
            title: 'Reconnect your GitHub account',
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
  githubAppInstallUrl,
  recovery,
  userAppUrl,
}: BuildGitHubWorkspaceAccessChecklistOptions): GitHubWorkspaceAccessChecklist {
  const organizationLogin = recovery.organizationLogin;
  const installUrl = resolveGitHubAppInstallUrl(githubAppInstallUrl);
  const organizationInstallationsUrl =
    buildOrganizationInstallationsUrl(organizationLogin);
  const reconnectHref = buildUserProfileHref(userAppUrl);

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

      if (step.id === 'install') {
        const presentation = getStepPresentation(step);

        return {
          action: createLinkAction({
            href: installUrl,
            kindLabel: 'Open GitHub App install page',
            label: 'Open install',
            openInNewTab: true,
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
            href: organizationInstallationsUrl,
            kindLabel: 'Review GitHub App access',
            label: 'Review GitHub',
            openInNewTab: true,
            organizationLogin,
          }),
          description: presentation.description,
          id: step.id,
          title: presentation.title,
        };
      }

      const presentation = getStepPresentation(step);

      return {
        action: createLinkAction({
          href: reconnectHref,
          kindLabel: 'Reconnect GitHub account',
          label: 'Reconnect',
          openInNewTab: false,
          organizationLogin,
        }),
        description: presentation.description,
        id: step.id,
        title: presentation.title,
      };
    }),
  };
}

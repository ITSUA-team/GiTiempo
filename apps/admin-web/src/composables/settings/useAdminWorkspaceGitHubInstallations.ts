import {
  githubInstallationCompleteRequestSchema,
  githubInstallationSetupRequestSchema,
  type GitHubInstallationSetupResponse,
  type WorkspaceGitHubOrganizationResponse,
} from '@gitiempo/shared';
import { computed, onScopeDispose, ref, watch, type ComputedRef, type Ref } from 'vue';

import {
  useCompleteWorkspaceGitHubInstallationMutation,
  useSetupWorkspaceGitHubInstallationMutation,
  useWorkspaceGitHubInstallationsQuery,
} from '@/composables/query';
import type { AdminServerStateScope } from '@/lib/query-keys';
import {
  getAdminSettingsClient,
  type AdminSettingsClient,
} from '@/services/admin-settings-client';

type WorkspaceGitHubInstallationsClient = Pick<
  AdminSettingsClient,
  | 'completeWorkspaceGitHubInstallation'
  | 'listWorkspaceGitHubInstallations'
  | 'setupWorkspaceGitHubInstallation'
>;

interface UseAdminWorkspaceGitHubInstallationsOptions {
  canConfigure: Ref<boolean> | ComputedRef<boolean>;
  client?: WorkspaceGitHubInstallationsClient;
  enabled: Ref<boolean> | ComputedRef<boolean>;
  navigate?: (url: string) => void;
  onError?: (message: string, error: unknown, action: string) => void;
  onSuccess?: (message: string, action: string) => void;
  organizations?: Ref<readonly WorkspaceGitHubOrganizationResponse[]> | ComputedRef<readonly WorkspaceGitHubOrganizationResponse[]>;
  scope: Ref<AdminServerStateScope> | ComputedRef<AdminServerStateScope>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}

export function useAdminWorkspaceGitHubInstallations({
  canConfigure,
  client = getAdminSettingsClient(),
  enabled,
  navigate = (url) => window.location.assign(url),
  onError,
  onSuccess,
  organizations,
  scope,
}: UseAdminWorkspaceGitHubInstallationsOptions) {
  const query = useWorkspaceGitHubInstallationsQuery({ client, enabled, scope });
  const setupMutation = useSetupWorkspaceGitHubInstallationMutation({ client, scope });
  const completeMutation = useCompleteWorkspaceGitHubInstallationMutation({ client, scope });
  const items = computed(() => query.data.value?.items ?? []);
  const isLoaded = computed(
    () => query.data.value !== undefined && query.error.value === null,
  );
  const installingOrganizationLogin = ref<string | null>(null);
  const scopeKey = computed(() => JSON.stringify(scope.value));
  const attemptedOrganizations = new Set<string>();
  let disposed = false;
  onScopeDispose(() => { disposed = true; });

  function isCurrentScope(key: string): boolean {
    return !disposed && enabled.value && scopeKey.value === key;
  }

  function parseSetupRequest(
    organizationLogin: string,
  ): { organizationLogin: string } | null {
    if (!canConfigure.value || !enabled.value || disposed) {
      onError?.(
        'Connect your GitHub account and confirm organization-owner access before linking a GitHub App installation.',
        new Error('GitHub connection required for installation setup'),
        'setup-workspace-github-installation',
      );
      return null;
    }
    const parsed = githubInstallationSetupRequestSchema.safeParse({ organizationLogin });
    if (!parsed.success) {
      onError?.(
        parsed.error.issues[0]?.message ?? 'A GitHub organization is required',
        parsed.error,
        'setup-workspace-github-installation',
      );
      return null;
    }

    return parsed.data;
  }

  async function requestSetup(
    organizationLogin: string,
  ): Promise<GitHubInstallationSetupResponse | null> {
    const request = parseSetupRequest(organizationLogin);
    if (!request) return null;

    const currentScope = scopeKey.value;
    try {
      const response = await setupMutation.mutateAsync(request);
      return isCurrentScope(currentScope) && canConfigure.value ? response : null;
    } catch (error) {
      if (isCurrentScope(currentScope)) {
        onError?.(getErrorMessage(error), error, 'setup-workspace-github-installation');
      }
      return null;
    }
  }

  async function beginSetup(
    organizationLogin: string,
    isStillAllowed: () => boolean = () => true,
  ): Promise<void> {
    const response = await requestSetup(organizationLogin);
    if (!response || !isStillAllowed()) return;

    // Missing installations stay in the existing organization recovery flow.
    // Background discovery must never navigate away from Settings.
    if (response.existingInstallationId) {
      await completeSetup(response.state, response.existingInstallationId);
    }
  }

  async function beginInstallation(organizationLogin: string): Promise<void> {
    if (installingOrganizationLogin.value) return;

    installingOrganizationLogin.value = organizationLogin;
    try {
      const response = await requestSetup(organizationLogin);
      if (!response) return;

      if (response.existingInstallationId) {
        await completeSetup(response.state, response.existingInstallationId);
        return;
      }

      navigate(response.installationUrl);
    } finally {
      installingOrganizationLogin.value = null;
    }
  }

  async function completeSetup(state: string, installationId: string): Promise<void> {
    const parsed = githubInstallationCompleteRequestSchema.safeParse({ installationId, state });
    if (!parsed.success) {
      onError?.(
        'GitHub returned an invalid installation setup result. Reload Settings to try again.',
        parsed.error,
        'complete-workspace-github-installation',
      );
      return;
    }
    const currentScope = scopeKey.value;
    try {
      await completeMutation.mutateAsync(parsed.data);
      if (!isCurrentScope(currentScope)) return;
      await query.refetch({ throwOnError: false });
      if (isCurrentScope(currentScope)) {
        onSuccess?.('GitHub App access confirmed for this workspace.', 'complete-workspace-github-installation');
      }
    } catch (error) {
      if (isCurrentScope(currentScope)) {
        onError?.(getErrorMessage(error), error, 'complete-workspace-github-installation');
      }
    }
  }

  watch(
    [
      canConfigure,
      enabled,
      scopeKey,
      () => organizations?.value,
      () => query.data.value,
      () => query.error.value,
      () => query.isFetching.value,
      () => completeMutation.isPending.value,
    ],
    async () => {
      if (!canConfigure.value || !enabled.value) {
        attemptedOrganizations.clear();
        return;
      }
      // Do not infer absence from a failed or unfinished status request.
      if (!query.data.value || query.error.value || query.isFetching.value || completeMutation.isPending.value) return;
      const currentScope = scopeKey.value;
      for (const organization of organizations?.value ?? []) {
        if (!isCurrentScope(currentScope) || !canConfigure.value) return;
        const login = organization.organizationLogin.toLowerCase();
        const hasAssociation = () => items.value.some((item) => item.organizationLogin.toLowerCase() === login);
        const isStillAllowed = () =>
          !!organizations?.value.some((item) => item.id === organization.id) && !hasAssociation();
        const attemptKey = `${currentScope}:${organization.id}`;
        // Preserve every saved state, especially deliberate local disconnects.
        // Each missing link gets one attempt per Settings visit, not a retry loop.
        if (hasAssociation() || attemptedOrganizations.has(attemptKey)) continue;
        attemptedOrganizations.add(attemptKey);
        await beginSetup(organization.organizationLogin, isStillAllowed);
      }
    },
    { immediate: true },
  );

  watch(
    () => query.error.value,
    (error) => {
      if (error) onError?.(getErrorMessage(error), error, 'load-workspace-github-installations');
    },
  );

  return {
    beginInstallation,
    beginSetup,
    completeSetup,
    installingOrganizationLogin,
    isLoaded,
    items,
  };
}

import {
  githubInstallationCompleteRequestSchema,
  githubInstallationSetupRequestSchema,
  type GitHubInstallationSetupResponse,
  type WorkspaceGitHubOrganizationResponse,
  type WorkspaceGitHubInstallation,
} from '@gitiempo/shared';
import { computed, onScopeDispose, ref, shallowRef, watch, type ComputedRef, type Ref } from 'vue';

import { ApiError } from '@gitiempo/web-shared/http';

import {
  useCompleteWorkspaceGitHubInstallationMutation,
  useReverifyWorkspaceGitHubInstallationMutation,
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
  | 'reverifyWorkspaceGitHubInstallation'
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

function getInstallationsErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return 'GitHub integration is not available on this server. Please contact support to update the server.';
  }
  if (error instanceof ApiError && error.status === 503) {
    return 'GitHub App integration is not configured.';
  }
  return getErrorMessage(error);
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
  const reverifyMutation = useReverifyWorkspaceGitHubInstallationMutation({ client, scope });
  const items = computed(() => query.data.value?.items ?? []);
  const isLoaded = computed(
    () => query.data.value !== undefined && query.error.value === null,
  );
  const installingOrganizationLogin = ref<string | null>(null);
  const scopeKey = computed(() => JSON.stringify(scope.value));
  const pendingChecks = shallowRef<{ login: string; scope: string }[]>([]);
  const checkingOrganizationLogins = computed(() => [...new Set(
    pendingChecks.value.filter((check) => check.scope === scopeKey.value).map((check) => check.login),
  )]);
  const attemptedReconciliations = new Set<string>();
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
        'Authorize GitHub organization access from your profile before setting up the GitHub App.',
        new Error('GitHub organization access is required for installation setup'),
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
        onError?.(getInstallationsErrorMessage(error), error, 'setup-workspace-github-installation');
      }
      return null;
    }
  }

  async function beginSetup(
    organizationLogin: string,
    isStillAllowed: () => boolean = () => true,
  ): Promise<void> {
    if (!isStillAllowed()) return;
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
        onError?.(getInstallationsErrorMessage(error), error, 'complete-workspace-github-installation');
      }
    }
  }

  async function reverifyInstallation(
    associationId: string,
  ): Promise<WorkspaceGitHubInstallation | null> {
    if (!enabled.value) return null;
    const currentScope = scopeKey.value;
    try {
      const result = await reverifyMutation.mutateAsync(associationId);
      if (isCurrentScope(currentScope)) {
        await query.refetch({ throwOnError: false });
      }
      return isCurrentScope(currentScope) ? result : null;
    } catch (error) {
      if (isCurrentScope(currentScope)) {
        onError?.(getErrorMessage(error), error, 'reverify-workspace-github-installation');
      }
      return null;
    }
  }

  function beginOrganizationCheck(organizationLogin: string, currentScope: string): () => void {
    const check = { login: organizationLogin.trim().toLowerCase(), scope: currentScope };
    pendingChecks.value = [...pendingChecks.value, check];
    return () => {
      pendingChecks.value = pendingChecks.value.filter((pending) => pending !== check);
    };
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
      if (!enabled.value) {
        attemptedReconciliations.clear();
        return;
      }
      // Do not infer absence from a failed or unfinished status request.
      if (!query.data.value || query.error.value || query.isFetching.value || completeMutation.isPending.value) return;
      const currentScope = scopeKey.value;
      for (const organization of organizations?.value ?? []) {
        if (!isCurrentScope(currentScope)) return;
        const login = organization.organizationLogin.toLowerCase();
        const association = items.value.find(
          (item) => item.organizationLogin.toLowerCase() === login,
        );
        const attemptKey = `${currentScope}:${organization.id}`;
        if (attemptedReconciliations.has(attemptKey)) continue;
        // A verified row is checked against GitHub on page entry. Non-verified
        // rows are discovered through setup, except explicit local disconnects.
        if (association?.status === 'disconnected') {
          attemptedReconciliations.add(attemptKey);
          continue;
        }
        // Setup discovery requires OAuth organization access. Do not consume this
        // organization's one automatic discovery attempt until that access is ready.
        if (association?.status !== 'verified' && !canConfigure.value) continue;
        attemptedReconciliations.add(attemptKey);
        const finishCheck = beginOrganizationCheck(organization.organizationLogin, currentScope);
        try {
          if (association?.status === 'verified') {
            const result = await reverifyInstallation(association.id);
            if (result && result.status !== 'verified' && canConfigure.value) {
              const isStillAllowed = () =>
                !!organizations?.value.some((item) => item.id === organization.id);
              await beginSetup(organization.organizationLogin, isStillAllowed);
            } else if (result && result.status !== 'verified') {
              // Keep the verified-row recheck one-time, but let the later
              // unavailable-association discovery run once OAuth access arrives.
              attemptedReconciliations.delete(attemptKey);
            }
          } else {
            const isStillAllowed = () =>
              !!organizations?.value.some((item) => item.id === organization.id);
            await beginSetup(organization.organizationLogin, isStillAllowed);
          }
        } finally {
          finishCheck();
        }
      }
    },
    { immediate: true },
  );

  watch(
    () => query.error.value,
    (error) => {
      if (error) onError?.(getInstallationsErrorMessage(error), error, 'load-workspace-github-installations');
    },
  );

  return {
    beginInstallation,
    beginSetup,
    completeSetup,
    installingOrganizationLogin,
    checkingOrganizationLogins,
    isLoaded,
    items,
  };
}

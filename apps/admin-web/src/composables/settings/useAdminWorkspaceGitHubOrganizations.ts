import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import {
  addWorkspaceGitHubOrganizationSchema,
  workspaceGitHubOrganizationRecoveryPayloadSchema,
  type WorkspaceGitHubOrganizationRecoveryPayload,
  type WorkspaceGitHubOrganizationResponse,
} from '@gitiempo/shared';
import {
  useAddWorkspaceGitHubOrganizationMutation,
  useRemoveWorkspaceGitHubOrganizationMutation,
  useWorkspaceGitHubOrganizationsQuery,
} from '@/composables/query';
import {
  getAdminSettingsClient,
  type AdminSettingsClient,
} from '@/services/admin-settings-client';
import type { AdminServerStateScope } from '@/lib/query-keys';
import { buildGitHubWorkspaceAccessChecklist } from '@/components/settings/github-workspace-access';

/* eslint-disable no-unused-vars */
interface UseAdminWorkspaceGitHubOrganizationsOptions {
  accessToken: Ref<string | null> | ComputedRef<string | null>;
  client?: Pick<
    AdminSettingsClient,
    | 'addWorkspaceGitHubOrganization'
    | 'listWorkspaceGitHubOrganizations'
    | 'removeWorkspaceGitHubOrganization'
  >;
  onError?: (
    message: string,
    error: unknown | undefined,
    action: string,
  ) => void;
  onSuccess?: (message: string, action: string) => void;
  githubAppInstallUrl?: string | null;
  scope: Ref<AdminServerStateScope> | ComputedRef<AdminServerStateScope>;
  userAppUrl?: string | null;
}
/* eslint-enable no-unused-vars */

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'An unexpected error occurred';
}

function getRecoveryPayload(
  error: unknown,
): WorkspaceGitHubOrganizationRecoveryPayload | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const candidates: unknown[] = [];

  if ('recovery' in error) {
    candidates.push(error.recovery);
  }

  if (
    'body' in error &&
    error.body &&
    typeof error.body === 'object' &&
    'recovery' in error.body
  ) {
    candidates.push(error.body.recovery);
  }

  for (const candidate of candidates) {
    const parsed =
      workspaceGitHubOrganizationRecoveryPayloadSchema.safeParse(candidate);
    if (parsed.success) {
      return parsed.data;
    }
  }

  return null;
}

export function useAdminWorkspaceGitHubOrganizations({
  accessToken,
  client = getAdminSettingsClient(),
  githubAppInstallUrl = null,
  onError,
  onSuccess,
  scope,
  userAppUrl = null,
}: UseAdminWorkspaceGitHubOrganizationsOptions) {
  const organizationLogin = ref('');
  const organizationLoginError = ref<string | null>(null);
  const recovery = ref<WorkspaceGitHubOrganizationRecoveryPayload | null>(
    null,
  );
  const removingOrganizationId = ref<string | null>(null);
  const query = useWorkspaceGitHubOrganizationsQuery({
    client,
    accessToken,
    scope,
  });
  const addMutation = useAddWorkspaceGitHubOrganizationMutation({
    client,
    accessToken,
    scope,
  });
  const removeMutation = useRemoveWorkspaceGitHubOrganizationMutation({
    client,
    accessToken,
    scope,
  });
  const items = computed<WorkspaceGitHubOrganizationResponse[]>(
    () => query.data.value?.items ?? [],
  );
  const loading = computed(() => query.isFetching.value);
  const initialLoaded = computed(
    () => query.data.value !== undefined || query.error.value !== null,
  );
  const isInitialLoading = computed(
    () => loading.value && !initialLoaded.value,
  );
  const requestError = computed(() =>
    query.error.value ? getErrorMessage(query.error.value) : null,
  );
  const recoveryChecklist = computed(() => {
    if (!recovery.value) {
      return null;
    }

    return buildGitHubWorkspaceAccessChecklist({
      githubAppInstallUrl,
      recovery: recovery.value,
      userAppUrl,
    });
  });

  async function retryLoad(): Promise<void> {
    try {
      await query.refetch({ throwOnError: true });
    } catch (error) {
      onError?.(
        getErrorMessage(error),
        error,
        'retry-workspace-github-organizations',
      );
    }
  }

  async function addOrganization(): Promise<void> {
    const parsed = addWorkspaceGitHubOrganizationSchema.safeParse({
      organizationLogin: organizationLogin.value,
    });
    if (!parsed.success) {
      organizationLoginError.value =
        parsed.error.issues[0]?.message ?? 'Organization login is required';
      return;
    }

    organizationLoginError.value = null;

    try {
      organizationLogin.value = parsed.data.organizationLogin;
      await addMutation.mutateAsync(parsed.data);
      await query.refetch({ throwOnError: false });
      recovery.value = null;
      organizationLogin.value = '';
      onSuccess?.(
        'GitHub organization added.',
        'add-workspace-github-organization',
      );
    } catch (error) {
      recovery.value = getRecoveryPayload(error);
      onError?.(
        getErrorMessage(error),
        error,
        'add-workspace-github-organization',
      );
    }
  }

  async function removeOrganization(organizationId: string): Promise<void> {
    removingOrganizationId.value = organizationId;

    try {
      await removeMutation.mutateAsync(organizationId);
      await query.refetch({ throwOnError: false });
      onSuccess?.(
        'GitHub organization removed.',
        'remove-workspace-github-organization',
      );
    } catch (error) {
      onError?.(
        getErrorMessage(error),
        error,
        'remove-workspace-github-organization',
      );
    } finally {
      removingOrganizationId.value = null;
    }
  }

  watch(organizationLogin, () => {
    organizationLoginError.value = null;
    recovery.value = null;
  });

  watch(
    () => query.error.value,
    (error) => {
      if (!error) return;

      onError?.(
        getErrorMessage(error),
        error,
        'load-workspace-github-organizations',
      );
    },
  );

  return {
    addOrganization,
    adding: computed(() => addMutation.isPending.value),
    isInitialLoading,
    items,
    loading,
    organizationLogin,
    organizationLoginError,
    recoveryChecklist,
    removingOrganizationId,
    removeOrganization,
    requestError,
    retryLoad,
  };
}

import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import {
  addWorkspaceGitHubOrganizationSchema,
  workspaceGitHubOrganizationRecoveryPayloadSchema,
  type GitHubOwner,
  type WorkspaceGitHubOrganizationRecoveryPayload,
  type WorkspaceGitHubOrganizationResponse,
} from '@gitiempo/shared';
import {
  useAddWorkspaceGitHubOrganizationMutation,
  useAvailableGitHubOrganizationsQuery,
  useRemoveWorkspaceGitHubOrganizationMutation,
  useWorkspaceGitHubOrganizationsQuery,
} from '@/composables/query';
import {
  getAdminSettingsClient,
  type AdminSettingsClient,
} from '@/services/admin-settings-client';
import type { AdminServerStateScope } from '@/lib/query-keys';
import { buildGitHubWorkspaceAccessChecklist } from '@/components/settings/github-workspace-access';

interface UseAdminWorkspaceGitHubOrganizationsOptions {
  client?: Pick<
    AdminSettingsClient,
    | 'addWorkspaceGitHubOrganization'
    | 'listAvailableGitHubOrganizations'
    | 'listWorkspaceGitHubOrganizations'
    | 'removeWorkspaceGitHubOrganization'
  >;
  availableOrganizationsEnabled: Ref<boolean> | ComputedRef<boolean>;
  enabled: Ref<boolean> | ComputedRef<boolean>;
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'An unexpected error occurred';
}

function normalizeGitHubLogin(login: string): string {
  return login.trim().toLowerCase();
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
  availableOrganizationsEnabled,
  client = getAdminSettingsClient(),
  enabled,
  githubAppInstallUrl = null,
  onError,
  onSuccess,
  scope,
  userAppUrl = null,
}: UseAdminWorkspaceGitHubOrganizationsOptions) {
  const selectedOrganization = ref<GitHubOwner | null>(null);
  const organizationLoginError = ref<string | null>(null);
  const recovery = ref<WorkspaceGitHubOrganizationRecoveryPayload | null>(
    null,
  );
  const removingOrganizationId = ref<string | null>(null);
  const query = useWorkspaceGitHubOrganizationsQuery({
    client,
    enabled,
    scope,
  });
  const availableOrganizationsQuery = useAvailableGitHubOrganizationsQuery({
    client,
    enabled: availableOrganizationsEnabled,
    scope,
  });
  const addMutation = useAddWorkspaceGitHubOrganizationMutation({
    client,
    scope,
  });
  const removeMutation = useRemoveWorkspaceGitHubOrganizationMutation({
    client,
    scope,
  });
  const items = computed<WorkspaceGitHubOrganizationResponse[]>(
    () => query.data.value?.items ?? [],
  );
  const allowedOrganizationLogins = computed(
    () =>
      new Set(
        items.value.map((item) =>
          normalizeGitHubLogin(item.organizationLogin),
        ),
      ),
  );
  const availableOrganizations = computed<GitHubOwner[]>(() =>
    (availableOrganizationsQuery.data.value?.items ?? []).filter(
      (owner) => owner.type === 'organization',
    ),
  );
  const selectableOrganizations = computed<GitHubOwner[]>(() =>
    availableOrganizations.value.filter(
      (owner) =>
        !allowedOrganizationLogins.value.has(normalizeGitHubLogin(owner.login)),
    ),
  );
  const selectedOrganizationLogin = computed(
    () => selectedOrganization.value?.login ?? '',
  );
  const availableOrganizationsLoading = computed(
    () => availableOrganizationsQuery.isFetching.value,
  );
  const availableOrganizationsLoaded = computed(
    () =>
      availableOrganizationsQuery.data.value !== undefined ||
      availableOrganizationsQuery.error.value !== null,
  );
  const availableOrganizationsInitialLoading = computed(
    () =>
      availableOrganizationsLoading.value && !availableOrganizationsLoaded.value,
  );
  const availableOrganizationsRequestError = computed(() =>
    availableOrganizationsQuery.error.value
      ? getErrorMessage(availableOrganizationsQuery.error.value)
      : null,
  );
  const availableOrganizationsEmptyMessage = computed(() => {
    if (
      availableOrganizationsLoading.value ||
      availableOrganizationsRequestError.value ||
      selectableOrganizations.value.length > 0
    ) {
      return null;
    }

    if (availableOrganizations.value.length === 0) {
      return 'Your connected GitHub account has no available organizations.';
    }

    return 'All available GitHub organizations are already allowed for this workspace.';
  });
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

  async function retryAvailableOrganizations(): Promise<void> {
    try {
      await availableOrganizationsQuery.refetch({ throwOnError: true });
    } catch (error) {
      onError?.(
        getErrorMessage(error),
        error,
        'retry-available-github-organizations',
      );
    }
  }

  async function addOrganization(): Promise<void> {
    const organizationLogin = selectedOrganizationLogin.value;

    if (!organizationLogin) {
      organizationLoginError.value = 'Select a GitHub organization';
      return;
    }

    if (
      allowedOrganizationLogins.value.has(normalizeGitHubLogin(organizationLogin))
    ) {
      organizationLoginError.value =
        'This organization is already allowed for this workspace';
      return;
    }

    const parsed = addWorkspaceGitHubOrganizationSchema.safeParse({
      organizationLogin,
    });
    if (!parsed.success) {
      organizationLoginError.value =
        parsed.error.issues[0]?.message ?? 'Organization login is required';
      return;
    }

    organizationLoginError.value = null;

    try {
      await addMutation.mutateAsync(parsed.data);
      await query.refetch({ throwOnError: false });
      recovery.value = null;
      selectedOrganization.value = null;
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

  watch(selectedOrganization, () => {
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

  watch(
    () => availableOrganizationsQuery.error.value,
    (error) => {
      if (!error) return;

      onError?.(
        getErrorMessage(error),
        error,
        'load-available-github-organizations',
      );
    },
  );

  return {
    addOrganization,
    adding: computed(() => addMutation.isPending.value),
    availableOrganizationsEmptyMessage,
    availableOrganizationsInitialLoading,
    availableOrganizationsLoading,
    availableOrganizationsRequestError,
    isInitialLoading,
    items,
    loading,
    organizationLoginError,
    recoveryChecklist,
    removingOrganizationId,
    removeOrganization,
    requestError,
    retryAvailableOrganizations,
    retryLoad,
    selectableOrganizations,
    selectedOrganization,
  };
}

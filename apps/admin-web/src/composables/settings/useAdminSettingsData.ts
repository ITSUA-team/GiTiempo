import { useQueryClient } from '@tanstack/vue-query';
import { computed, watch, type ComputedRef, type Ref } from 'vue';
import type {
  WorkspaceResponse,
  WorkspaceSettingsResponse,
} from '@gitiempo/shared';
import {
  useWorkspaceQuery,
  useWorkspaceSettingsQuery,
} from '@/composables/query';

import {
  getAdminSettingsClient,
  type AdminSettingsClient,
} from '@/services/admin-settings-client';
import { adminSettingsKeys, type AdminServerStateScope } from '@/lib/query-keys';

interface AdminSettingsDataResult {
  settings: WorkspaceSettingsResponse;
  workspace: WorkspaceResponse;
}

/* eslint-disable no-unused-vars */
interface UseAdminSettingsDataOptions {
  accessToken: Ref<string | null> | ComputedRef<string | null>;
  client?: Pick<
    AdminSettingsClient,
    'getWorkspace' | 'getWorkspaceSettings'
  >;
  onError?: (
    message: string,
    error: unknown | undefined,
    action: string,
  ) => void;
  scope: Ref<AdminServerStateScope> | ComputedRef<AdminServerStateScope>;
}
/* eslint-enable no-unused-vars */

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}

export function useAdminSettingsData({
  accessToken,
  client = getAdminSettingsClient(),
  onError,
  scope,
}: UseAdminSettingsDataOptions) {
  const queryClient = useQueryClient();
  const workspaceQuery = useWorkspaceQuery({
    client,
    accessToken,
    scope,
  });
  const workspaceSettingsQuery = useWorkspaceSettingsQuery({
    client,
    accessToken,
    scope,
  });
  const workspace = computed(() => workspaceQuery.data.value ?? null);
  const settings = computed(() => workspaceSettingsQuery.data.value ?? null);
  const result = computed<AdminSettingsDataResult | null>(() => {
    if (!workspace.value || !settings.value) {
      return null;
    }

    return { settings: settings.value, workspace: workspace.value };
  });
  const authError = computed(() =>
    accessToken.value ? null : 'Authentication is required to load settings.',
  );
  const queryError = computed(
    () => workspaceQuery.error.value ?? workspaceSettingsQuery.error.value ?? null,
  );
  const requestError = computed(() =>
    authError.value ?? (queryError.value ? getErrorMessage(queryError.value) : null),
  );
  const loading = computed(
    () => workspaceQuery.isFetching.value || workspaceSettingsQuery.isFetching.value,
  );
  const initialLoaded = computed(
    () => result.value !== null || authError.value !== null,
  );
  const isInitialLoading = computed(() => loading.value && !initialLoaded.value);

  function applySettingsData(nextData: AdminSettingsDataResult): void {
    queryClient.setQueryData(
      adminSettingsKeys.workspace(scope.value),
      nextData.workspace,
    );
    queryClient.setQueryData(
      adminSettingsKeys.workspaceSettings(scope.value),
      nextData.settings,
    );
  }

  async function loadSettings(
    action = 'load-settings',
  ): Promise<AdminSettingsDataResult | null> {
    if (!accessToken.value) {
      const message = 'Authentication is required to load settings.';
      onError?.(message, undefined, action);
      return null;
    }

    try {
      const [workspaceResult, settingsResult] = await Promise.all([
        workspaceQuery.refetch({ throwOnError: true }),
        workspaceSettingsQuery.refetch({ throwOnError: true }),
      ]);

      if (!workspaceResult.data || !settingsResult.data) {
        throw new Error('Settings could not be loaded.');
      }

      const nextData = {
        settings: settingsResult.data,
        workspace: workspaceResult.data,
      };

      applySettingsData(nextData);
      return nextData;
    } catch (error) {
      const message = getErrorMessage(error);
      onError?.(message, error, action);
      return null;
    }
  }

  async function retryLoad(): Promise<AdminSettingsDataResult | null> {
    return loadSettings('retry-settings');
  }

  watch(queryError, (error) => {
    if (error) {
      onError?.(getErrorMessage(error), error, 'load-settings');
    }
  });

  return {
    applySettingsData,
    initialLoaded,
    isInitialLoading,
    loadSettings,
    loading,
    requestError,
    result,
    retryLoad,
    settings,
    workspace,
  };
}

export type { AdminSettingsDataResult };

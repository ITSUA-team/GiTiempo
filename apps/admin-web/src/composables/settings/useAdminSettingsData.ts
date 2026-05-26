import { computed, shallowRef, type ComputedRef, type Ref } from 'vue';
import type {
  WorkspaceResponse,
  WorkspaceSettingsResponse,
} from '@gitiempo/shared';
import {
  useWorkspaceQuery,
  useWorkspaceSettingsQuery,
} from '@gitiempo/web-shared/query';

import { adminSettingsClient } from '@/services/admin-settings-client';
import type { AdminSettingsClient } from '@/services/admin-settings-client';

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
}
/* eslint-enable no-unused-vars */

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}

export function useAdminSettingsData({
  accessToken,
  client = adminSettingsClient,
  onError,
}: UseAdminSettingsDataOptions) {
  const workspace = shallowRef<WorkspaceResponse | null>(null);
  const settings = shallowRef<WorkspaceSettingsResponse | null>(null);
  const loading = shallowRef(true);
  const initialLoaded = shallowRef(false);
  const requestError = shallowRef<string | null>(null);
  const workspaceQuery = useWorkspaceQuery({
    client,
    accessToken,
    enabled: false,
  });
  const workspaceSettingsQuery = useWorkspaceSettingsQuery({
    client,
    accessToken,
    enabled: false,
  });
  const isInitialLoading = computed(() => loading.value && !initialLoaded.value);

  function applySettingsData(nextData: AdminSettingsDataResult): void {
    workspace.value = nextData.workspace;
    settings.value = nextData.settings;
  }

  async function loadSettings(
    action = 'load-settings',
  ): Promise<AdminSettingsDataResult | null> {
    loading.value = true;
    requestError.value = null;

    if (!accessToken.value) {
      const message = 'Authentication is required to load settings.';
      requestError.value = message;
      initialLoaded.value = true;
      loading.value = false;
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
      initialLoaded.value = true;
      return nextData;
    } catch (error) {
      const message = getErrorMessage(error);
      requestError.value = message;
      onError?.(message, error, action);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function retryLoad(): Promise<AdminSettingsDataResult | null> {
    return loadSettings('retry-settings');
  }

  return {
    applySettingsData,
    initialLoaded,
    isInitialLoading,
    loadSettings,
    loading,
    requestError,
    retryLoad,
    settings,
    workspace,
  };
}

export type { AdminSettingsDataResult };

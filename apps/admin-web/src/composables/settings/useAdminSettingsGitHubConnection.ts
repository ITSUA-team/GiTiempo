import { computed, watch, type ComputedRef, type Ref } from 'vue';
import { useGitHubConnectionStatusQuery } from '@/composables/query';
import type { AdminServerStateScope } from '@/lib/query-keys';
import {
  getAdminSettingsClient,
  type AdminSettingsClient,
} from '@/services/admin-settings-client';

interface UseAdminSettingsGitHubConnectionOptions {
  client?: Pick<AdminSettingsClient, 'getGitHubConnectionStatus'>;
  enabled: Ref<boolean> | ComputedRef<boolean>;
  onError?: (
    message: string,
    error: unknown | undefined,
    action: string,
  ) => void;
  scope: Ref<AdminServerStateScope> | ComputedRef<AdminServerStateScope>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}

export function useAdminSettingsGitHubConnection({
  client = getAdminSettingsClient(),
  enabled,
  onError,
  scope,
}: UseAdminSettingsGitHubConnectionOptions) {
  const query = useGitHubConnectionStatusQuery({
    client,
    enabled,
    scope,
  });
  const connection = computed(() => query.data.value ?? null);
  const account = computed(() => connection.value?.account ?? null);
  const requestError = computed(() =>
    query.error.value ? getErrorMessage(query.error.value) : null,
  );
  const connectionStatus = computed(() => query.data.value ?? null);
  const loading = computed(() => query.isFetching.value);
  const initialLoaded = computed(
    () => query.data.value !== undefined || query.error.value !== null,
  );
  const isInitialLoading = computed(
    () => loading.value && !initialLoaded.value,
  );
  const isConnected = computed(
    () => !requestError.value && connection.value?.status === 'connected',
  );

  async function retryLoad(): Promise<void> {
    try {
      await query.refetch({ throwOnError: true });
    } catch (error) {
      onError?.(
        getErrorMessage(error),
        error,
        'retry-github-connection-status',
      );
    }
  }

  watch(
    () => query.error.value,
    (error) => {
      if (!error) return;

      onError?.(
        getErrorMessage(error),
        error,
        'load-github-connection-status',
      );
    },
  );

  return {
    account,
    connection,
    isConnected,
    connectionStatus,
    isInitialLoading,
    loading,
    requestError,
    retryLoad,
  };
}

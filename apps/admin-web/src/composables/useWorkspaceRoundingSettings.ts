import { getErrorMessage } from '@gitiempo/web-shared';
import { computed, watch, type MaybeRefOrGetter } from 'vue';

import { useToasts } from '@/composables/feedback/useToasts';
import { useWorkspaceSettingsQuery } from '@/composables/query';
import type { AdminServerStateScope } from '@/lib/query-keys';
import { getAdminSettingsClient } from '@/services/admin-settings-client';

interface UseWorkspaceRoundingSettingsOptions<TFallback extends number | null> {
  enabled: MaybeRefOrGetter<boolean>;
  /** Step shown while the workspace settings have not loaded (null = unknown). */
  fallback: TFallback;
  feature: string;
  scope: MaybeRefOrGetter<AdminServerStateScope>;
}

export function useWorkspaceRoundingSettings<TFallback extends number | null>(
  options: UseWorkspaceRoundingSettingsOptions<TFallback>,
) {
  const { errorToast } = useToasts();
  const workspaceSettingsQuery = useWorkspaceSettingsQuery({
    client: getAdminSettingsClient(),
    enabled: options.enabled,
    scope: options.scope,
  });

  const workspaceRoundingStepMinutes = computed<number | TFallback>(
    () =>
      workspaceSettingsQuery.data.value?.timeRoundingStepMinutes ??
      options.fallback,
  );

  watch(
    () => workspaceSettingsQuery.error.value,
    (error) => {
      if (error) {
        errorToast(getErrorMessage(error), {
          error,
          logContext: {
            action: 'load-workspace-settings',
            feature: options.feature,
          },
        });
      }
    },
  );

  return { workspaceSettingsQuery, workspaceRoundingStepMinutes };
}

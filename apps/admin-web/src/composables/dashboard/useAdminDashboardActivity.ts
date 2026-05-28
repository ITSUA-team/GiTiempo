import { computed, shallowRef, watch, type ComputedRef, type Ref } from 'vue';

import { ADMIN_DASHBOARD_ACTIVITY_PREVIEW_LIMIT } from '@/constants/admin-dashboard';
import type { AdminDashboardActivityRow } from '@/lib/admin-dashboard-view-model';

interface UseAdminDashboardActivityOptions {
  allActivityRows: Ref<AdminDashboardActivityRow[]>;
  initialLoaded: Ref<boolean> | ComputedRef<boolean>;
  loadError: Ref<string | null> | ComputedRef<string | null>;
  loading: Ref<boolean> | ComputedRef<boolean>;
  previewLimit?: number;
}

export function useAdminDashboardActivity({
  allActivityRows,
  initialLoaded,
  loadError,
  loading,
  previewLimit = ADMIN_DASHBOARD_ACTIVITY_PREVIEW_LIMIT,
}: UseAdminDashboardActivityOptions) {
  const showAllActivity = shallowRef(false);
  const isActivityEmpty = computed(
    () =>
      initialLoaded.value &&
      !loading.value &&
      loadError.value === null &&
      allActivityRows.value.length === 0,
  );
  const hasMoreActivity = computed(() => allActivityRows.value.length > previewLimit);
  const activityRows = computed(() =>
    showAllActivity.value
      ? allActivityRows.value
      : allActivityRows.value.slice(0, previewLimit),
  );

  function toggleActivityRows(): void {
    if (!hasMoreActivity.value) {
      showAllActivity.value = false;
      return;
    }

    showAllActivity.value = !showAllActivity.value;
  }

  watch(hasMoreActivity, (nextHasMoreActivity) => {
    if (!nextHasMoreActivity) {
      showAllActivity.value = false;
    }
  });

  return {
    activityRows,
    hasMoreActivity,
    isActivityEmpty,
    showAllActivity,
    toggleActivityRows,
  };
}

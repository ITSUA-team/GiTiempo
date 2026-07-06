<script setup lang="ts">
import { computed } from 'vue';
import { StatCard, SurfaceCard } from '@gitiempo/web-shared';

import DashboardPageSkeleton from '@/components/dashboard/DashboardPageSkeleton.vue';
import DashboardRecentActivityFeed from '@/components/dashboard/DashboardRecentActivityFeed.vue';
import RequestErrorCard from '@/components/RequestErrorCard.vue';
import { useAdminDashboardActivity } from '@/composables/dashboard/useAdminDashboardActivity';
import { useAdminDashboardData } from '@/composables/dashboard/useAdminDashboardData';
import { useToasts } from '@/composables/feedback/useToasts';
import { getAdminServerStateScope } from '@/lib/server-state-scope';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const { errorToast } = useToasts();
const isAuthenticated = computed(() => Boolean(authStore.accessToken));
const scope = computed(() => getAdminServerStateScope(authStore.accessToken));

const dashboard = useAdminDashboardData({
  enabled: isAuthenticated,
  onError(message, error, action) {
    errorToast(message, {
      error,
      logContext: { action, feature: 'dashboard' },
    });
  },
  role: computed(() => authStore.profile?.role ?? null),
  scope,
});
const {
  activityRows,
  hasMoreActivity,
  showAllActivity,
  toggleActivityRows,
} = useAdminDashboardActivity({
  allActivityRows: dashboard.allActivityRows,
  initialLoaded: dashboard.initialLoaded,
  loadError: dashboard.loadError,
  loading: dashboard.loading,
});
const { isInitialLoading, loadError, loading, refresh, stats } = dashboard;
</script>

<template>
  <div class="flex flex-col gap-6">
    <template v-if="isInitialLoading">
      <DashboardPageSkeleton />
    </template>

    <template v-else-if="loadError && !loading">
      <RequestErrorCard
        title="Failed to load dashboard"
        :message="loadError"
        @retry="refresh"
      />
    </template>

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          v-for="stat in stats"
          :key="stat.label"
          :label="stat.label"
          :value="stat.value"
          :description="stat.description"
        />
      </div>

      <SurfaceCard padding-class="p-5">
        <DashboardRecentActivityFeed
          :rows="activityRows"
          :can-view-all="hasMoreActivity"
          :expanded="showAllActivity"
          @toggle-view-all="toggleActivityRows"
        />
      </SurfaceCard>
    </template>
  </div>
</template>

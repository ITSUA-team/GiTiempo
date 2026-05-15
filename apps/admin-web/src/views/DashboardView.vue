<script setup lang="ts">
import { computed } from 'vue';
import { StatCard, StatsHeader, SurfaceCard } from '@gitiempo/web-shared';

import DashboardPageSkeleton from '@/components/dashboard/DashboardPageSkeleton.vue';
import DashboardRecentActivityFeed from '@/components/dashboard/DashboardRecentActivityFeed.vue';
import RequestErrorCard from '@/components/RequestErrorCard.vue';
import { useAdminDashboardPage } from '@/composables/useAdminDashboardPage';
import { useToasts } from '@/composables/useToasts';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const { errorToast } = useToasts();

const {
  activityRows,
  hasMoreActivity,
  isInitialLoading,
  loadError,
  loading,
  refresh,
  showAllActivity,
  stats,
  toggleActivityRows,
} = useAdminDashboardPage({
  accessToken: computed(() => authStore.accessToken),
  onError(message, error, action) {
    errorToast(message, {
      error,
      logContext: { action, feature: 'dashboard' },
    });
  },
});
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
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
      <StatsHeader
        title="Dashboard"
        description="Workspace overview with key metrics and recent activity."
      />

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

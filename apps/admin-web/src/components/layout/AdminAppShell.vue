<script setup lang="ts">
import { computed } from "vue";
import { RouterView, useRoute } from "vue-router";
import { WorkspaceHeader, WorkspaceNavigation } from "@gitiempo/web-shared";
import { getCounterpartWorkspaceHref } from "@gitiempo/web-shared/workspace-link";

import { routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const authStore = useAuthStore();
const userWorkspaceHref = getCounterpartWorkspaceHref({
  configuredUrl: import.meta.env.VITE_USER_APP_URL,
  fallbackPath: "/login",
  localhostPort: "5173",
});

const navItems = computed(() => [
  { label: "Dashboard", name: routeNames.dashboard },
  { label: "Reports", name: routeNames.reports },
  { label: "Invoices", name: routeNames.invoices },
  { label: "Members", name: routeNames.members },
  { label: "Projects", name: routeNames.projects },
  { label: "Settings", name: routeNames.settings },
]);
</script>

<template>
  <div class="bg-app-bg text-text-dark min-h-screen">
    <WorkspaceHeader
      :counterpart-href="userWorkspaceHref"
      counterpart-label="User workspace"
      :display-name="authStore.displayName"
      :user-initials="authStore.userInitials"
      :workspace-name="authStore.workspaceName"
    />

    <div class="flex min-h-[calc(100vh-4rem)]">
      <WorkspaceNavigation
        :active-name="route.name?.toString()"
        :items="navItems"
      />

      <main class="flex-1 p-4 sm:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

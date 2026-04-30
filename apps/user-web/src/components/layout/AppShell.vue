<script setup lang="ts">
import { computed } from "vue";
import { RouterView, useRoute } from "vue-router";
import { WorkspaceHeader, WorkspaceNavigation } from "@gitiempo/web-shared";
import { getCounterpartWorkspaceHref } from "@gitiempo/web-shared/workspace-link";

import { routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const authStore = useAuthStore();
const adminWorkspaceHref = getCounterpartWorkspaceHref({
  configuredUrl: import.meta.env.VITE_ADMIN_APP_URL,
  fallbackPath: "/login",
  localhostPort: "5174",
});

const navItems = computed(() => [
  {
    label: "Dashboard",
    name: routeNames.dashboard,
  },
  {
    label: "Timer",
    name: routeNames.timer,
  },
  {
    label: "Time Entries",
    name: routeNames.timeEntries,
  },
  {
    label: "Projects",
    name: routeNames.project,
    to: { name: routeNames.project, params: { projectId: "workspace-alpha" } },
  },
  {
    label: "Profile",
    name: routeNames.profile,
  },
]);
</script>

<template>
  <div class="bg-app-bg text-text-dark min-h-screen">
    <WorkspaceHeader
      :counterpart-href="adminWorkspaceHref"
      counterpart-label="Admin workspace"
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

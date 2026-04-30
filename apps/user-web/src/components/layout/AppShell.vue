<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { WorkspaceHeader } from "@gitiempo/web-shared";
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

function isActive(name: string): boolean {
  if (name === routeNames.project) {
    return route.name === routeNames.project;
  }

  return route.name === name;
}
</script>

<template>
  <div class="min-h-screen bg-app-bg text-text-dark">
    <WorkspaceHeader
      :counterpart-href="adminWorkspaceHref"
      counterpart-label="Admin workspace"
      :display-name="authStore.displayName"
      :settings-to="{ name: routeNames.profile }"
      settings-label="Open profile settings"
      :user-initials="authStore.userInitials"
      :workspace-name="authStore.workspaceName"
    />

    <div class="flex min-h-[calc(100vh-4rem)]">
      <aside
        class="hidden border-r border-divider bg-surface sm:flex sm:w-52 sm:flex-col lg:w-60"
      >
        <nav class="flex flex-1 flex-col gap-1 py-4">
          <RouterLink
            v-for="item in navItems"
            :key="item.name"
            :to="item.to ?? { name: item.name }"
            :class="[
              'flex h-11 items-center rounded-r-md px-4 text-sm font-medium transition-colors',
              isActive(item.name)
                ? 'border-l-[3px] border-brand bg-accent-tint text-brand font-semibold'
                : 'text-text-dark hover:bg-app-bg',
            ]"
          >
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>
      </aside>

      <main class="flex-1 p-4 sm:p-6">
        <RouterView />
      </main>
    </div>

    <nav
      class="fixed inset-x-0 bottom-0 z-20 flex h-16 border-t border-divider bg-surface sm:hidden"
    >
      <RouterLink
        v-for="item in navItems"
        :key="`mobile-${item.name}`"
        :to="item.to ?? { name: item.name }"
        :class="isActive(item.name) ? 'text-brand' : 'text-text-muted'"
        class="flex flex-1 items-center justify-center px-2 text-center text-xs font-medium"
      >
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import {
  ClockIcon,
  FolderIcon,
  Squares2X2Icon,
  UserCircleIcon,
} from "@heroicons/vue/24/outline";
import { computed, markRaw } from "vue";
import { RouterView, useRoute } from "vue-router";
import { WorkspaceHeader, WorkspaceNavigation } from "@gitiempo/web-shared";
import { getCounterpartWorkspaceHref } from "@gitiempo/web-shared/workspace-link";

import TopBarTimer from "@/components/timer/TopBarTimer.vue";
import { appEnv } from "@/config/env";
import { routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const authStore = useAuthStore();
const dashboardIcon = markRaw(Squares2X2Icon);
const timeEntriesIcon = markRaw(ClockIcon);
const projectsIcon = markRaw(FolderIcon);
const profileIcon = markRaw(UserCircleIcon);
const adminWorkspaceHref = getCounterpartWorkspaceHref({
  configuredUrl: appEnv.adminAppUrl,
  fallbackPath: "/login",
});

const navItems = computed(() => [
  {
    icon: dashboardIcon,
    label: "Dashboard",
    name: routeNames.dashboard,
  },
  {
    icon: timeEntriesIcon,
    label: "Time Entries",
    name: routeNames.timeEntries,
  },
  {
    icon: projectsIcon,
    label: "Projects",
    name: routeNames.project,
    to: { name: routeNames.project },
  },
  {
    icon: profileIcon,
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
    >
      <template #center>
        <TopBarTimer />
      </template>
    </WorkspaceHeader>

    <div class="flex min-h-[calc(100vh-4rem)]">
      <WorkspaceNavigation
        :active-name="route.name?.toString()"
        :items="navItems"
      />

      <main class="min-w-0 flex-1 p-4 sm:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ChartBarSquareIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  FolderIcon,
  Squares2X2Icon,
  UsersIcon,
} from '@heroicons/vue/24/outline';
import { computed, markRaw } from 'vue';
import { RouterView, useRoute } from "vue-router";
import { WorkspaceHeader, WorkspaceNavigation } from "@gitiempo/web-shared";
import { getCounterpartWorkspaceHref } from "@gitiempo/web-shared/workspace-link";
import ConfirmDialog from "primevue/confirmdialog";
import Toast from "primevue/toast";

import { routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const authStore = useAuthStore();
const dashboardIcon = markRaw(Squares2X2Icon);
const reportsIcon = markRaw(ChartBarSquareIcon);
const invoicesIcon = markRaw(DocumentTextIcon);
const membersIcon = markRaw(UsersIcon);
const projectsIcon = markRaw(FolderIcon);
const settingsIcon = markRaw(Cog6ToothIcon);
const userWorkspaceHref = getCounterpartWorkspaceHref({
  configuredUrl: import.meta.env.VITE_USER_APP_URL,
  fallbackPath: "/login",
});

const navItems = computed(() => [
  { icon: dashboardIcon, label: "Dashboard", name: routeNames.dashboard },
  { icon: reportsIcon, label: "Reports", name: routeNames.reports },
  { icon: invoicesIcon, label: "Invoices", name: routeNames.invoices },
  { icon: membersIcon, label: "Members", name: routeNames.members },
  { icon: projectsIcon, label: "Projects", name: routeNames.projects },
  { icon: settingsIcon, label: "Settings", name: routeNames.settings },
]);

// TODO: Replace with an `activeNames` prop on WorkspaceNavigation when a second project subpage arrives.
const activeName = computed(() => {
  const name = route.name?.toString();

  if (name === routeNames.addProject) {
    return routeNames.projects;
  }

  return name;
});
</script>

<template>
  <div class="bg-app-bg text-text-dark min-h-screen">
    <Toast />
    <ConfirmDialog />
    <WorkspaceHeader
      :counterpart-href="userWorkspaceHref"
      counterpart-label="User workspace"
      :display-name="authStore.displayName"
      :user-initials="authStore.userInitials"
      :workspace-name="authStore.workspaceName"
    />

    <div class="flex min-h-[calc(100vh-4rem)]">
      <WorkspaceNavigation
        :active-name="activeName"
        :items="navItems"
      />

      <main class="flex-1 p-4 sm:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

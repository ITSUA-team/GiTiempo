<script setup lang="ts">
import { computed, markRaw, watch } from "vue";
import {
  ChartBarSquareIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  FolderIcon,
  Squares2X2Icon,
  UsersIcon,
} from '@heroicons/vue/24/outline';
import { RouterView, useRoute, useRouter } from "vue-router";
import { WorkspaceHeader, WorkspaceNavigation } from "@gitiempo/web-shared";
import { hasAllowedRole } from "@gitiempo/web-shared/router";
import { getCounterpartWorkspaceHref } from "@gitiempo/web-shared/workspace-link";

import { useToasts } from "@/composables/feedback/useToasts";
import { appEnv } from "@/config/env";
import { routeNames } from "@/router";
import { adminSettingsClient } from "@/services/admin-settings-client";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { errorToast } = useToasts();
const dashboardIcon = markRaw(Squares2X2Icon);
const reportsIcon = markRaw(ChartBarSquareIcon);
const invoicesIcon = markRaw(DocumentTextIcon);
const membersIcon = markRaw(UsersIcon);
const projectsIcon = markRaw(FolderIcon);
const settingsIcon = markRaw(Cog6ToothIcon);
const userWorkspaceHref = getCounterpartWorkspaceHref({
  configuredUrl: appEnv.userAppUrl,
  fallbackPath: "/login",
});
const pageNamesByRouteName: Record<string, string> = {
  [routeNames.addProject]: 'New Project',
  [routeNames.dashboard]: 'Dashboard',
  [routeNames.invoices]: 'Invoices',
  [routeNames.members]: 'Members',
  [routeNames.projects]: 'Projects',
  [routeNames.reports]: 'Reports',
  [routeNames.settings]: 'Settings',
};

let workspaceNameRequestToken: string | null = null;

const baseNavItems = [
  { icon: dashboardIcon, label: "Dashboard", name: routeNames.dashboard },
  { icon: reportsIcon, label: "Reports", name: routeNames.reports },
  { icon: invoicesIcon, label: "Invoices", name: routeNames.invoices },
  { icon: membersIcon, label: "Members", name: routeNames.members },
  { icon: projectsIcon, label: "Projects", name: routeNames.projects },
] as const;
const currentRole = computed(() => authStore.profile?.role ?? null);
const navItems = computed(() =>
  baseNavItems.filter((item) =>
    hasAllowedRole(
      router.resolve({ name: item.name }).meta.allowedRoles,
      currentRole.value,
    ),
  ),
);
const showSettings = computed(() =>
  hasAllowedRole(
    router.resolve({ name: routeNames.settings }).meta.allowedRoles,
    currentRole.value,
  ),
);
const pageName = computed(
  () =>
    pageNamesByRouteName[route.name?.toString() ?? ''] ??
    pageNamesByRouteName[routeNames.dashboard],
);

// TODO: Replace with an `activeNames` prop on WorkspaceNavigation when a second project subpage arrives.
const activeName = computed(() => {
  const name = route.name?.toString();

  if (name === routeNames.addProject) {
    return routeNames.projects;
  }

  return name;
});

async function handleSignOut(): Promise<void> {
  await authStore.logout();
  await router.push({ name: routeNames.login });
}

watch(
  () => authStore.accessToken,
  async (accessToken) => {
    if (!accessToken || workspaceNameRequestToken === accessToken) return;

    workspaceNameRequestToken = accessToken;

    try {
      const workspace = await adminSettingsClient.getWorkspace();
      authStore.setWorkspaceName(workspace.name);
    } catch (error) {
      workspaceNameRequestToken = null;
      const message =
        error instanceof Error ? error.message : "Could not load workspace name.";

      errorToast(message, {
        error,
        logContext: { action: "load-workspace-name", feature: "admin-shell" },
      });
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="bg-app-bg text-text-dark min-h-screen">
    <WorkspaceHeader
      :counterpart-href="userWorkspaceHref"
      counterpart-label="User workspace"
      :display-name="authStore.displayName"
      :page-name="pageName"
      product-name="GiTiempo Admin"
      :profile-context-label="authStore.workspaceName"
      :settings-icon="settingsIcon"
      settings-label="Settings"
      :settings-to="{ name: routeNames.settings }"
      :show-settings="showSettings"
      :user-initials="authStore.userInitials"
      :workspace-name="authStore.workspaceName"
      @sign-out="handleSignOut"
    />

    <div class="flex min-h-[calc(100vh-4rem)]">
      <WorkspaceNavigation
        :active-name="activeName"
        :items="navItems"
      />

      <main class="min-w-0 flex-1 p-4 pb-20 sm:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

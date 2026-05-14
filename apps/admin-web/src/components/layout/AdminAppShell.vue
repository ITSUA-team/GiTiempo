<script setup lang="ts">
import { computed, watch } from "vue";
import { RouterView, useRoute } from "vue-router";
import { WorkspaceHeader, WorkspaceNavigation } from "@gitiempo/web-shared";
import { getCounterpartWorkspaceHref } from "@gitiempo/web-shared/workspace-link";
import ConfirmDialog from "primevue/confirmdialog";
import Toast from "primevue/toast";

import { useToasts } from "@/composables/useToasts";
import { routeNames } from "@/router";
import { adminSettingsClient } from "@/services/admin-settings-client";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const authStore = useAuthStore();
const { errorToast } = useToasts();
const userWorkspaceHref = getCounterpartWorkspaceHref({
  configuredUrl: import.meta.env.VITE_USER_APP_URL,
  fallbackPath: "/login",
});

let workspaceNameRequestToken: string | null = null;

const navItems = computed(() => [
  { label: "Dashboard", name: routeNames.dashboard },
  { label: "Reports", name: routeNames.reports },
  { label: "Invoices", name: routeNames.invoices },
  { label: "Members", name: routeNames.members },
  { label: "Projects", name: routeNames.projects },
  { label: "Settings", name: routeNames.settings },
]);

// TODO: Replace with an `activeNames` prop on WorkspaceNavigation when a second project subpage arrives.
const activeName = computed(() => {
  const name = route.name?.toString();

  if (name === routeNames.addProject) {
    return routeNames.projects;
  }

  return name;
});

watch(
  () => authStore.accessToken,
  async (accessToken) => {
    if (!accessToken || workspaceNameRequestToken === accessToken) return;

    workspaceNameRequestToken = accessToken;

    try {
      const workspace = await adminSettingsClient.getWorkspace(accessToken);
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

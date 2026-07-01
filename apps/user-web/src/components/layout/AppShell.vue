<script setup lang="ts">
import { computed, watch } from "vue";
import { useToast } from "primevue/usetoast";
import { RouterView, useRoute, useRouter } from "vue-router";
import {
  createAppToast,
  getErrorMessage,
  WorkspaceHeader,
  WorkspaceNavigation,
} from "@gitiempo/web-shared";
import { getCounterpartWorkspaceHref } from "@gitiempo/web-shared/workspace-link";

import TopBarTimer from "@/components/timer/TopBarTimer.vue";
import { provideTopBarTimerDialogController } from "@/composables/timer/useTopBarTimerDialogController";
import { appEnv } from "@/config/env";
import { routeNames } from "@/constants/routes";
import { getWorkspaceClient } from "@/services/workspace-client";
import { useAuthStore } from "@/stores/auth";
import {
  USER_COUNTERPART_LABEL,
  USER_NAV_ITEMS,
  USER_PAGE_NAMES_BY_ROUTE_NAME,
  USER_PROFILE_ICON,
  USER_PROFILE_LABEL,
} from "@/constants/user-shell";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();
const appToast = createAppToast(toast);
const topBarTimerDialogController = provideTopBarTimerDialogController();
const adminWorkspaceHref = getCounterpartWorkspaceHref({
  configuredUrl: appEnv.adminAppUrl,
  fallbackPath: "/login",
});
let workspaceNameRequestToken: string | null = null;
const topBarTimerDialogOpenRequestId = computed(
  () => topBarTimerDialogController.openRequestId.value,
);
const pageName = computed(
  () =>
    USER_PAGE_NAMES_BY_ROUTE_NAME[route.name?.toString() ?? ""] ??
    USER_PAGE_NAMES_BY_ROUTE_NAME[routeNames.dashboard],
);

async function handleSignOut(): Promise<void> {
  await authStore.logout();
  await router.push({ name: routeNames.login });
}

async function handleSwitchWorkspace(workspaceId: string): Promise<void> {
  try {
    const switchResult = await authStore.switchWorkspace(workspaceId);

    if (route.name === routeNames.forbidden) {
      await router.push({ name: routeNames.dashboard });
    }

    if (!switchResult.membershipsReloaded) {
      appToast.showInfoToast(
        "Workspace switched",
        "The new workspace is active, but the workspace list could not be refreshed yet.",
      );
    }
  } catch (error) {
    appToast.showErrorToast({
      detail: getErrorMessage(error, "Could not switch workspace."),
      error,
      logContext: {
        action: "switch-workspace",
        feature: "user-shell",
      },
      summary: "Could not switch workspace",
    });
  }
}

watch(
  () => authStore.accessToken,
  async (accessToken) => {
    if (!accessToken || workspaceNameRequestToken === accessToken) return;

    workspaceNameRequestToken = accessToken;

    try {
      const [workspace] = await Promise.all([
        getWorkspaceClient().getWorkspace(),
        authStore.loadWorkspaceMemberships(),
      ]);
      authStore.setWorkspaceName(workspace.name);
    } catch (error) {
      workspaceNameRequestToken = null;
      appToast.showErrorToast({
        detail: getErrorMessage(error, "Could not load workspace context."),
        error,
        logContext: {
          action: "load-workspace-context",
          feature: "user-shell",
        },
        summary: "Could not load workspace context",
      });
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="bg-app-bg text-text-dark flex min-h-screen flex-col">
    <WorkspaceHeader
      :counterpart-href="adminWorkspaceHref"
      :counterpart-label="USER_COUNTERPART_LABEL"
      center-content-align="end"
      :display-name="authStore.displayName"
      :page-name="pageName"
      :settings-icon="USER_PROFILE_ICON"
      :settings-label="USER_PROFILE_LABEL"
      :settings-to="{ name: routeNames.profile }"
      :show-display-name="false"
      :switching-workspace-id="authStore.switchingWorkspaceId"
      :user-initials="authStore.userInitials"
      :workspace-memberships="authStore.workspaceMemberships"
      :workspace-name="authStore.workspaceName"
      @sign-out="handleSignOut"
      @switch-workspace="handleSwitchWorkspace"
    >
      <template #center>
        <TopBarTimer :open-request-id="topBarTimerDialogOpenRequestId" />
      </template>
    </WorkspaceHeader>

    <div class="flex flex-1">
      <WorkspaceNavigation
        :active-name="route.name?.toString()"
        :items="USER_NAV_ITEMS"
      />

      <main class="min-w-0 flex-1 p-4 sm:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

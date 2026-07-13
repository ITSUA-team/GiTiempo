<script setup lang="ts">
import { computed, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import { WorkspaceHeader, WorkspaceNavigation } from "@gitiempo/web-shared";
import { hasAllowedRole } from "@gitiempo/web-shared/router";
import {
  getCounterpartWorkspaceAppHref,
  getCounterpartWorkspaceHref,
} from "@gitiempo/web-shared/workspace-link";

import {
  ADMIN_BASE_NAV_ITEMS,
  ADMIN_COUNTERPART_LABEL,
  ADMIN_PAGE_NAMES_BY_ROUTE_NAME,
  ADMIN_SETTINGS_ICON,
  ADMIN_SETTINGS_LABEL,
} from "@/constants/admin-shell";
import { useToasts } from "@/composables/feedback/useToasts";
import { appEnv } from "@/config/env";
import { routeNames } from "@/constants/routes";
import { getAdminSettingsClient } from "@/services/admin-settings-client";
import { navigateToExternalHref } from "@/services/external-navigation";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { errorToast, infoToast } = useToasts();
const userWorkspaceHref = getCounterpartWorkspaceHref({
  configuredUrl: appEnv.userAppUrl,
  fallbackPath: "/login",
});
const userWorkspaceAppHref = getCounterpartWorkspaceAppHref({
  configuredUrl: appEnv.userAppUrl,
  fallbackPath: "/",
});

let workspaceNameRequestToken: string | null = null;

const currentRole = computed(() => authStore.profile?.role ?? null);
const navItems = computed(() =>
  ADMIN_BASE_NAV_ITEMS.filter((item) =>
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
    ADMIN_PAGE_NAMES_BY_ROUTE_NAME[route.name?.toString() ?? ''] ??
    ADMIN_PAGE_NAMES_BY_ROUTE_NAME[routeNames.dashboard],
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

async function handleSwitchWorkspace(workspaceId: string): Promise<void> {
  try {
    const switchResult = await authStore.switchWorkspace(workspaceId);

    if (switchResult.profileReloaded === false) {
      window.location.reload();
      return;
    }

    const nextRole = authStore.profile?.role ?? null;
    const canAccessDashboard = hasAllowedRole(
      router.resolve({ name: routeNames.dashboard }).meta.allowedRoles,
      nextRole,
    );

    if (!canAccessDashboard) {
      navigateToExternalHref(userWorkspaceAppHref);
      return;
    }

    if (
      route.name === routeNames.forbidden ||
      route.name === routeNames.notFound ||
      !hasAllowedRole(route.meta.allowedRoles, nextRole)
    ) {
      await router.push({ name: routeNames.dashboard });
    }

    if (!switchResult.membershipsReloaded) {
      infoToast(
        "Workspace switched. The workspace list could not be refreshed yet.",
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not switch workspace.";

    errorToast(message, {
      error,
      logContext: { action: "switch-workspace", feature: "admin-shell" },
    });
  }
}

watch(
  () => authStore.accessToken,
  async (accessToken) => {
    if (!accessToken || workspaceNameRequestToken === accessToken) return;

    workspaceNameRequestToken = accessToken;
    const isSwitchingWorkspace = authStore.switchingWorkspaceId !== null;

    try {
      if (isSwitchingWorkspace) {
        const workspace = await getAdminSettingsClient().getWorkspace();
        authStore.setWorkspaceName(workspace.name);
        return;
      }

      const [workspace] = await Promise.all([
        getAdminSettingsClient().getWorkspace(),
        authStore.loadWorkspaceMemberships(),
      ]);
      authStore.setWorkspaceName(workspace.name);
    } catch (error) {
      if (isSwitchingWorkspace) {
        return;
      }

      workspaceNameRequestToken = null;
      const message =
        error instanceof Error
          ? error.message
          : "Could not load workspace context.";

      errorToast(message, {
        error,
        logContext: {
          action: "load-workspace-context",
          feature: "admin-shell",
        },
      });
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="bg-app-bg text-text-dark flex min-h-screen flex-col">
    <WorkspaceHeader
      :counterpart-href="userWorkspaceHref"
      :counterpart-label="ADMIN_COUNTERPART_LABEL"
      :display-name="authStore.displayName"
      :page-name="pageName"
      product-name="GiTiempo Admin"
      :profile-context-label="authStore.workspaceName"
      :settings-icon="ADMIN_SETTINGS_ICON"
      :settings-label="ADMIN_SETTINGS_LABEL"
      :settings-to="{ name: routeNames.settings }"
      :show-settings="showSettings"
      :switching-workspace-id="authStore.switchingWorkspaceId"
      :user-initials="authStore.userInitials"
      :workspace-memberships="authStore.workspaceMemberships"
      :workspace-name="authStore.workspaceName"
      @sign-out="handleSignOut"
      @switch-workspace="handleSwitchWorkspace"
    />

    <div class="flex flex-1">
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

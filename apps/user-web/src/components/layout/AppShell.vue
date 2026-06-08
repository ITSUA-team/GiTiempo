<script setup lang="ts">
import { computed } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import { WorkspaceHeader, WorkspaceNavigation } from "@gitiempo/web-shared";
import { getCounterpartWorkspaceHref } from "@gitiempo/web-shared/workspace-link";

import TopBarTimer from "@/components/timer/TopBarTimer.vue";
import { appEnv } from "@/config/env";
import { routeNames } from "@/constants/routes";
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
const adminWorkspaceHref = getCounterpartWorkspaceHref({
  configuredUrl: appEnv.adminAppUrl,
  fallbackPath: "/login",
});
const pageName = computed(
  () =>
    USER_PAGE_NAMES_BY_ROUTE_NAME[route.name?.toString() ?? ""] ??
    USER_PAGE_NAMES_BY_ROUTE_NAME[routeNames.dashboard],
);

async function handleSignOut(): Promise<void> {
  await authStore.logout();
  await router.push({ name: routeNames.login });
}
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
      :user-initials="authStore.userInitials"
      :workspace-name="authStore.workspaceName"
      @sign-out="handleSignOut"
    >
      <template #center>
        <TopBarTimer />
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

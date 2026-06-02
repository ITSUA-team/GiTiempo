<script setup lang="ts">
import { RouteErrorPanel } from "@gitiempo/web-shared";
import { hasAllowedRole } from "@gitiempo/web-shared/router";
import { getCounterpartWorkspaceHref } from "@gitiempo/web-shared/workspace-link";
import { computed } from "vue";
import { useRouter } from "vue-router";

import { appEnv } from "@/config/env";
import { routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();
const userWorkspaceHref = getCounterpartWorkspaceHref({
  configuredUrl: appEnv.userAppUrl,
  fallbackPath: "/login",
});
const canReturnToDashboard = computed(() =>
  hasAllowedRole(
    router.resolve({ name: routeNames.dashboard }).meta.allowedRoles,
    authStore.profile?.role,
  ),
);
const recoveryCopy = computed(() =>
  canReturnToDashboard.value
    ? "Your current admin role cannot open this page. Switch workspace or return to the dashboard."
    : "Your current admin role cannot open this page. Switch to the user workspace to continue.",
);
const primaryActionLabel = computed(() =>
  canReturnToDashboard.value ? "Back to dashboard" : "Switch workspace",
);
const secondaryActionLabel = computed(() =>
  canReturnToDashboard.value ? "Switch workspace" : undefined,
);

function goToDashboard(): void {
  void router.push({ name: routeNames.dashboard });
}

function switchWorkspace(): void {
  window.location.assign(userWorkspaceHref);
}

function handlePrimaryAction(): void {
  if (!canReturnToDashboard.value) {
    switchWorkspace();

    return;
  }

  goToDashboard();
}
</script>

<template>
  <RouteErrorPanel
    :copy="recoveryCopy"
    eyebrow="403"
    icon-glyph="!"
    :primary-action-label="primaryActionLabel"
    :secondary-action-label="secondaryActionLabel"
    title="You do not have access"
    @primary-action="handlePrimaryAction"
    @secondary-action="switchWorkspace"
  />
</template>

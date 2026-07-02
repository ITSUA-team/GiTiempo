<script setup lang="ts">
import {
  RouteErrorPanel,
  WorkspaceSwitchDialog,
  getCounterpartWorkspaceAppHref,
} from "@gitiempo/web-shared";
import { hasAllowedRole } from "@gitiempo/web-shared/router";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { useToasts } from "@/composables/feedback/useToasts";
import { appEnv } from "@/config/env";
import { routeNames } from "@/router";
import { navigateToExternalHref } from "@/services/external-navigation";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();
const { errorToast, infoToast } = useToasts();
const workspaceSwitchDialogVisible = ref(false);
const hasAlternativeWorkspaces = computed(
  () => authStore.workspaceMemberships.some((membership) => !membership.isCurrent),
);
const secondaryActionLabel = computed(() =>
  hasAlternativeWorkspaces.value ? "Switch workspace" : undefined,
);
const recoveryCopy =
  "Your current admin role cannot open this page. Switch workspace or return to the dashboard.";

function goToDashboard(): void {
  void router.push({ name: routeNames.dashboard });
}

function getRequiredUserWorkspaceHref(): string {
  return getCounterpartWorkspaceAppHref({
    configuredUrl: appEnv.userAppUrl,
    fallbackPath: "/",
  });
}

onMounted(() => {
  if (!authStore.accessToken || authStore.workspaceMemberships.length > 0) {
    return;
  }

  void authStore.loadWorkspaceMemberships().catch((error) => {
    const message =
      error instanceof Error ? error.message : "Could not load workspaces.";

    errorToast(message, {
      error,
      logContext: { action: "load-workspace-memberships", feature: "admin-403" },
    });
  });
});

function openWorkspaceSwitchDialog(): void {
  workspaceSwitchDialogVisible.value = true;
}

async function handleWorkspaceSwitch(workspaceId: string): Promise<void> {
  try {
    const switchResult = await authStore.switchWorkspace(workspaceId);

    if (switchResult.profileReloaded === false) {
      window.location.reload();
      return;
    }

    workspaceSwitchDialogVisible.value = false;

    const nextRole = authStore.profile?.role ?? null;
    const canAccessDashboard = hasAllowedRole(
      router.resolve({ name: routeNames.dashboard }).meta.allowedRoles,
      nextRole,
    );

    if (canAccessDashboard) {
      await router.push({ name: routeNames.dashboard });
    } else {
      navigateToExternalHref(getRequiredUserWorkspaceHref());
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
      logContext: { action: "switch-workspace", feature: "admin-403" },
    });
  }
}

function handlePrimaryAction(): void {
  goToDashboard();
}
</script>

<template>
  <RouteErrorPanel
    :copy="recoveryCopy"
    eyebrow="403"
    icon-glyph="!"
    primary-action-label="Back to dashboard"
    :secondary-action-label="secondaryActionLabel"
    title="You do not have access"
    @primary-action="handlePrimaryAction"
    @secondary-action="openWorkspaceSwitchDialog"
  />

  <WorkspaceSwitchDialog
    v-model:visible="workspaceSwitchDialogVisible"
    :switching-workspace-id="authStore.switchingWorkspaceId"
    :workspace-memberships="authStore.workspaceMemberships"
    @switch-workspace="handleWorkspaceSwitch"
  />
</template>

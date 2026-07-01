<script setup lang="ts">
import {
  RouteErrorPanel,
  WorkspaceSwitchDialog,
  createAppToast,
  getErrorMessage,
} from "@gitiempo/web-shared";
import { computed, onMounted, ref } from "vue";
import { useToast } from "primevue/usetoast";
import { useRouter } from "vue-router";

import { routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();
const appToast = createAppToast(toast);
const workspaceSwitchDialogVisible = ref(false);
const hasAlternativeWorkspaces = computed(
  () => authStore.workspaceMemberships.some((membership) => !membership.isCurrent),
);
const secondaryActionLabel = computed(() =>
  hasAlternativeWorkspaces.value ? "Switch workspace" : undefined,
);

function goToDashboard(): void {
  void router.push({ name: routeNames.dashboard });
}

onMounted(() => {
  if (!authStore.accessToken || authStore.workspaceMemberships.length > 0) {
    return;
  }

  void authStore.loadWorkspaceMemberships().catch((error) => {
    appToast.showErrorToast({
      detail: getErrorMessage(error, "Could not load workspaces."),
      error,
      logContext: {
        action: "load-workspace-memberships",
        feature: "user-403",
      },
      summary: "Could not load workspaces",
    });
  });
});

function openWorkspaceSwitchDialog(): void {
  workspaceSwitchDialogVisible.value = true;
}

async function handleWorkspaceSwitch(workspaceId: string): Promise<void> {
  try {
    const switchResult = await authStore.switchWorkspace(workspaceId);

    workspaceSwitchDialogVisible.value = false;
    await router.push({ name: routeNames.dashboard });

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
        feature: "user-403",
      },
      summary: "Could not switch workspace",
    });
  }
}
</script>

<template>
  <RouteErrorPanel
    copy="Your current workspace role cannot open this page. Switch workspace or return to the dashboard."
    eyebrow="403"
    icon-glyph="!"
    primary-action-label="Back to dashboard"
    :secondary-action-label="secondaryActionLabel"
    title="You do not have access"
    @primary-action="goToDashboard"
    @secondary-action="openWorkspaceSwitchDialog"
  />

  <WorkspaceSwitchDialog
    v-model:visible="workspaceSwitchDialogVisible"
    :switching-workspace-id="authStore.switchingWorkspaceId"
    :workspace-memberships="authStore.workspaceMemberships"
    @switch-workspace="handleWorkspaceSwitch"
  />
</template>

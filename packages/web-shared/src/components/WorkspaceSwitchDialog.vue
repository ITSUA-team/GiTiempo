<script setup lang="ts">
import type { CurrentUserWorkspaceMembershipResponse } from "@gitiempo/shared";
import { computed } from "vue";
import Button from "primevue/button";

import AppDialog from "./AppDialog.vue";
import {
  getWorkspaceRoleLabel,
  getWorkspaceSwitchActionLabel,
  getWorkspaceSwitchStatus,
  isWorkspaceSwitchDisabled,
} from "./workspace-membership-display";

const visible = defineModel<boolean>("visible", { required: true });

const props = withDefaults(
  defineProps<{
    description?: string;
    switchingWorkspaceId?: string | null;
    title?: string;
    workspaceMemberships: CurrentUserWorkspaceMembershipResponse[];
  }>(),
  {
    description:
      "Choose the workspace you want to use for this session. The current workspace stays selected until you switch.",
    switchingWorkspaceId: null,
    title: "Switch workspace",
  },
);

const emit = defineEmits<{
  switchWorkspace: [workspaceId: string];
}>();

const isSwitchingWorkspace = computed(() => props.switchingWorkspaceId !== null);

function handleVisibleChange(nextVisible: boolean): void {
  if (nextVisible) {
    visible.value = true;
    return;
  }

  if (!isSwitchingWorkspace.value) {
    visible.value = false;
  }
}

function closeDialog(): void {
  if (!isSwitchingWorkspace.value) {
    visible.value = false;
  }
}
</script>

<template>
  <AppDialog
    modal
    :header="title"
    :closable="!isSwitchingWorkspace"
    :dismissable-mask="!isSwitchingWorkspace"
    :style="{ width: '520px', maxWidth: 'calc(100vw - 2rem)' }"
    :visible="visible"
    data-testid="workspace-switch-dialog"
    @update:visible="handleVisibleChange"
  >
    <div class="flex flex-col gap-4">
      <p class="text-text-muted text-sm leading-5">
        {{ description }}
      </p>

      <div class="flex flex-col gap-2">
        <button
          v-for="membership in workspaceMemberships"
          :key="membership.workspaceId"
          type="button"
          :aria-current="membership.isCurrent ? 'true' : undefined"
          :class="[
            'ring-divider focus-visible:outline-brand hover:bg-app-bg flex min-h-14 w-full items-start justify-between gap-3 rounded-lg px-4 py-3 text-left ring-1 transition ring-inset focus-visible:outline-2 focus-visible:outline-offset-2',
            membership.isCurrent ? 'bg-accent-tint/40' : 'bg-surface-primary',
            isWorkspaceSwitchDisabled(membership, switchingWorkspaceId) ? 'cursor-default' : 'cursor-pointer',
          ]"
          :data-testid="`workspace-switch-dialog-option-${membership.workspaceId}`"
          :disabled="isWorkspaceSwitchDisabled(membership, switchingWorkspaceId)"
          @click="emit('switchWorkspace', membership.workspaceId)"
        >
          <span class="min-w-0">
            <span class="text-text-dark block truncate text-sm font-semibold">
              {{ membership.workspaceName }}
            </span>
            <span class="text-text-muted block text-xs leading-5">
              {{ getWorkspaceRoleLabel(membership.role) }}
            </span>
          </span>

          <span
            class="text-xs font-medium"
            :class="
              membership.isCurrent ? 'text-brand' : 'text-text-muted'
            "
          >
            {{
              getWorkspaceSwitchActionLabel(
                getWorkspaceSwitchStatus(membership, switchingWorkspaceId),
              )
            }}
          </span>
        </button>
      </div>

      <div class="flex justify-end pt-2">
        <Button
          label="Close"
          severity="secondary"
          variant="outlined"
          :disabled="isSwitchingWorkspace"
          @click="closeDialog"
        />
      </div>
    </div>
  </AppDialog>
</template>

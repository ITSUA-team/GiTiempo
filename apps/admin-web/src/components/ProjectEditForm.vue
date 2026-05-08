<script setup lang="ts">
import { ref } from 'vue';
import type {
  ProjectResponse,
  ProjectVisibility,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import Button from 'primevue/button';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';
import { useToast } from 'primevue/usetoast';

import { adminProjectsClient } from '@/services/admin-projects-client';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{
  project: ProjectResponse;
  allMembers: WorkspaceMemberListResponse;
}>();

const emit = defineEmits<{
  saved: [updated: ProjectResponse];
  cancelled: [];
}>();

const authStore = useAuthStore();
const toast = useToast();

const selectedMemberIds = ref<string[]>(
  props.project.members.map((m) => m.userId),
);

const selectedVisibility = ref<ProjectVisibility>(props.project.visibility);

const saving = ref(false);

const memberOptions = props.allMembers
  .filter((m) => m.role !== "admin")
  .map((m) => ({
  label: m.displayName ?? m.email,
  value: m.userId,
}));

const visibilityOptions = [
  { label: 'Public', value: 'public' as const },
  { label: 'Private', value: 'private' as const },
];

async function handleSave(): Promise<void> {
  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  saving.value = true;

  try {
    const updated = await adminProjectsClient.updateProject(
      token,
      props.project.id,
      { visibility: selectedVisibility.value },
    );

    const currentMemberIds = new Set(
      props.project.members.map((m) => m.userId),
    );
    const nextMemberIds = new Set(selectedMemberIds.value);

    const toAdd = selectedMemberIds.value.filter(
      (id) => !currentMemberIds.has(id),
    );
    const toRemove = props.project.members
      .map((m) => m.userId)
      .filter((id) => !nextMemberIds.has(id));

    for (const userId of toAdd) {
      await adminProjectsClient.assignMember(token, props.project.id, userId);
    }

    for (const userId of toRemove) {
      await adminProjectsClient.removeAssignment(
        token,
        props.project.id,
        userId,
      );
    }

    emit('saved', updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save project';
    toast.add({ severity: 'error', summary: 'Save failed', detail: message, life: 5000 });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="bg-app-bg border-divider box-border flex w-full flex-col gap-[10px] border-t p-4">
    <span class="text-text-dark font-sans text-[13px] leading-none font-semibold">Project settings</span>

    <div class="flex items-end gap-[10px]">
      <div
        name="members"
        class="flex flex-1 flex-col gap-1.5"
      >
        <label
          for="edit-members"
          class="text-text-dark font-sans text-[12px] leading-none font-medium"
        >Select members</label>
        <MultiSelect
          id="edit-members"
          v-model="selectedMemberIds"
          :options="memberOptions"
          option-label="label"
          option-value="value"
          placeholder="Select members"
          fluid
        />
      </div>

      <div
        name="visibility"
        class="flex w-[180px] flex-col gap-1.5"
      >
        <label
          for="edit-visibility"
          class="text-text-dark font-sans text-[12px] leading-none font-medium"
        >Visibility</label>
        <Select
          id="edit-visibility"
          v-model="selectedVisibility"
          :options="visibilityOptions"
          option-label="label"
          option-value="value"
          fluid
        />
      </div>

      <Button
        label="Cancel"
        severity="secondary"
        outlined
        @click="emit('cancelled')"
      />

      <Button
        label="Save"
        :loading="saving"
        @click="handleSave"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type {
  ProjectResponse,
  ProjectVisibility,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import { EditFormPanel } from '@gitiempo/web-shared';
import Button from 'primevue/button';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';

import { adminProjectsClient } from '@/services/admin-projects-client';
import { useAuthStore } from '@/stores/auth';
import { useToasts } from '@/composables/useToasts';

const props = defineProps<{
  project: ProjectResponse;
  allMembers: WorkspaceMemberListResponse;
}>();

const emit = defineEmits<{
  saved: [updated: ProjectResponse];
  cancelled: [];
}>();

const authStore = useAuthStore();
const { successToast, errorToast } = useToasts();

const selectedMemberIds = ref<string[]>(
  props.project.members.map((m) => m.userId),
);

const selectedVisibility = ref<ProjectVisibility>(props.project.visibility);

const saving = ref(false);

const memberOptions = props.allMembers
  .filter((m) => m.role !== 'admin')
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

    successToast(`${props.project.name} has been updated.`);
    emit('saved', updated);
  } catch (err) {
    errorToast(err instanceof Error ? err.message : 'Failed to save project');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <EditFormPanel title="Project settings">
    <div class="flex items-end gap-2.5">
      <div class="flex flex-1 flex-col gap-1.5">
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

      <div class="flex w-[180px] flex-col gap-1.5">
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
  </EditFormPanel>
</template>

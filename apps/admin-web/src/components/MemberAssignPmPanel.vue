<script setup lang="ts">
import { ref } from 'vue';
import type { ProjectListResponse, WorkspaceMemberResponse } from '@gitiempo/shared';
import { EditFormPanel } from '@gitiempo/web-shared';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';

import { adminProjectsClient } from '@/services/admin-projects-client';
import { useAuthStore } from '@/stores/auth';
import { useToasts } from '@/composables/useToasts';

const props = defineProps<{
  member: WorkspaceMemberResponse;
  projects: ProjectListResponse;
}>();

const emit = defineEmits<{
  saved: [];
  cancelled: [];
}>();

const authStore = useAuthStore();
const { successToast, errorToast } = useToasts();
const saving = ref(false);

// Compute which projects this member is currently assigned to
const selectedProjectIds = ref<string[]>(
  props.projects
    .filter((p) => p.isActive && p.members.some((m) => m.userId === props.member.userId))
    .map((p) => p.id),
);

const activeProjects = props.projects.filter((p) => p.isActive);

async function handleSave(): Promise<void> {
  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  saving.value = true;

  try {
    const currentAssignedIds = new Set(
      props.projects
        .filter((p) => p.isActive && p.members.some((m) => m.userId === props.member.userId))
        .map((p) => p.id),
    );
    const nextAssignedIds = new Set(selectedProjectIds.value);

    const toAdd = selectedProjectIds.value.filter(
      (id) => !currentAssignedIds.has(id),
    );
    const toRemove = [...currentAssignedIds].filter(
      (id) => !nextAssignedIds.has(id),
    );

    for (const projectId of toAdd) {
      await adminProjectsClient.assignMember(token, projectId, props.member.userId);
    }

    for (const projectId of toRemove) {
      await adminProjectsClient.removeAssignment(token, projectId, props.member.userId);
    }

    successToast(`Project assignments for ${props.member.displayName ?? props.member.email} saved.`);
    emit('saved');
  } catch (err) {
    errorToast(err instanceof Error ? err.message : 'Failed to save assignments');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <EditFormPanel title="PM assignment">
    <div class="flex flex-wrap gap-3">
      <label
        v-for="project in activeProjects"
        :key="project.id"
        :for="`assign-${member.id}-${project.id}`"
        class="bg-surface flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2"
      >
        <Checkbox
          v-model="selectedProjectIds"
          :input-id="`assign-${member.id}-${project.id}`"
          :value="project.id"
        />
        <span class="text-text-dark text-[13px] font-medium">{{ project.name }}</span>
      </label>
    </div>

    <div class="flex items-center justify-end gap-2.5">
      <Button
        label="Cancel"
        severity="secondary"
        outlined
        @click="emit('cancelled')"
      />
      <Button
        label="Save Assignments"
        :loading="saving"
        @click="handleSave"
      />
    </div>
  </EditFormPanel>
</template>

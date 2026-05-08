<script setup lang="ts">
import { ref } from 'vue';
import type { ProjectListResponse, WorkspaceMemberResponse } from '@gitiempo/shared';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import { useToast } from 'primevue/usetoast';

import { adminProjectsClient } from '@/services/admin-projects-client';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{
  member: WorkspaceMemberResponse;
  projects: ProjectListResponse;
}>();

const emit = defineEmits<{
  saved: [];
  cancelled: [];
}>();

const authStore = useAuthStore();
const toast = useToast();
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

    toast.add({
      severity: 'success',
      summary: 'Assignments updated',
      detail: `Project assignments for ${props.member.displayName ?? props.member.email} saved.`,
      life: 4000,
    });
    emit('saved');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save assignments';
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: message,
      life: 5000,
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="edit-form-panel">
    <span class="edit-form-title">PM assignment</span>

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
        class="gt-cancel-btn"
        @click="emit('cancelled')"
      />
      <Button
        label="Save Assignments"
        :loading="saving"
        @click="handleSave"
      />
    </div>
  </div>
</template>

<style scoped>
.edit-form-panel {
  background-color: #f4f4f5;
  border-top: 1px solid #eeeeee;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
}

.edit-form-title {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1;
}

:deep(.gt-cancel-btn) {
  background-color: var(--color-surface) !important;
  border-color: var(--color-divider) !important;
  color: var(--color-text-dark) !important;
  font-weight: 500 !important;
}
</style>

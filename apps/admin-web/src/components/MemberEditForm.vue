<script setup lang="ts">
import { ref } from 'vue';
import type { WorkspaceMemberResponse, WorkspaceRole } from '@gitiempo/shared';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { useToast } from 'primevue/usetoast';

import { adminMembersClient } from '@/services/admin-members-client';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{
  member: WorkspaceMemberResponse;
}>();

const emit = defineEmits<{
  saved: [];
  cancelled: [];
}>();

const authStore = useAuthStore();
const toast = useToast();
const saving = ref(false);
const selectedRole = ref<WorkspaceRole>(props.member.role);

const roleOptions = [
  { label: 'Member', value: 'member' as const },
  { label: 'PM', value: 'pm' as const },
  { label: 'Admin', value: 'admin' as const },
];

async function handleSave(): Promise<void> {
  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  if (selectedRole.value === props.member.role) {
    emit('cancelled');
    return;
  }

  saving.value = true;

  try {
    await adminMembersClient.updateMemberRole(token, props.member.id, {
      role: selectedRole.value,
    });

    toast.add({
      severity: 'success',
      summary: 'Member updated',
      detail: `Role for ${props.member.displayName ?? props.member.email} changed to ${selectedRole.value}.`,
      life: 4000,
    });
    emit('saved');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update role';
    toast.add({
      severity: 'error',
      summary: 'Update failed',
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
    <span class="edit-form-title">Edit member</span>

    <div class="edit-form-row">
      <!-- Name (read-only) -->
      <div class="edit-form-field edit-form-field--fill">
        <label
          for="edit-member-name"
          class="edit-form-label"
        >Name</label>
        <InputText
          id="edit-member-name"
          :model-value="member.displayName ?? '—'"
          disabled
          fluid
        />
        <small class="text-text-muted text-xs">Editing name and email is not yet supported.</small>
      </div>

      <!-- Email (read-only) -->
      <div class="edit-form-field edit-form-field--fill">
        <label
          for="edit-member-email"
          class="edit-form-label"
        >Email</label>
        <InputText
          id="edit-member-email"
          :model-value="member.email"
          disabled
          fluid
        />
      </div>

      <!-- Role (editable) -->
      <div class="edit-form-field edit-form-field--180">
        <label
          for="edit-member-role"
          class="edit-form-label"
        >Role</label>
        <Select
          id="edit-member-role"
          v-model="selectedRole"
          :options="roleOptions"
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

.edit-form-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.edit-form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.edit-form-field--fill {
  flex: 1;
}

.edit-form-field--180 {
  width: 180px;
}

.edit-form-label {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #1a1a1a;
  line-height: 1;
}
</style>

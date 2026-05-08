<script setup lang="ts">
import { ref } from 'vue';
import type { WorkspaceRole } from '@gitiempo/shared';
import { parseInviteForm } from '@gitiempo/web-shared';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { useToast } from 'primevue/usetoast';

import { adminMembersClient } from '@/services/admin-members-client';
import { useAuthStore } from '@/stores/auth';

const visible = defineModel<boolean>('visible', { required: true });

const emit = defineEmits<{
  created: [];
}>();

const authStore = useAuthStore();
const toast = useToast();

const email = ref('');
const role = ref<WorkspaceRole>('member');
const submitting = ref(false);
const fieldErrors = ref<Record<string, string>>({});

const roleOptions = [
  { label: 'Member', value: 'member' as const },
  { label: 'PM', value: 'pm' as const },
  { label: 'Admin', value: 'admin' as const },
];

function resetForm(): void {
  email.value = '';
  role.value = 'member';
  fieldErrors.value = {};
}

async function handleSubmit(): Promise<void> {
  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  const result = parseInviteForm({ email: email.value, role: role.value });

  if (!result.success) {
    fieldErrors.value = result.fieldErrors;
    return;
  }

  submitting.value = true;
  fieldErrors.value = {};

  try {
    await adminMembersClient.createInvite(token, result.data);

    toast.add({
      severity: 'success',
      summary: 'Invite sent',
      detail: `Invitation sent to ${result.data.email}.`,
      life: 4000,
    });
    resetForm();
    visible.value = false;
    emit('created');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send invite';
    toast.add({
      severity: 'error',
      summary: 'Invite failed',
      detail: message,
      life: 5000,
    });
  } finally {
    submitting.value = false;
  }
}

function handleCancel(): void {
  resetForm();
  visible.value = false;
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="Invite Member"
    :style="{ width: '480px' }"
    @hide="resetForm"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <label
          for="invite-email"
          class="text-text-dark text-[13px] font-medium"
        >Email</label>
        <InputText
          id="invite-email"
          v-model="email"
          :invalid="!!fieldErrors.email"
          placeholder="new-member@example.com"
          class="w-full"
        />
        <small
          v-if="fieldErrors.email"
          class="text-destructive text-xs"
        >{{ fieldErrors.email }}</small>
      </div>

      <div class="flex flex-col gap-1">
        <label
          for="invite-role"
          class="text-text-dark text-[13px] font-medium"
        >Role</label>
        <Select
          id="invite-role"
          v-model="role"
          :options="roleOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </div>
    </div>

    <template #footer>
      <Button
        label="Cancel"
        severity="secondary"
        outlined
        class="gt-cancel-btn"
        @click="handleCancel"
      />
      <Button
        label="Send Invite"
        :loading="submitting"
        @click="handleSubmit"
      />
    </template>
  </Dialog>
</template>

<style scoped>
:deep(.gt-cancel-btn) {
  background-color: var(--color-surface) !important;
  border-color: var(--color-divider) !important;
  color: var(--color-text-dark) !important;
  font-weight: 500 !important;
}
</style>

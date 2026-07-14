<script setup lang="ts">
import { ref } from 'vue';
import type { WorkspaceRole } from '@gitiempo/shared';
import { AppDialog, WORKSPACE_ROLE_OPTIONS, workspaceInviteFormSchema } from '@gitiempo/web-shared';
import type { WorkspaceInviteFormInput } from '@gitiempo/web-shared';
import { Form } from '@primevue/forms';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';

import { adminMembersClient } from '@/services/admin-members-client';
import { useAuthStore } from '@/stores/auth';
import { useToasts } from '@/composables/feedback/useToasts';

const visible = defineModel<boolean>('visible', { required: true });

const emit = defineEmits<{
  created: [];
}>();

const authStore = useAuthStore();
const { successToast, errorToast } = useToasts();

const formKey = ref(0);
const submitting = ref(false);

const initialValues: { email: string; role: WorkspaceRole | '' } = {
  email: '',
  role: '',
};

const resolver = zodResolver(workspaceInviteFormSchema);

async function handleSubmit({
  valid,
  values,
  reset,
}: {
  valid: boolean;
  values: Record<string, unknown>;
  reset: () => void;
}): Promise<void> {
  if (!valid) return;

  const token = authStore.accessToken;
  if (!token) return;

  submitting.value = true;

  try {
    await adminMembersClient.createInvite(values as WorkspaceInviteFormInput);
    successToast(`Invitation sent to ${values.email as string}.`);
    reset();
    visible.value = false;
    emit('created');
  } catch (err) {
    errorToast(err instanceof Error ? err.message : 'Failed to send invite', {
      error: err,
      logContext: { action: 'create-invite', feature: 'members' },
    });
  } finally {
    submitting.value = false;
  }
}

function handleVisibleChange(nextVisible: boolean): void {
  if (nextVisible) {
    visible.value = true;
    return;
  }

  if (!submitting.value) {
    formKey.value += 1;
    visible.value = false;
  }
}
</script>

<template>
  <AppDialog
    modal
    header="Invite Member"
    :closable="!submitting"
    :dismissable-mask="!submitting"
    :style="{ width: '480px' }"
    :visible="visible"
    @update:visible="handleVisibleChange"
  >
    <Form
      :key="formKey"
      v-slot="{ email, role }"
      :resolver="resolver"
      :initial-values="initialValues"
      @submit="handleSubmit"
    >
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label
            for="invite-email"
            class="text-text-dark text-[13px] font-medium"
          >Email</label>
          <InputText
            id="invite-email"
            name="email"
            placeholder="new-member@example.com"
            :invalid="email?.invalid"
            class="w-full"
          />
          <Message
            v-if="email?.invalid"
            severity="error"
            size="small"
            variant="simple"
          >
            {{ email.error?.message }}
          </Message>
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="invite-role"
            class="text-text-dark text-[13px] font-medium"
          >Role</label>
          <Select
            id="invite-role"
            name="role"
            :options="WORKSPACE_ROLE_OPTIONS"
            option-label="label"
            option-value="value"
            placeholder="Select a role"
            :invalid="role?.invalid"
            class="w-full"
          />
          <Message
            v-if="role?.invalid"
            severity="error"
            size="small"
            variant="simple"
          >
            {{ role.error?.message }}
          </Message>
        </div>

        <div class="flex justify-end pt-2">
          <Button
            label="Send Invite"
            :loading="submitting"
            type="submit"
          />
        </div>
      </div>
    </Form>
  </AppDialog>
</template>

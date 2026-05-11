<script setup lang="ts">
import type { WorkspaceMemberResponse, WorkspaceRole } from '@gitiempo/shared';
import { EditFormPanel, WORKSPACE_ROLE_OPTIONS } from '@gitiempo/web-shared';
import { Form } from '@primevue/forms';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import { z } from 'zod';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';

import { adminMembersClient } from '@/services/admin-members-client';
import { useAuthStore } from '@/stores/auth';
import { useToasts } from '@/composables/useToasts';

const props = defineProps<{
  member: WorkspaceMemberResponse;
}>();

const emit = defineEmits<{
  saved: [];
  cancelled: [];
}>();

const authStore = useAuthStore();
const { successToast, errorToast } = useToasts();

const editRoleSchema = z.object({ role: z.enum(['admin', 'pm', 'member']) });
const resolver = zodResolver(editRoleSchema);

const initialValues = { role: props.member.role };

async function handleSave({
  valid,
  values,
}: {
  valid: boolean;
  values: Record<string, unknown>;
}): Promise<void> {
  if (!valid) return;

  const token = authStore.accessToken;
  if (!token) return;

  const role = values.role as WorkspaceRole;

  if (role === props.member.role) {
    emit('cancelled');
    return;
  }

  try {
    await adminMembersClient.updateMemberRole(token, props.member.id, { role });
    successToast(
      `Role for ${props.member.displayName ?? props.member.email} changed to ${role}.`,
    );
    emit('saved');
  } catch (err) {
    errorToast(err instanceof Error ? err.message : 'Failed to update role');
  }
}
</script>

<template>
  <EditFormPanel title="Edit member">
    <Form
      :resolver="resolver"
      :initial-values="initialValues"
      @submit="handleSave"
    >
      <div class="flex items-end gap-2.5">
        <!-- Name (read-only) -->
        <div class="flex flex-1 flex-col gap-1.5">
          <label
            for="edit-member-name"
            class="text-text-dark font-sans text-[12px] leading-none font-medium"
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
        <div class="flex flex-1 flex-col gap-1.5">
          <label
            for="edit-member-email"
            class="text-text-dark font-sans text-[12px] leading-none font-medium"
          >Email</label>
          <InputText
            id="edit-member-email"
            :model-value="member.email"
            disabled
            fluid
          />
        </div>

        <!-- Role (editable) -->
        <div class="flex w-[180px] flex-col gap-1.5">
          <label
            for="edit-member-role"
            class="text-text-dark font-sans text-[12px] leading-none font-medium"
          >Role</label>
          <Select
            id="edit-member-role"
            name="role"
            :options="WORKSPACE_ROLE_OPTIONS"
            option-label="label"
            option-value="value"
            fluid
          />
        </div>

        <Button
          label="Cancel"
          severity="secondary"
          outlined
          :pt="{ root: { class: 'bg-white' } }"
          @click="emit('cancelled')"
        />
        <Button
          label="Save"
          type="submit"
        />
      </div>
    </Form>
  </EditFormPanel>
</template>

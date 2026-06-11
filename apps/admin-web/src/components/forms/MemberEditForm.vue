<script setup lang="ts">
import type { WorkspaceMemberResponse, WorkspaceRole } from '@gitiempo/shared';
import { EditFormPanel, WORKSPACE_ROLE_OPTIONS } from '@gitiempo/web-shared';
import { Form } from '@primevue/forms';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import { z } from 'zod';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';

const props = defineProps<{
  canRemove?: boolean;
  member: WorkspaceMemberResponse;
  saving?: boolean;
}>();

const emit = defineEmits<{
  cancelled: [];
  remove: [];
  save: [role: WorkspaceRole];
}>();

const editRoleSchema = z.object({ role: z.enum(['admin', 'pm', 'member']) });
const resolver = zodResolver(editRoleSchema);

const initialValues = { role: props.member.role };

function handleSave({
  valid,
  values,
}: {
  valid: boolean;
  values: Record<string, unknown>;
}): void {
  if (!valid || props.saving) {
    return;
  }

  const role = values.role as WorkspaceRole;

  emit('save', role);
}
</script>

<template>
  <EditFormPanel title="Edit member">
    <Form
      :resolver="resolver"
      :initial-values="initialValues"
      @submit="handleSave"
    >
      <div
        data-testid="member-edit-form-layout"
        class="flex flex-col gap-2.5"
      >
        <div
          data-testid="member-edit-form-fields"
          class="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-2.5"
        >
          <!-- Name (read-only) -->
          <div class="flex min-w-0 flex-col gap-1.5 sm:flex-1">
            <label
              for="edit-member-name"
              class="text-text-dark font-sans text-[12px] leading-none font-medium"
            >Name</label>
            <InputText
              id="edit-member-name"
              :model-value="member.displayName ?? '—'"
              aria-describedby="member-readonly-fields-note"
              disabled
              fluid
              readonly
            />
          </div>

          <!-- Email (read-only) -->
          <div class="flex min-w-0 flex-col gap-1.5 sm:flex-1">
            <label
              for="edit-member-email"
              class="text-text-dark font-sans text-[12px] leading-none font-medium"
            >Email</label>
            <InputText
              id="edit-member-email"
              :model-value="member.email"
              aria-describedby="member-readonly-fields-note"
              disabled
              fluid
              readonly
            />
          </div>

          <!-- Role (editable) -->
          <div class="flex min-w-0 flex-col gap-1.5 sm:w-[180px] sm:shrink-0">
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

          <div
            data-testid="member-edit-form-actions"
            class="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:gap-2.5"
          >
            <Button
              v-if="props.canRemove"
              label="Remove member"
              severity="danger"
              :disabled="saving"
              outlined
              type="button"
              class="w-full sm:w-auto"
              @click="emit('remove')"
            />
            <Button
              label="Cancel"
              severity="secondary"
              outlined
              type="button"
              class="w-full sm:w-auto"
              @click="emit('cancelled')"
            />
            <Button
              label="Save"
              :disabled="saving"
              :loading="saving"
              type="submit"
              class="w-full sm:w-auto"
            />
          </div>
        </div>

        <small
          id="member-readonly-fields-note"
          class="text-text-muted text-xs"
        >Editing name and email is not yet supported.</small>
      </div>
    </Form>
  </EditFormPanel>
</template>

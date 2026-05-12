<script setup lang="ts">
import type {
  ProjectResponse,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import { WorkspaceRoles } from '@gitiempo/shared';
import { EditFormPanel, projectEditFormSchema } from '@gitiempo/web-shared';
import type { ProjectEditFormInput } from '@gitiempo/web-shared';
import { Form } from '@primevue/forms';
import { zodResolver } from '@primevue/forms/resolvers/zod';
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

const memberOptions = props.allMembers
  .filter((m) => m.role !== WorkspaceRoles.Admin)
  .map((m) => ({ label: m.displayName ?? m.email, value: m.userId }));

const visibilityOptions = [
  { label: 'Public', value: 'public' as const },
  { label: 'Private', value: 'private' as const },
];

const initialValues: ProjectEditFormInput = {
  visibility: props.project.visibility,
  memberIds: props.project.members.map((m) => m.userId),
};

const resolver = zodResolver(projectEditFormSchema);

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

  const { visibility, memberIds } = values as ProjectEditFormInput;

  try {
    const updated = await adminProjectsClient.updateProject(
      token,
      props.project.id,
      { visibility },
    );

    const currentMemberIds = new Set(props.project.members.map((m) => m.userId));
    const nextMemberIds = new Set(memberIds);

    const toAdd = memberIds.filter((id) => !currentMemberIds.has(id));
    const toRemove = props.project.members
      .map((m) => m.userId)
      .filter((id) => !nextMemberIds.has(id));

    for (const userId of toAdd) {
      await adminProjectsClient.assignMember(token, props.project.id, userId);
    }
    for (const userId of toRemove) {
      await adminProjectsClient.removeAssignment(token, props.project.id, userId);
    }

    successToast(`${props.project.name} has been updated.`);
    emit('saved', updated);
  } catch (err) {
    errorToast(err instanceof Error ? err.message : 'Failed to save project');
  }
}
</script>

<template>
  <EditFormPanel title="Project settings">
    <Form
      v-slot="$form"
      :resolver="resolver"
      :initial-values="initialValues"
      @submit="handleSave"
    >
      <div class="flex items-end gap-2.5">
        <div class="flex flex-1 flex-col gap-1.5">
          <label
            for="edit-members"
            class="text-text-dark font-sans text-[12px] leading-none font-medium"
          >Select members</label>
          <MultiSelect
            id="edit-members"
            name="memberIds"
            :options="memberOptions"
            option-label="label"
            option-value="value"
            placeholder="Select members"
            :invalid="$form.memberIds?.invalid"
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
            name="visibility"
            :options="visibilityOptions"
            option-label="label"
            option-value="value"
            :invalid="$form.visibility?.invalid"
            fluid
          />
        </div>

        <Button
          label="Cancel"
          severity="secondary"
          outlined
          type="button"
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

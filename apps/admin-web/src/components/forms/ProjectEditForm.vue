<script setup lang="ts">
import { ref } from 'vue';
import type {
  ProjectResponse,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import { WorkspaceRoles } from '@gitiempo/shared';
import {
  giTiempoSelectPt,
  giTiempoSelfAppendedMultiAutoCompleteDropdownPt,
} from '@gitiempo/web-config/theme';
import {
  EditFormPanel,
  LabeledCheckbox,
  projectEditFormSchema,
} from '@gitiempo/web-shared';
import type { ProjectEditFormInput } from '@gitiempo/web-shared';
import { Form } from '@primevue/forms';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';
import Select from 'primevue/select';

const props = defineProps<{
  project: ProjectResponse;
  allMembers: WorkspaceMemberListResponse;
  saving?: boolean;
}>();

const emit = defineEmits<{
  archive: [];
  cancelled: [];
  save: [input: ProjectEditFormInput];
  unarchive: [];
}>();

const memberOptions = props.allMembers
  .filter((m) => m.role !== WorkspaceRoles.Admin)
  .map((m) => ({ label: m.displayName ?? m.email, value: m.userId }));
const memberSuggestions = ref(memberOptions.map((option) => option.value));

const visibilityOptions = [
  { label: 'Public', value: 'public' as const },
  { label: 'Private', value: 'private' as const },
];

interface AutoCompleteCompleteEvent {
  query: string;
}

function getMemberOptionLabel(memberId: string): string {
  return memberOptions.find((option) => option.value === memberId)?.label ?? memberId;
}

function handleMemberComplete(event: AutoCompleteCompleteEvent): void {
  const query = event.query.trim().toLowerCase();

  memberSuggestions.value = memberOptions
    .filter((option) => option.label.toLowerCase().includes(query))
    .map((option) => option.value);
}

const initialValues: ProjectEditFormInput = {
  defaultBillableForTasks: props.project.defaultBillableForTasks,
  visibility: props.project.visibility,
  memberIds: props.project.members.map((m) => m.userId),
};

const resolver = zodResolver(projectEditFormSchema);

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

  emit('save', values as ProjectEditFormInput);
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
      <div
        data-testid="project-edit-form-layout"
        class="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-2.5"
      >
        <div class="flex min-w-0 flex-col gap-1.5 sm:flex-1">
          <label
            for="edit-members"
            class="text-text-dark font-sans text-[12px] leading-none font-medium"
          >Select members</label>
          <AutoComplete
            append-to="self"
            input-id="edit-members"
            name="memberIds"
            :suggestions="memberSuggestions"
            :option-label="getMemberOptionLabel"
            complete-on-focus
            dropdown
            dropdown-mode="blank"
            force-selection
            multiple
            :min-length="0"
            placeholder="Search members..."
            :invalid="$form.memberIds?.invalid"
            :pt="giTiempoSelfAppendedMultiAutoCompleteDropdownPt"
            fluid
            @complete="handleMemberComplete"
          />
        </div>

        <div class="flex min-w-0 flex-col gap-1.5 sm:w-[180px] sm:shrink-0">
          <label
            for="edit-visibility"
            class="text-text-dark font-sans text-[12px] leading-none font-medium"
          >Visibility</label>
          <Select
            input-id="edit-visibility"
            name="visibility"
            :options="visibilityOptions"
            option-label="label"
            option-value="value"
            :invalid="$form.visibility?.invalid"
            :pt="giTiempoSelectPt"
            fluid
          />
        </div>

        <div class="flex min-w-0 flex-col gap-1.5 sm:w-[200px] sm:shrink-0">
          <span class="text-text-dark font-sans text-[13px] leading-none font-medium">
            New task billable default
          </span>
          <LabeledCheckbox
            input-id="edit-default-billable-for-tasks"
            label="Billable by default"
            name="defaultBillableForTasks"
            root-class="border-divider bg-surface-primary flex h-[42px] cursor-pointer items-center gap-2.5 rounded-[6px] border px-3"
            :disabled="saving"
          />
        </div>

        <div
          data-testid="project-edit-form-actions"
          class="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:gap-2.5"
        >
          <Button
            type="button"
            severity="danger"
            variant="outlined"
            class="w-full gap-2 sm:w-auto"
            :disabled="saving"
            @click="project.isActive ? emit('archive') : emit('unarchive')"
          >
            <svg
              aria-hidden="true"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M3.75 7.5h16.5" />
              <path d="m5.25 7.5 1.05 11.025A2.25 2.25 0 0 0 8.54 20.5h6.92a2.25 2.25 0 0 0 2.24-1.975L18.75 7.5" />
              <path d="M8.25 7.5V5.75A2.25 2.25 0 0 1 10.5 3.5h3a2.25 2.25 0 0 1 2.25 2.25V7.5" />
              <path d="M9.75 12h4.5" />
            </svg>
            {{ project.isActive ? 'Archive project' : 'Unarchive project' }}
          </Button>
          <Button
            type="button"
            label="Cancel"
            severity="secondary"
            variant="outlined"
            class="w-full sm:w-auto"
            @click="emit('cancelled')"
          />
          <Button
            type="submit"
            label="Save"
            class="w-full sm:w-auto"
            :disabled="saving"
            :loading="saving"
          />
        </div>
      </div>
    </Form>
  </EditFormPanel>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type {
  ProjectResponse,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import { WorkspaceRoles } from '@gitiempo/shared';
import { EditFormPanel, projectEditFormSchema } from '@gitiempo/web-shared';
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

const memberAutoCompletePt = {
  root: { class: 'min-h-[38px] w-full' },
  pcInputText: {
    root: {
      class: 'min-h-[38px] w-full rounded-[6px] font-sans text-[14px] font-medium',
    },
  },
  inputMultiple: {
    class: 'min-h-[38px] w-full rounded-[6px] border-divider px-2 py-1 font-sans text-[14px] font-medium',
  },
  chip: { class: 'bg-accent-tint text-brand font-sans text-[12px] font-semibold' },
  option: { class: 'font-sans text-[14px]' },
} as const;

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
            placeholder="Select members"
            :invalid="$form.memberIds?.invalid"
            :pt="memberAutoCompletePt"
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
            fluid
          />
        </div>

        <div
          data-testid="project-edit-form-actions"
          class="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:gap-2.5"
        >
          <Button
            unstyled
            :disabled="saving"
            type="button"
            class="border-destructive bg-surface-primary text-destructive focus-visible:outline-destructive inline-flex h-8 w-full cursor-pointer items-center justify-center gap-2 rounded-sm border px-3.5 py-2 font-sans text-[13px] leading-none font-semibold whitespace-nowrap shadow-none transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
            unstyled
            type="button"
            class="border-divider bg-surface-primary text-text-dark focus-visible:outline-brand inline-flex h-8 w-full cursor-pointer items-center justify-center rounded-sm border px-3.5 py-2 font-sans text-[13px] leading-none font-medium whitespace-nowrap shadow-none transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            @click="emit('cancelled')"
          >
            Cancel
          </Button>
          <Button
            unstyled
            :disabled="saving"
            :loading="saving"
            type="submit"
            class="bg-brand text-text-inverse focus-visible:outline-brand inline-flex h-8 w-full cursor-pointer items-center justify-center rounded-sm border-0 px-3.5 py-2 font-sans text-[13px] leading-none font-semibold whitespace-nowrap shadow-none transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Save
          </Button>
        </div>
      </div>
    </Form>
  </EditFormPanel>
</template>

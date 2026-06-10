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
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';
import MultiSelect from 'primevue/multiselect';
import { computed, ref } from 'vue';

const props = defineProps<{
  project: ProjectResponse;
  allMembers: WorkspaceMemberListResponse;
  saving?: boolean;
}>();

const emit = defineEmits<{
  cancelled: [];
  save: [input: ProjectEditFormInput];
}>();

const memberOptions = props.allMembers
  .filter((m) => m.role !== WorkspaceRoles.Admin)
  .map((m) => ({ label: m.displayName ?? m.email, value: m.userId }));

const visibilityOptions = [
  { label: 'Public', value: 'public' as const },
  { label: 'Private', value: 'private' as const },
];
const visibility = ref<ProjectEditFormInput['visibility']>(props.project.visibility);
const visibilitySuggestions = ref([...visibilityOptions]);
const selectedVisibilityOption = computed(
  () =>
    visibilityOptions.find((option) => option.value === visibility.value) ??
    visibilityOptions[0],
);

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

  emit('save', {
    ...(values as ProjectEditFormInput),
    visibility: visibility.value,
  });
}

function handleVisibilityComplete(event: { query: string }): void {
  const normalizedQuery = event.query.trim().toLowerCase();

  visibilitySuggestions.value = normalizedQuery
    ? visibilityOptions.filter((option) =>
        option.label.toLowerCase().includes(normalizedQuery),
      )
    : [...visibilityOptions];
}

function handleVisibilityUpdate(
  value: (typeof visibilityOptions)[number] | string | null,
): void {
  if (typeof value === 'string' || value === null) {
    return;
  }

  visibility.value = value.value;
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

        <div class="flex min-w-0 flex-col gap-1.5 sm:w-[180px] sm:shrink-0">
          <label
            for="edit-visibility"
            class="text-text-dark font-sans text-[12px] leading-none font-medium"
          >Visibility</label>
          <AutoComplete
            input-id="edit-visibility"
            :model-value="selectedVisibilityOption"
            :suggestions="visibilitySuggestions"
            complete-on-focus
            dropdown
            dropdown-mode="blank"
            force-selection
            :min-length="0"
            option-label="label"
            :invalid="$form.visibility?.invalid"
            fluid
            @complete="handleVisibilityComplete"
            @update:model-value="handleVisibilityUpdate(($event ?? null) as (typeof visibilityOptions)[number] | string | null)"
          />
        </div>

        <div
          data-testid="project-edit-form-actions"
          class="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:gap-2.5"
        >
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
    </Form>
  </EditFormPanel>
</template>

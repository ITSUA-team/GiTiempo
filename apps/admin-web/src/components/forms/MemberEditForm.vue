<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { ProjectListResponse, WorkspaceMemberResponse } from '@gitiempo/shared';
import {
  composeGiTiempoSelfAppendedAutoCompletePt,
  giTiempoDropdownControlTriggerClass,
} from '@gitiempo/web-config/theme';
import { EditFormPanel, memberAssignFormSchema } from '@gitiempo/web-shared';
import type { MemberAssignFormInput } from '@gitiempo/web-shared';
import { Form } from '@primevue/forms';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';

const props = defineProps<{
  canAssignPm?: boolean;
  canRemove?: boolean;
  member: WorkspaceMemberResponse;
  projects: ProjectListResponse;
  saving?: boolean;
}>();

const emit = defineEmits<{
  cancelled: [];
  remove: [];
  save: [input: MemberAssignFormInput];
}>();

const resolver = zodResolver(memberAssignFormSchema);

const activeProjects = computed(() => props.projects.filter((project) => project.isActive));
const activeProjectOptions = computed(() =>
  activeProjects.value.map((project) => ({ label: project.name, value: project.id })),
);
const projectSuggestions = ref<string[]>([]);
const initialValues = computed<MemberAssignFormInput>(() => ({
  projectIds: activeProjects.value
    .filter((project) =>
      project.members.some((projectMember) => projectMember.userId === props.member.userId),
    )
    .map((project) => project.id),
}));

const projectAutoCompletePt = composeGiTiempoSelfAppendedAutoCompletePt({
  root: { class: 'min-h-[38px]' },
  pcInputText: {
    root: {
      class: 'min-h-[38px] w-full rounded-[6px] font-sans text-[14px] font-medium',
    },
  },
  inputMultiple: {
    class: 'min-h-[38px] w-full rounded-[6px] border-divider px-2 py-1 font-sans text-[14px] font-medium',
  },
  dropdown: { class: giTiempoDropdownControlTriggerClass },
  pcChip: {
    root: { class: 'bg-accent-tint text-brand font-sans text-[12px] font-semibold' },
  },
  option: { class: 'font-sans text-[14px]' },
});

interface AutoCompleteCompleteEvent {
  query: string;
}

function getProjectOptionLabel(projectId: string): string {
  return activeProjectOptions.value.find((option) => option.value === projectId)?.label ?? projectId;
}

function handleProjectComplete(event: AutoCompleteCompleteEvent): void {
  const query = event.query.trim().toLowerCase();

  projectSuggestions.value = activeProjectOptions.value
    .filter((option) => option.label.toLowerCase().includes(query))
    .map((option) => option.value);
}

watch(
  activeProjectOptions,
  (options) => {
    projectSuggestions.value = options.map((option) => option.value);
  },
  { immediate: true },
);

function handleSave({
  valid,
  values,
}: {
  valid: boolean;
  values: Record<string, unknown>;
}): void {
  if (!valid || props.saving || !props.canAssignPm) {
    return;
  }

  emit('save', values as MemberAssignFormInput);
}
</script>

<template>
  <EditFormPanel title="Member settings">
    <Form
      v-slot="$form"
      :resolver="resolver"
      :initial-values="initialValues"
      @submit="handleSave"
    >
      <div
        data-testid="member-edit-form-layout"
        class="flex flex-col gap-3"
      >
        <div
          v-if="props.canAssignPm"
          data-testid="member-edit-project-select"
          class="flex flex-col gap-1.5"
        >
          <label
            :for="`member-settings-${member.id}-projects`"
            class="text-text-dark font-sans text-[12px] leading-none font-medium"
          >Assigned projects</label>
          <AutoComplete
            append-to="self"
            :input-id="`member-settings-${member.id}-projects`"
            name="projectIds"
            :suggestions="projectSuggestions"
            :option-label="getProjectOptionLabel"
            complete-on-focus
            dropdown
            dropdown-mode="blank"
            force-selection
            multiple
            :min-length="0"
            placeholder="Search projects..."
            :invalid="$form.projectIds?.invalid"
            :disabled="saving"
            :pt="projectAutoCompletePt"
            fluid
            @complete="handleProjectComplete"
          />
          <small class="text-text-muted text-xs">
            Type to search active projects, then select multiple results.
          </small>
          <small
            v-if="$form.projectIds?.invalid"
            class="text-destructive text-xs"
          >
            {{ $form.projectIds.error?.message }}
          </small>
        </div>

        <div
          v-if="props.canAssignPm && activeProjects.length === 0"
          class="text-text-muted text-[13px]"
        >
          No active projects available.
        </div>

        <div
          v-if="!props.canAssignPm"
          data-testid="member-edit-assignment-unavailable"
          class="text-text-muted text-[13px]"
        >
          Project assignments are available only for other non-admin members.
        </div>

        <div
          data-testid="member-edit-form-actions"
          class="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:justify-end sm:gap-2.5"
        >
          <Button
            v-if="props.canRemove"
            unstyled
            :disabled="saving"
            type="button"
            class="border-destructive bg-surface-primary text-destructive focus-visible:outline-destructive inline-flex h-[42px] w-full cursor-pointer items-center justify-center rounded-sm border px-3.5 py-2 font-sans text-[13px] leading-none font-semibold whitespace-nowrap shadow-none transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            @click="emit('remove')"
          >
            Remove member
          </Button>
          <Button
            unstyled
            type="button"
            class="border-divider bg-surface-primary text-text-dark focus-visible:outline-brand inline-flex h-[42px] w-full cursor-pointer items-center justify-center rounded-sm border px-3.5 py-2 font-sans text-[13px] leading-none font-medium whitespace-nowrap shadow-none transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            @click="emit('cancelled')"
          >
            Cancel
          </Button>
          <Button
            v-if="props.canAssignPm"
            unstyled
            :disabled="saving"
            :loading="saving"
            type="submit"
            class="bg-brand text-text-inverse focus-visible:outline-brand inline-flex h-[42px] w-full cursor-pointer items-center justify-center rounded-sm border-0 px-3.5 py-2 font-sans text-[13px] leading-none font-semibold whitespace-nowrap shadow-none transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Save changes
          </Button>
        </div>
      </div>
    </Form>
  </EditFormPanel>
</template>

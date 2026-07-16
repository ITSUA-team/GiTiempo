<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { ProjectListResponse, WorkspaceMemberResponse } from '@gitiempo/shared';
import { giTiempoSelfAppendedMultiAutoCompleteDropdownPt } from '@gitiempo/web-config/theme';
import {
  DialogFooterActionGroups,
  EditFormPanel,
  memberAssignFormSchema,
} from '@gitiempo/web-shared';
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
            :pt="giTiempoSelfAppendedMultiAutoCompleteDropdownPt"
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

        <DialogFooterActionGroups
          data-testid="member-edit-form-actions"
          :has-destructive-actions="props.canRemove"
          stack-on-mobile
        >
          <template #destructive>
            <Button
              type="button"
              label="Remove member"
              severity="danger"
              variant="outlined"
              class="w-full sm:w-auto"
              :disabled="saving"
              @click="emit('remove')"
            />
          </template>
          <Button
            type="button"
            label="Cancel"
            severity="secondary"
            variant="outlined"
            class="w-full sm:w-auto"
            @click="emit('cancelled')"
          />
          <Button
            v-if="props.canAssignPm"
            type="submit"
            label="Save changes"
            class="w-full sm:w-auto"
            :disabled="saving"
            :loading="saving"
          />
        </DialogFooterActionGroups>
      </div>
    </Form>
  </EditFormPanel>
</template>

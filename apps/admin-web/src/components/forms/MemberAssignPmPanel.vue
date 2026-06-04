<script setup lang="ts">
import type { ProjectListResponse, WorkspaceMemberResponse } from '@gitiempo/shared';
import { EditFormPanel, memberAssignFormSchema } from '@gitiempo/web-shared';
import type { MemberAssignFormInput } from '@gitiempo/web-shared';
import { Form } from '@primevue/forms';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';

const props = defineProps<{
  member: WorkspaceMemberResponse;
  projects: ProjectListResponse;
  saving?: boolean;
}>();

const emit = defineEmits<{
  cancelled: [];
  save: [input: MemberAssignFormInput];
}>();

const activeProjects = props.projects.filter((p) => p.isActive);

const initialValues: MemberAssignFormInput = {
  projectIds: props.projects
    .filter((p) => p.isActive && p.members.some((m) => m.userId === props.member.userId))
    .map((p) => p.id),
};

const resolver = zodResolver(memberAssignFormSchema);

function handleSubmit({
  valid,
  values,
}: {
  valid: boolean;
  values: Record<string, unknown>;
}): void {
  if (!valid || props.saving) {
    return;
  }

  emit('save', values as MemberAssignFormInput);
}
</script>

<template>
  <EditFormPanel title="PM assignment">
    <Form
      :resolver="resolver"
      :initial-values="initialValues"
      @submit="handleSubmit"
    >
      <div
        data-testid="member-assign-project-list"
        class="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:gap-3"
      >
        <label
          v-for="project in activeProjects"
          :key="project.id"
          :for="`assign-${member.id}-${project.id}`"
          class="bg-surface-primary flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 sm:w-auto"
        >
          <Checkbox
            name="projectIds"
            :input-id="`assign-${member.id}-${project.id}`"
            :value="project.id"
          />
          <span class="text-text-dark text-[13px] font-medium">{{ project.name }}</span>
        </label>
      </div>

      <div
        data-testid="member-assign-actions"
        class="mt-3 grid grid-cols-1 gap-2 sm:flex sm:items-center sm:justify-end sm:gap-2.5"
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
          label="Save Assignments"
          :disabled="saving"
          :loading="saving"
          type="submit"
          class="w-full sm:w-auto"
        />
      </div>
    </Form>
  </EditFormPanel>
</template>

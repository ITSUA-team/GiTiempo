<script setup lang="ts">
import { computed } from 'vue';
import type { ProjectListResponse, WorkspaceMemberResponse } from '@gitiempo/shared';
import { EditFormPanel, memberAssignFormSchema } from '@gitiempo/web-shared';
import type { MemberAssignFormInput } from '@gitiempo/web-shared';
import { Form } from '@primevue/forms';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';

const props = defineProps<{
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
const initialValues = computed<MemberAssignFormInput>(() => ({
  projectIds: activeProjects.value
    .filter((project) =>
      project.members.some((projectMember) => projectMember.userId === props.member.userId),
    )
    .map((project) => project.id),
}));

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

  emit('save', values as MemberAssignFormInput);
}
</script>

<template>
  <EditFormPanel title="Member settings">
    <Form
      :resolver="resolver"
      :initial-values="initialValues"
      @submit="handleSave"
    >
      <div
        data-testid="member-edit-form-layout"
        class="flex flex-col gap-3"
      >
        <div
          data-testid="member-edit-project-list"
          class="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:gap-3"
        >
          <label
            v-for="project in activeProjects"
            :key="project.id"
            :for="`member-settings-${member.id}-${project.id}`"
            class="bg-surface-primary flex min-h-8 w-full cursor-pointer items-center gap-2 rounded-[6px] px-3 py-2 sm:w-auto"
          >
            <Checkbox
              name="projectIds"
              :input-id="`member-settings-${member.id}-${project.id}`"
              :value="project.id"
            />
            <span class="text-text-dark text-[13px] font-medium">{{ project.name }}</span>
          </label>
        </div>

        <div
          v-if="activeProjects.length === 0"
          class="text-text-muted text-[13px]"
        >
          No active projects available.
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
            class="border-destructive bg-surface-primary text-destructive focus-visible:outline-destructive inline-flex h-8 w-full cursor-pointer items-center justify-center rounded-sm border px-3.5 py-2 font-sans text-[13px] leading-none font-semibold whitespace-nowrap shadow-none transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            @click="emit('remove')"
          >
            Remove member
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
            Save changes
          </Button>
        </div>
      </div>
    </Form>
  </EditFormPanel>
</template>

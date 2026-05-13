<script setup lang="ts">
import type { ProjectListResponse, WorkspaceMemberResponse } from '@gitiempo/shared';
import { EditFormPanel, memberAssignFormSchema } from '@gitiempo/web-shared';
import type { MemberAssignFormInput } from '@gitiempo/web-shared';
import { Form } from '@primevue/forms';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import { shallowRef } from 'vue';

import { adminProjectsClient } from '@/services/admin-projects-client';
import { useAuthStore } from '@/stores/auth';
import { useToasts } from '@/composables/useToasts';

const props = defineProps<{
  member: WorkspaceMemberResponse;
  projects: ProjectListResponse;
}>();

const emit = defineEmits<{
  saved: [];
  cancelled: [];
}>();

const authStore = useAuthStore();
const { successToast, errorToast } = useToasts();
const saving = shallowRef(false);

const activeProjects = props.projects.filter((p) => p.isActive);

const initialValues: MemberAssignFormInput = {
  projectIds: props.projects
    .filter((p) => p.isActive && p.members.some((m) => m.userId === props.member.userId))
    .map((p) => p.id),
};

const resolver = zodResolver(memberAssignFormSchema);

async function handleSubmit({
  valid,
  values,
}: {
  valid: boolean;
  values: Record<string, unknown>;
}): Promise<void> {
  if (!valid || saving.value) return;

  const token = authStore.accessToken;
  if (!token) return;

  const { projectIds } = values as MemberAssignFormInput;

  const currentAssignedIds = new Set(
    props.projects
      .filter((p) => p.isActive && p.members.some((m) => m.userId === props.member.userId))
      .map((p) => p.id),
  );
  const nextAssignedIds = new Set(projectIds);

  const toAdd = projectIds.filter((id) => !currentAssignedIds.has(id));
  const toRemove = [...currentAssignedIds].filter((id) => !nextAssignedIds.has(id));

  saving.value = true;

  try {
    for (const projectId of toAdd) {
      await adminProjectsClient.assignMember(token, projectId, props.member.userId);
    }
    for (const projectId of toRemove) {
      await adminProjectsClient.removeAssignment(token, projectId, props.member.userId);
    }

    successToast(`Project assignments for ${props.member.displayName ?? props.member.email} saved.`);
    emit('saved');
  } catch (err) {
    errorToast(err instanceof Error ? err.message : 'Failed to save assignments', {
      error: err,
      logContext: { action: 'save-project-assignments', feature: 'members' },
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <EditFormPanel title="PM assignment">
    <Form
      :resolver="resolver"
      :initial-values="initialValues"
      @submit="handleSubmit"
    >
      <div class="flex flex-wrap gap-3">
        <label
          v-for="project in activeProjects"
          :key="project.id"
          :for="`assign-${member.id}-${project.id}`"
          class="bg-surface flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2"
        >
          <Checkbox
            name="projectIds"
            :input-id="`assign-${member.id}-${project.id}`"
            :value="project.id"
          />
          <span class="text-text-dark text-[13px] font-medium">{{ project.name }}</span>
        </label>
      </div>

      <div class="mt-3 flex items-center justify-end gap-2.5">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          type="button"
          :pt="{ root: { class: 'bg-white' } }"
          @click="emit('cancelled')"
        />
        <Button
          label="Save Assignments"
          :disabled="saving"
          :loading="saving"
          type="submit"
        />
      </div>
    </Form>
  </EditFormPanel>
</template>

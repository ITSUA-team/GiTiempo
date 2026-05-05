<script setup lang="ts">
  import { computed, onMounted, ref, shallowRef } from 'vue';
  import { useRouter } from 'vue-router';
  import { useToast } from 'primevue/usetoast';
  import {
    createProjectsClient,
    createMembersClient,
    type ProjectsClient,
    type MembersClient,
  } from '@gitiempo/web-shared';
  import type { WorkspaceMemberResponse } from '@gitiempo/shared';
  import { useAuthStore } from '@/stores/auth';
  import AddProjectForm from '@/components/projects/AddProjectForm.vue';
  import type { AddProjectFormValues } from '@/validation/projects';
  import { PageHeader } from '@gitiempo/web-shared';
  import ProjectSourceCard from '@/components/projects/ProjectSourceCard.vue';

  const router = useRouter();
  const toast = useToast();
  const authStore = useAuthStore();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const projectsClient: ProjectsClient = createProjectsClient({ apiBaseUrl });
  const membersClient: MembersClient = createMembersClient({ apiBaseUrl });

  const isSubmitting = ref(false);
  const members = shallowRef<WorkspaceMemberResponse[]>([]);
  const membersLoading = ref(true);

  const pmOptions = computed(() =>
    members.value
      .filter((m) => m.role === 'pm')
      .map((m) => ({ userId: m.userId, label: m.displayName ?? m.email })),
  );

  async function loadMembers() {
    if (!authStore.accessToken) return;
    try {
      membersLoading.value = true;
      members.value = await membersClient.listMembers(authStore.accessToken);
    } catch {
      toast.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Could not load members — PM selection unavailable',
        life: 4000,
      });
      members.value = [];
    } finally {
      membersLoading.value = false;
    }
  }

  async function handleSubmit(values: AddProjectFormValues) {
    if (!values.name.trim()) {
      toast.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Project name is required',
      });
      return;
    }

    if (!authStore.accessToken) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Not authenticated',
      });
      return;
    }

    try {
      isSubmitting.value = true;
      const accessToken = authStore.accessToken;

      const newProject = await projectsClient.createProject(
        { name: values.name.trim(), visibility: values.visibility },
        accessToken,
      );

      if (values.pmUserId) {
        try {
          await projectsClient.assignUserToProject(
            newProject.id,
            { userId: values.pmUserId },
            accessToken,
          );
        } catch {
          toast.add({
            severity: 'warn',
            summary: 'Partial success',
            detail: 'Project created but PM could not be assigned',
            life: 5000,
          });
        }
      }

      toast.add({
        severity: 'success',
        summary: 'Created',
        detail: `Project "${newProject.name}" created successfully`,
        life: 4000,
      });

      await router.push({ name: 'admin-projects' });
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail:
          error instanceof Error ? error.message : 'Failed to create project',
      });
    } finally {
      isSubmitting.value = false;
    }
  }

  async function handleCancel() {
    await router.push({ name: 'admin-projects' });
  }

  onMounted(() => loadMembers());
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Page header with back link -->
    <PageHeader
      title="Add Project"
      subtitle="Create a project manually now, with the flexibility to add workspace imports alongside it."
      back-label="Back to projects"
      @back="handleCancel"
    />

    <!-- Body: form + source card side by side -->
    <div class="flex items-start gap-5">
      <AddProjectForm
        :pm-options="pmOptions"
        :members-loading="membersLoading"
        :is-submitting="isSubmitting"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
      <ProjectSourceCard />
    </div>
  </div>
</template>

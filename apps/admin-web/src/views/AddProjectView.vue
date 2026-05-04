<script setup lang="ts">
  import { computed, onMounted, ref, shallowRef } from 'vue';
  import { useRouter } from 'vue-router';
  import { useToast } from 'primevue/usetoast';
  import { AppInput, AppSelect, AppFormField } from '@gitiempo/web-shared';
  import {
    createProjectsClient,
    createMembersClient,
    type ProjectsClient,
    type MembersClient,
  } from '@gitiempo/web-shared';
  import type {
    CreateProjectInput,
    WorkspaceMemberResponse,
  } from '@gitiempo/shared';
  import { useAuthStore } from '@/stores/auth';

  const router = useRouter();
  const toast = useToast();
  const authStore = useAuthStore();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const projectsClient: ProjectsClient = createProjectsClient({ apiBaseUrl });
  const membersClient: MembersClient = createMembersClient({ apiBaseUrl });

  // Form state
  const projectName = ref('');
  const projectVisibility = ref<'public' | 'private'>('private');
  const selectedPmUserId = ref<string | null>(null);
  const isSubmitting = ref(false);

  // Members state
  const members = shallowRef<WorkspaceMemberResponse[]>([]);
  const membersLoading = ref(true);

  // PM options — only members with role === "pm"
  const pmOptions = computed(() =>
    members.value
      .filter((m) => m.role === 'pm')
      .map((m) => ({ userId: m.userId, label: m.displayName ?? m.email })),
  );

  // Visibility options
  const visibilityOptions = [
    { label: 'Public', value: 'public' },
    { label: 'Private', value: 'private' },
  ];

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

  async function handleSubmit() {
    if (!projectName.value.trim()) {
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

      const createInput: CreateProjectInput = {
        name: projectName.value.trim(),
        visibility: projectVisibility.value,
      };

      const newProject = await projectsClient.createProject(
        createInput,
        accessToken,
      );

      // Best-effort PM assignment — failure doesn't block navigation
      if (selectedPmUserId.value) {
        try {
          await projectsClient.assignUserToProject(
            newProject.id,
            { userId: selectedPmUserId.value },
            accessToken,
          );
        } catch {
          toast.add({
            severity: 'warn',
            summary: 'Partial success',
            detail: `Project created but PM could not be assigned`,
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
    <!-- Back link -->
    <button
      class="text-brand w-fit text-[13px] font-semibold hover:opacity-75"
      @click="handleCancel"
    >
      ← Back to projects
    </button>

    <!-- Page header -->
    <div class="flex flex-col gap-1.5">
      <h1 class="text-text-dark text-[28px] font-semibold leading-none">
        Add Project
      </h1>
      <p class="text-text-muted text-sm">
        Create a project manually now, with the flexibility to add workspace
        imports alongside it.
      </p>
    </div>

    <!-- Body: form card + source card -->
    <div class="flex gap-5">
      <!-- Form card -->
      <div
        class="bg-surface shadow-card flex flex-1 flex-col gap-3 rounded-lg p-4"
      >
        <h2 class="text-text-dark text-[18px] font-semibold">
          Add Project Manually
        </h2>

        <form class="flex flex-col gap-[10px]" @submit.prevent="handleSubmit">
          <!-- Project name -->
          <AppInput
            id="project-name"
            v-model="projectName"
            label="Project name"
            placeholder="Enter project name"
            :maxlength="255"
            :disabled="isSubmitting"
          />

          <!-- Source + Project manager row -->
          <div class="flex gap-3">
            <!-- Source (read-only) -->
            <AppFormField label="Source" class="flex-1">
              <div
                class="border-divider bg-surface text-text-dark flex h-[34px] items-center rounded-[6px] border px-3 text-[14px] font-medium"
              >
                Manual
              </div>
            </AppFormField>

            <!-- Project manager selector -->
            <AppFormField label="Project manager" class="w-[160px] shrink-0">
              <AppSelect
                v-model="selectedPmUserId"
                :options="pmOptions"
                option-label="label"
                option-value="userId"
                placeholder="Select PM"
                empty-message="No PMs available"
                :disabled="isSubmitting || membersLoading"
              />
            </AppFormField>
          </div>

          <!-- Visibility -->
          <AppFormField label="Visibility">
            <AppSelect
              v-model="projectVisibility"
              :options="visibilityOptions"
              option-label="label"
              option-value="value"
              :disabled="isSubmitting"
            />
          </AppFormField>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-[10px] pt-1">
            <button
              type="button"
              class="border-divider bg-surface text-text-dark cursor-pointer rounded-[6px] border px-[14px] py-[8px] text-[13px] font-medium hover:opacity-75 disabled:opacity-50"
              :disabled="isSubmitting"
              @click="handleCancel"
            >
              Back
            </button>
            <button
              type="submit"
              class="bg-brand text-surface cursor-pointer rounded-[6px] px-[14px] py-[8px] text-[13px] font-semibold hover:opacity-75 disabled:opacity-50"
              :disabled="isSubmitting || !projectName.trim()"
            >
              <span v-if="isSubmitting">Creating…</span>
              <span v-else>Create project</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Project Source info card -->
      <div
        class="flex w-[320px] shrink-0 flex-col gap-[14px] rounded-[10px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
      >
        <h3 class="text-text-dark text-[18px] font-semibold">Project Source</h3>
        <p class="text-text-muted text-[13px]">
          Projects can come from connected workspaces or be added manually. This
          screen covers the manual path.
        </p>

        <!-- Manual option (active) -->
        <div
          class="border-brand bg-accent-tint flex flex-col gap-2 rounded-[10px] border p-[14px]"
        >
          <span class="text-text-dark text-[14px] font-semibold">
            Manual project
          </span>
          <p class="text-text-muted text-[13px]">
            Use this when a project is internal, still being prepared, or not
            available through a workspace import yet.
          </p>
        </div>

        <!-- Workspace import (disabled) -->
        <div
          class="bg-app-bg flex flex-col gap-2 rounded-[10px] p-[14px] opacity-60"
        >
          <span class="text-text-dark text-[14px] font-semibold">
            Workspace import
          </span>
          <p class="text-text-muted text-[13px]">
            Use imports when the project already exists in a connected workspace
            and should keep its external context.
          </p>
        </div>

        <p class="text-text-muted text-[12px]">
          You can still assign the PM, set visibility, and adjust project
          details after creation.
        </p>
      </div>
    </div>
  </div>
</template>

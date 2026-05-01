<script setup lang="ts">
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { useToast } from 'primevue/usetoast';
  import Button from 'primevue/button';
  import InputText from 'primevue/inputtext';
  import Select from 'primevue/select';
  import { useAuthStore } from '@/stores/auth';
  import {
    createProjectsClient,
    type ProjectsClient,
  } from '@gitiempo/web-shared';
  import type { CreateProjectInput } from '@gitiempo/shared';

  const router = useRouter();
  const toast = useToast();
  const authStore = useAuthStore();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const projectsClient: ProjectsClient = createProjectsClient({ apiBaseUrl });

  // Form state
  const projectName = ref('');
  const projectVisibility = ref<'public' | 'private'>('private');
  const projectColor = ref<string | null>(null);
  const isSubmitting = ref(false);

  // Visibility options
  const visibilityOptions = [
    { label: 'Public', value: 'public' },
    { label: 'Private', value: 'private' },
  ];

  // Handle form submission
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
        color: projectColor.value,
      };

      await projectsClient.createProject(createInput, accessToken);

      toast.add({
        severity: 'success',
        summary: 'Created',
        detail: `Project "${projectName.value}" created successfully`,
        life: 4000,
      });

      // Redirect back to projects list
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

  // Handle cancel
  async function handleCancel() {
    await router.push({ name: 'admin-projects' });
  }
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Back link -->
    <button
      class="text-brand text-left text-sm font-semibold hover:opacity-80"
      @click="handleCancel"
    >
      ← Back to projects
    </button>

    <!-- Header -->
    <div class="flex flex-col gap-2">
      <h1 class="text-text-dark text-2xl font-semibold">Add Project</h1>
      <p class="text-text-muted text-sm">
        Create a project manually now, with the flexibility to add workspace
        imports alongside it.
      </p>
    </div>

    <!-- Main content: two-column layout -->
    <div class="flex gap-6">
      <!-- Left: Form card -->
      <div class="flex-1">
        <div class="border-divider bg-surface rounded-lg border p-4">
          <h2 class="text-text-dark mb-4 text-lg font-semibold">
            Add Project Manually
          </h2>

          <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
            <!-- Project Name -->
            <div class="flex flex-col gap-2">
              <label
                for="project-name"
                class="text-text-dark text-xs font-medium uppercase tracking-wide"
              >
                Project name
              </label>
              <InputText
                id="project-name"
                v-model="projectName"
                placeholder="Enter project name"
                class="w-full"
                :disabled="isSubmitting"
                maxlength="255"
              />
            </div>

            <!-- Source (read-only) -->
            <div class="flex flex-col gap-2">
              <label
                for="source"
                class="text-text-dark text-xs font-medium uppercase tracking-wide"
              >
                Source
              </label>
              <InputText
                id="source"
                value="Manual"
                disabled
                class="bg-app-bg w-full"
              />
            </div>

            <!-- Project Manager (read-only) -->
            <div class="flex flex-col gap-2">
              <label
                for="pm"
                class="text-text-dark text-xs font-medium uppercase tracking-wide"
              >
                Project manager
              </label>
              <InputText
                id="pm"
                value="Current User"
                disabled
                class="bg-app-bg w-full"
              />
            </div>

            <!-- Visibility -->
            <div class="flex flex-col gap-2">
              <label
                for="visibility"
                class="text-text-dark text-xs font-medium uppercase tracking-wide"
              >
                Visibility
              </label>
              <Select
                id="visibility"
                v-model="projectVisibility"
                :options="visibilityOptions"
                option-label="label"
                option-value="value"
                class="w-full"
                :disabled="isSubmitting"
              />
            </div>

            <!-- Color (optional) -->
            <div class="flex flex-col gap-2">
              <label
                for="color"
                class="text-text-dark text-xs font-medium uppercase tracking-wide"
              >
                Color (Optional)
              </label>
              <div class="flex items-center gap-2">
                <input
                  id="color"
                  v-model="projectColor"
                  type="color"
                  class="border-divider h-9 w-16 cursor-pointer rounded border"
                  :disabled="isSubmitting"
                />
                <InputText
                  v-model="projectColor"
                  type="text"
                  placeholder="#000000"
                  pattern="^#[0-9A-Fa-f]{6}$|^$"
                  class="flex-1"
                  :disabled="isSubmitting"
                />
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                label="Back"
                severity="secondary"
                variant="outlined"
                size="small"
                :disabled="isSubmitting"
                @click="handleCancel"
              />
              <Button
                type="submit"
                label="Create project"
                size="small"
                :loading="isSubmitting"
                :disabled="isSubmitting || !projectName.trim()"
              />
            </div>
          </form>
        </div>
      </div>

      <!-- Right: Project Source info card -->
      <div class="w-80 flex-shrink-0">
        <div class="border-divider bg-surface rounded-lg border p-5 shadow-sm">
          <h3 class="text-text-dark mb-3 text-lg font-semibold">
            Project Source
          </h3>

          <p class="text-text-muted mb-4 text-sm">
            Projects can come from connected workspaces or be added manually.
            This screen covers the manual path.
          </p>

          <!-- Manual option (selected) -->
          <div class="border-brand bg-accent-tint mb-3 rounded border p-3">
            <div class="text-brand mb-1 text-sm font-semibold">
              Manual project
            </div>
            <p class="text-text-muted text-xs">
              Add a project manually to get started
            </p>
          </div>

          <!-- Import option (disabled) -->
          <div
            class="border-divider bg-app-bg mb-4 rounded border p-3 opacity-50"
          >
            <div class="text-text-dark mb-1 text-sm font-semibold">
              Workspace import
            </div>
            <p class="text-text-muted text-xs">
              Link directly from your installed workspace
            </p>
          </div>

          <!-- Note -->
          <p class="text-text-muted text-xs">
            You can still assign the PM, set visibility, and adjust project
            details after creation.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

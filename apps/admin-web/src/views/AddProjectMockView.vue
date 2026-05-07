<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { useToast } from "primevue/usetoast";

import { routeNames } from "@/router";
import { adminProjectsClient } from "@/services/admin-projects-client";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const projectName = ref("");
const visibility = ref<"public" | "private">("private");
const isSubmitting = ref(false);
const submitError = ref<string | null>(null);
const nameError = ref<string | null>(null);

const visibilityOptions = [
  { label: "Public", value: "public" },
  { label: "Private", value: "private" },
];

async function handleSubmit(): Promise<void> {
  nameError.value = null;
  submitError.value = null;

  const trimmedName = projectName.value.trim();

  if (!trimmedName) {
    nameError.value = "Project name is required";
    return;
  }

  const token = authStore.accessToken;

  if (!token) {
    submitError.value = "You must be authenticated to create a project";
    return;
  }

  isSubmitting.value = true;

  try {
    await adminProjectsClient.createProject(token, {
      name: trimmedName,
      visibility: visibility.value,
    });

    toast.add({
      severity: "success",
      summary: "Project created",
      detail: `"${trimmedName}" has been created successfully.`,
      life: 4000,
    });

    await router.push({ name: routeNames.projects });
  } catch (err) {
    submitError.value =
      err instanceof Error ? err.message : "An unexpected error occurred";
  } finally {
    isSubmitting.value = false;
  }
}

function handleBack(): void {
  router.push({ name: routeNames.projects });
}
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <!-- Back link -->
    <div>
      <a
        class="text-brand cursor-pointer text-[13px] font-semibold"
        @click="handleBack"
      >
        ← Back to projects
      </a>
    </div>

    <!-- Page header -->
    <div class="flex flex-col gap-1.5">
      <h1 class="text-text-dark text-[28px] font-semibold">
        Add Project
      </h1>
      <p class="text-text-muted text-sm font-normal">
        Create a project manually now, with the flexibility to add workspace
        imports alongside it.
      </p>
    </div>

    <!-- Body: form card + source card -->
    <div class="flex gap-5">
      <!-- Form card -->
      <div
        class="bg-surface flex flex-1 flex-col gap-3 rounded-lg p-4"
      >
        <h2 class="text-text-dark text-lg font-semibold">
          Add Project Manually
        </h2>

        <div class="flex flex-col gap-2.5">
          <!-- Project name -->
          <div class="flex flex-col gap-1.5">
            <label
              class="text-text-dark text-[13px] font-medium"
              for="project-name"
            >
              Project name
            </label>
            <InputText
              id="project-name"
              v-model="projectName"
              class="w-full"
              :invalid="!!nameError"
              :disabled="isSubmitting"
              placeholder="Enter project name"
            />
            <small
              v-if="nameError"
              class="text-status-error-text text-xs"
            >
              {{ nameError }}
            </small>
          </div>

          <!-- Source + Project manager row -->
          <div class="flex gap-3">
            <div class="flex flex-1 flex-col gap-1.5">
              <label class="text-text-dark text-[13px] font-medium">
                Source
              </label>
              <div
                class="border-divider text-text-dark flex h-[34px] items-center rounded-md border px-3 text-sm font-medium"
              >
                Manual
              </div>
            </div>
            <div class="flex w-40 flex-col gap-1.5">
              <label class="text-text-dark text-[13px] font-medium">
                Project manager
              </label>
              <div
                class="border-divider text-text-dark flex h-[34px] items-center rounded-md border px-3 text-sm font-medium"
              >
                {{ authStore.displayName ?? "—" }}
              </div>
            </div>
          </div>

          <!-- Visibility -->
          <div class="flex flex-col gap-1.5">
            <label
              class="text-text-dark text-[13px] font-medium"
              for="visibility"
            >
              Visibility
            </label>
            <Select
              id="visibility"
              v-model="visibility"
              :options="visibilityOptions"
              option-label="label"
              option-value="value"
              class="w-full"
              :disabled="isSubmitting"
            />
          </div>
        </div>

        <!-- Action row -->
        <div class="flex items-center justify-end gap-2.5">
          <Button
            label="Back"
            severity="secondary"
            outlined
            :disabled="isSubmitting"
            @click="handleBack"
          />
          <Button
            label="Create project"
            :loading="isSubmitting"
            :disabled="isSubmitting"
            @click="handleSubmit"
          />
        </div>

        <!-- Submit error -->
        <p
          v-if="submitError"
          class="text-status-error-text text-[13px]"
        >
          {{ submitError }}
        </p>
      </div>

      <!-- Project Source sidebar card -->
      <div
        class="shadow-card flex w-80 shrink-0 flex-col gap-3.5 rounded-lg bg-white p-5"
      >
        <h2 class="text-text-dark text-lg font-semibold">
          Project Source
        </h2>
        <p class="text-text-muted text-[13px] font-normal">
          Projects can come from connected workspaces or be added manually. This
          screen covers the manual path.
        </p>

        <!-- Manual project tile -->
        <div
          class="border-brand flex flex-col gap-2 rounded-lg border bg-[#F7F2FC] p-3.5"
        >
          <span class="text-text-dark text-sm font-semibold">
            Manual project
          </span>
          <span class="text-text-muted text-[13px] font-normal">
            Use this when a project is internal, still being prepared, or not
            available through a workspace import yet.
          </span>
        </div>

        <!-- Workspace import tile -->
        <div
          class="flex flex-col gap-2 rounded-lg bg-[#F4F4F5] p-3.5"
        >
          <span class="text-text-dark text-sm font-semibold">
            Workspace import
          </span>
          <span class="text-text-muted text-[13px] font-normal">
            Use imports when the project already exists in a connected workspace
            and should keep its external context.
          </span>
        </div>

        <!-- Footer note -->
        <p class="text-text-muted text-xs font-normal">
          You can still assign the PM, set visibility, and adjust project
          details after creation.
        </p>
      </div>
    </div>
  </div>
</template>

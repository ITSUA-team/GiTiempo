<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { WorkspaceRoles } from "@gitiempo/shared";
import type { WorkspaceMemberListResponse } from "@gitiempo/shared";
import { createProjectFormSchema } from "@gitiempo/web-shared";
import type { CreateProjectFormInput } from "@gitiempo/web-shared";
import { Form } from "@primevue/forms";
import { zodResolver } from "@primevue/forms/resolvers/zod";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { routeNames } from "@/router";
import { adminProjectsClient } from "@/services/admin-projects-client";
import { useAuthStore } from "@/stores/auth";
import { useToasts } from "@/composables/useToasts";

const router = useRouter();
const authStore = useAuthStore();
const { successToast, errorToast } = useToasts();

// Members for PM selector
const members = ref<WorkspaceMemberListResponse>([]);
const membersLoading = ref(false);
const membersError = ref<string | null>(null);
const isSubmitting = ref(false);

const visibilityOptions = [
  { label: "Public", value: "public" as const },
  { label: "Private", value: "private" as const },
];

const memberOptions = () =>
  members.value
    .filter((m) => m.role === WorkspaceRoles.PM)
    .map((m) => ({
      label: m.displayName ?? m.email,
      value: m.userId,
    }));

const resolver = zodResolver(createProjectFormSchema);

const initialValues: CreateProjectFormInput = {
  name: "",
  visibility: "private",
  managerUserId: null,
};

async function loadMembers(): Promise<void> {
  const token = authStore.accessToken;
  if (!token) return;

  membersLoading.value = true;
  membersError.value = null;

  try {
    members.value = await adminProjectsClient.listMembers(token);
  } catch (err) {
    membersError.value =
      err instanceof Error ? err.message : "Failed to load members";
  } finally {
    membersLoading.value = false;
  }
}

async function handleSubmit({
  valid,
  values,
}: {
  valid: boolean;
  values: Record<string, unknown>;
}): Promise<void> {
  if (!valid) return;

  const token = authStore.accessToken;
  if (!token) return;

  const { name, visibility, managerUserId } = values as CreateProjectFormInput;

  isSubmitting.value = true;

  try {
    const project = await adminProjectsClient.createProject(token, {
      name: name.trim(),
      visibility,
    });

    if (managerUserId) {
      await adminProjectsClient.assignMember(token, project.id, managerUserId);
    }

    successToast(`"${name.trim()}" has been created successfully.`);
    await router.push({ name: routeNames.projects });
  } catch (err) {
    errorToast(err instanceof Error ? err.message : "An unexpected error occurred");
  } finally {
    isSubmitting.value = false;
  }
}

function handleBack(): void {
  router.push({ name: routeNames.projects });
}

onMounted(loadMembers);
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <!-- Back link -->
    <div>
      <Button
        label="← Back to projects"
        text
        class="!p-0 !text-[13px] !font-semibold"
        @click="handleBack"
      />
    </div>

    <!-- Page header -->
    <div class="flex flex-col gap-1.5">
      <h1 class="text-text-dark text-[28px] leading-tight font-semibold">
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
      <div class="bg-surface flex flex-1 flex-col gap-3 rounded-lg p-4">
        <h2 class="text-text-dark text-lg font-semibold">
          Add Project Manually
        </h2>

        <Form
          v-slot="$form"
          :resolver="resolver"
          :initial-values="initialValues"
          @submit="handleSubmit"
        >
          <!-- Fields -->
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
                name="name"
                :invalid="$form.name?.invalid"
                :disabled="isSubmitting"
                class="h-[34px] w-full rounded-[6px] px-3 text-[14px] font-medium"
                placeholder="Customer Portal"
              />
              <small
                v-if="$form.name?.invalid"
                class="text-status-error-text text-xs"
              >
                {{ $form.name.error?.message }}
              </small>
            </div>

            <!-- Source + Project manager row -->
            <div class="flex gap-3">
              <!-- Source: read-only display field -->
              <div class="flex flex-1 flex-col gap-1.5">
                <label class="text-text-dark text-[13px] font-medium">
                  Source
                </label>
                <div
                  class="border-divider text-text-dark flex h-[34px] items-center rounded-[6px] border bg-white px-3 text-[14px] font-medium"
                >
                  Manual
                </div>
              </div>

              <!-- Project manager: select from PM members -->
              <div class="flex w-40 flex-col gap-1.5">
                <label
                  class="text-text-dark text-[13px] font-medium"
                  for="project-manager"
                >
                  Project manager
                </label>
                <Select
                  id="project-manager"
                  name="managerUserId"
                  :options="memberOptions()"
                  option-label="label"
                  option-value="value"
                  placeholder="Select"
                  :loading="membersLoading"
                  :disabled="isSubmitting || membersLoading"
                  :pt="{
                    root: { class: 'h-[34px] w-full text-[14px] rounded-[6px]' },
                    label: { class: 'text-[14px] font-medium py-0 flex items-center' },
                  }"
                />
                <small
                  v-if="membersError"
                  class="text-status-error-text text-xs"
                >
                  {{ membersError }}
                </small>
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
                name="visibility"
                :options="visibilityOptions"
                option-label="label"
                option-value="value"
                :disabled="isSubmitting"
                :pt="{
                  root: { class: 'h-[34px] w-full text-[14px] rounded' },
                  label: { class: 'text-[14px] font-medium py-0 flex items-center' },
                }"
              />
            </div>
          </div>

          <!-- Action row -->
          <div class="mt-3 flex items-center justify-end gap-2.5">
            <Button
              label="Back"
              severity="secondary"
              outlined
              type="button"
              :pt="{ root: { class: 'bg-white' } }"
              :disabled="isSubmitting"
              @click="handleBack"
            />
            <Button
              label="Create project"
              type="submit"
              :loading="isSubmitting"
            />
          </div>
        </Form>
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

        <!-- Manual project tile: highlighted/selected -->
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

        <!-- Workspace import tile: default/unselected -->
        <div class="flex flex-col gap-2 rounded-lg bg-[#F4F4F5] p-3.5">
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

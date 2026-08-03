<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  WorkspaceRoles,
  type WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import {
  Form,
} from '@primevue/forms';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import { giTiempoSelectPt } from '@gitiempo/web-config/theme';
import {
  createProjectFormSchema,
  LabeledCheckbox,
  type CreateProjectFormInput,
} from '@gitiempo/web-shared';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';

import { useToasts } from '@/composables/feedback/useToasts';
import { routeNames } from '@/router';
import { adminMembersClient } from '@/services/admin-members-client';
import { adminProjectsClient } from '@/services/admin-projects-client';
import { useAuthStore } from '@/stores/auth';
import GitHubProjectImportPanel from '@/components/projects/GitHubProjectImportPanel.vue';

const router = useRouter();
const authStore = useAuthStore();
const { successToast, errorToast } = useToasts();

const members = ref<WorkspaceMemberListResponse>([]);
const membersLoading = ref(false);
const membersError = ref<string | null>(null);
const isSubmitting = ref(false);
const sourceMode = ref<'manual' | 'github'>('manual');

function setSourceMode(mode: 'manual' | 'github'): void {
  sourceMode.value = mode;
}

function handleImported(): void {
  successToast('Projects imported');
  void router.push({ name: routeNames.projects });
}

const visibilityOptions = [
  { label: 'Public', value: 'public' as const },
  { label: 'Private', value: 'private' as const },
];

const resolver = zodResolver(createProjectFormSchema);

const initialValues: CreateProjectFormInput = {
  defaultBillableForTasks: true,
  name: '',
  visibility: 'private',
  managerUserId: null,
};

function memberOptions() {
  return members.value
    .filter((member) => member.role === WorkspaceRoles.PM)
    .map((member) => ({
      label: member.displayName ?? member.email,
      value: member.userId,
    }));
}

async function loadMembers(): Promise<void> {
  const token = authStore.accessToken;
  if (!token) {
    return;
  }

  membersLoading.value = true;
  membersError.value = null;

  try {
    members.value = await adminMembersClient.listMembers();
  } catch (err) {
    membersError.value = err instanceof Error ? err.message : 'Failed to load members';
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
  if (!valid) {
    return;
  }

  const token = authStore.accessToken;
  if (!token) {
    return;
  }

  const {
    defaultBillableForTasks,
    name,
    visibility,
    managerUserId,
  } = values as CreateProjectFormInput;

  isSubmitting.value = true;

  try {
    const trimmedName = name.trim();
    const project = await adminProjectsClient.createProject({
      defaultBillableForTasks,
      name: trimmedName,
      visibility,
    });

    if (managerUserId) {
      await adminProjectsClient.assignMember(project.id, managerUserId);
    }

    successToast(`"${trimmedName}" has been created successfully.`);
    await router.push({ name: routeNames.projects });
  } catch (err) {
    errorToast(err instanceof Error ? err.message : 'An unexpected error occurred', {
      error: err,
      logContext: { action: 'create-project', feature: 'projects' },
    });
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
  <div class="flex min-w-0 flex-col gap-6">
    <div>
      <Button
        label="← Back to projects"
        variant="text"
        class="!p-0 text-[13px] font-semibold"
        @click="handleBack"
      />
    </div>

    <div class="flex min-w-0 flex-col gap-6 md:flex-row">
      <div class="bg-surface-primary flex min-w-0 flex-1 flex-col gap-4 rounded-lg p-6">
        <h2 class="text-text-dark text-lg font-semibold">
          {{
            sourceMode === 'github'
              ? 'Import Projects From GitHub'
              : 'Add Project Manually'
          }}
        </h2>

        <GitHubProjectImportPanel
          v-if="sourceMode === 'github'"
          @imported="handleImported"
        />

        <Form
          v-else
          v-slot="$form"
          :resolver="resolver"
          :initial-values="initialValues"
          @submit="handleSubmit"
        >
          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-1.5">
              <label
                for="project-name"
                class="text-text-dark text-[13px] font-medium"
              >
                Project name
              </label>
              <InputText
                id="project-name"
                name="name"
                :invalid="$form.name?.invalid"
                :disabled="isSubmitting"
                class="h-[38px] w-full rounded-[6px] px-3 text-[14px] font-medium"
                placeholder="Customer Portal"
              />
              <small
                v-if="$form.name?.invalid"
                class="text-status-error-text text-xs"
              >
                {{ $form.name.error?.message }}
              </small>
            </div>

            <div class="flex flex-col gap-3 sm:flex-row">
              <div class="flex flex-1 flex-col gap-1.5">
                <label class="text-text-dark text-[13px] font-medium">
                  Source
                </label>
                <div class="border-divider text-text-dark bg-surface-primary flex h-[38px] items-center rounded-[6px] border px-3 text-[14px] font-medium">
                  Manual
                </div>
              </div>

              <div class="flex w-full flex-col gap-1.5 sm:w-40">
                <label
                  for="project-manager"
                  class="text-text-dark text-[13px] font-medium"
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
                  :pt="giTiempoSelectPt"
                />
                <small
                  v-if="membersError"
                  class="text-status-error-text text-xs"
                >
                  {{ membersError }}
                </small>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label
                for="visibility"
                class="text-text-dark text-[13px] font-medium"
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
                :pt="giTiempoSelectPt"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <span class="text-text-dark text-[13px] font-medium">
                Default billable for new tasks
              </span>
              <LabeledCheckbox
                input-id="default-billable-for-tasks"
                label="Billable by default"
                label-class="text-text-dark text-[14px] font-medium"
                name="defaultBillableForTasks"
                root-class="border-divider bg-surface-primary flex h-[38px] cursor-pointer items-center gap-2.5 rounded-[6px] border px-3"
                :disabled="isSubmitting"
              />
              <small class="text-text-muted text-xs">
                New tasks in this project inherit this value unless changed later.
              </small>
            </div>
          </div>

          <div class="mt-4 flex items-center justify-end gap-2">
            <Button
              label="Back"
              severity="secondary"
              outlined
              type="button"
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

      <div class="shadow-card bg-surface-primary flex w-full flex-col gap-4 rounded-lg p-6 md:w-80 md:shrink-0">
        <h2 class="text-text-dark text-lg font-semibold">
          Project Source
        </h2>
        <p class="text-text-muted text-[13px] font-normal">
          Imported projects are named
          <span class="text-text-dark font-medium">organization/project</span>,
          so the owner is visible in the projects list.
        </p>

        <button
          type="button"
          class="focus-visible:outline-brand flex cursor-pointer flex-col gap-2 rounded-lg border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          :class="
            sourceMode === 'manual'
              ? 'border-brand bg-accent-tint'
              : 'bg-app-bg hover:border-brand/40 border-transparent'
          "
          role="radio"
          :aria-checked="sourceMode === 'manual'"
          data-testid="project-source-manual"
          @click="setSourceMode('manual')"
        >
          <span class="text-text-dark text-sm font-semibold">
            Manual project
          </span>
          <span class="text-text-muted text-[13px] font-normal">
            For internal work, or anything not on GitHub. No
            organization/repository, source stays
            <span class="text-text-dark font-medium">Manual</span>.
          </span>
        </button>

        <button
          type="button"
          class="focus-visible:outline-brand flex cursor-pointer flex-col gap-2 rounded-lg border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          :class="
            sourceMode === 'github'
              ? 'border-brand bg-accent-tint'
              : 'bg-app-bg hover:border-brand/40 border-transparent'
          "
          role="radio"
          :aria-checked="sourceMode === 'github'"
          data-testid="project-source-github"
          @click="setSourceMode('github')"
        >
          <span class="text-text-dark text-sm font-semibold">
            Import from GitHub
          </span>
          <span class="text-text-muted text-[13px] font-normal">
            Adds a GitHub project as
            <span class="text-text-dark font-medium">ITSUA-team/Krvn</span>. If
            all of its issues come from one repository, that repository is
            linked too.
          </span>
        </button>

        <p class="text-text-muted text-xs font-normal">
          You can still assign the PM, set visibility, and adjust project
          details after creation.
        </p>
      </div>
    </div>
  </div>
</template>

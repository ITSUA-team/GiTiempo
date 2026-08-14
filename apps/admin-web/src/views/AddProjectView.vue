<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
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
  importProjectFormSchema,
  LabeledCheckbox,
  type CreateProjectFormInput,
} from '@gitiempo/web-shared';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';

import { useToasts } from '@/composables/feedback/useToasts';
import { routeNames } from '@/router';
import { adminMembersClient } from '@/services/admin-members-client';
import { adminProjectsClient } from '@/services/admin-projects-client';
import { useAuthStore } from '@/stores/auth';
import GitHubProjectFields from '@/components/projects/GitHubProjectFields.vue';
import {
  describeIssuesScanned,
  describeLinkedRepository,
  describeOutcome,
  describeProjectName,
  describeStatus,
  isBoardAddable,
  type BoardOption,
  type GitHubFieldsAvailability,
} from '@/components/projects/github-project-import';

type FormFieldState = { value?: unknown } | undefined;
type FormState = Record<string, FormFieldState>;

const router = useRouter();
const authStore = useAuthStore();
const { successToast, errorToast } = useToasts();

const members = ref<WorkspaceMemberListResponse>([]);
const membersLoading = ref(false);
const membersError = ref<string | null>(null);
const isSubmitting = ref(false);
const sourceMode = ref<'manual' | 'github'>('manual');
const githubSelection = ref<BoardOption | null>(null);
const githubAvailability = ref<GitHubFieldsAvailability>('loading');
const isScanningBoard = ref(false);
const importError = ref<string | null>(null);
const projectForm = ref<{
  setFieldValue: (field: string, value: unknown) => void;
} | null>(null);

watch(githubSelection, () => {
  importError.value = null;
});

const sourceOptions = [
  { label: 'Manual project', value: 'manual' as const },
  { label: 'Import from GitHub', value: 'github' as const },
];

const visibilityOptions = [
  { label: 'Public', value: 'public' as const },
  { label: 'Private', value: 'private' as const },
];

const resolver = computed(() =>
  zodResolver(
    sourceMode.value === 'github'
      ? importProjectFormSchema
      : createProjectFormSchema,
  ),
);

const initialValues: CreateProjectFormInput = {
  defaultBillableForTasks: true,
  name: '',
  visibility: 'private',
  managerUserId: null,
};

const isGitHub = computed(() => sourceMode.value === 'github');

const derivedName = computed(() =>
  githubSelection.value === null
    ? null
    : describeProjectName(githubSelection.value),
);

const canSubmit = computed(() => {
  if (!isGitHub.value) {
    return true;
  }

  const option = githubSelection.value;

  return (
    option !== null &&
    isBoardAddable(option) &&
    option.scanState !== 'missing' &&
    !isScanningBoard.value
  );
});

function memberOptions() {
  return members.value
    .filter((member) => member.role === WorkspaceRoles.PM)
    .map((member) => ({
      label: member.displayName ?? member.email,
      value: member.userId,
    }));
}

const detailRows = computed(() => {
  const option = githubSelection.value;

  if (option === null) {
    return [];
  }

  return [
    {
      label: 'Linked repository',
      testid: 'github-import-linked-repository',
      value: describeLinkedRepository(option),
    },
    {
      label: 'Issues scanned',
      testid: 'github-import-issues-scanned',
      value: describeIssuesScanned(option),
    },
    {
      label: 'Status',
      testid: 'github-import-status',
      value: describeStatus(option),
    },
  ];
});

function outcomeFor(form: FormState): string {
  const option = githubSelection.value;

  if (option === null) {
    return '';
  }

  const managerUserId = form.managerUserId?.value ?? null;

  return describeOutcome(option, {
    defaultBillableForTasks: form.defaultBillableForTasks?.value !== false,
    managerName:
      memberOptions().find((member) => member.value === managerUserId)?.label ??
      null,
    visibility: form.visibility?.value === 'public' ? 'public' : 'private',
  });
}

function handleSourceUpdate(value: 'manual' | 'github'): void {
  sourceMode.value = value;
  importError.value = null;
  isScanningBoard.value = false;
  githubSelection.value = null;
  projectForm.value?.setFieldValue('name', '');
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

async function importSelectedProject(
  values: CreateProjectFormInput,
): Promise<string | null> {
  const option = githubSelection.value;

  if (option === null) {
    return null;
  }

  const response = await adminProjectsClient.importGitHubProjects({
    githubProjects: [
      {
        defaultBillableForTasks: values.defaultBillableForTasks,
        githubProjectId: option.board.id,
        githubRepos: option.repositories,
        visibility: values.visibility,
      },
    ],
  });
  const result = response.results[0];

  if (!result || result.status === 'failed') {
    importError.value = result?.message ?? 'Import failed.';
    return null;
  }

  if (result.status === 'repository-taken') {
    importError.value =
      result.message ??
      'That repository is already tracked by another project.';
    return null;
  }

  if (result.status !== 'imported' || result.projectId === null) {
    importError.value =
      'This GitHub project has already been added. Reload the projects list to see it.';
    return null;
  }

  return result.projectId;
}

async function handleSubmit({
  valid,
  values,
}: {
  valid: boolean;
  values: Record<string, unknown>;
}): Promise<void> {
  if (!valid || !canSubmit.value) {
    return;
  }

  const token = authStore.accessToken;
  if (!token) {
    return;
  }

  const formValues = values as CreateProjectFormInput;
  const trimmedName = isGitHub.value
    ? (derivedName.value ?? '')
    : formValues.name.trim();

  isSubmitting.value = true;
  importError.value = null;

  try {
    const projectId = isGitHub.value
      ? await importSelectedProject(formValues)
      : (
          await adminProjectsClient.createProject({
            defaultBillableForTasks: formValues.defaultBillableForTasks,
            name: trimmedName,
            visibility: formValues.visibility,
          })
        ).id;

    if (projectId === null) {
      return;
    }

    if (formValues.managerUserId) {
      await adminProjectsClient.assignMember(
        projectId,
        formValues.managerUserId,
      );
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
          Add Project
        </h2>

        <Form
          ref="projectForm"
          v-slot="$form"
          :resolver="resolver"
          :initial-values="initialValues"
          @submit="handleSubmit"
        >
          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-1.5">
              <label
                for="project-source"
                class="text-text-dark text-[13px] font-medium"
              >
                Source
              </label>
              <Select
                input-id="project-source"
                data-testid="project-source"
                :options="sourceOptions"
                option-label="label"
                option-value="value"
                :disabled="isSubmitting"
                :model-value="sourceMode"
                :pt="giTiempoSelectPt"
                @update:model-value="handleSourceUpdate"
              />
              <small class="text-text-muted text-xs">
                Manual keeps the project local. Import pulls an organization
                project from GitHub.
              </small>
            </div>

            <GitHubProjectFields
              v-if="isGitHub"
              v-model="githubSelection"
              v-model:availability="githubAvailability"
              v-model:scanning="isScanningBoard"
              :disabled="isSubmitting"
            />

            <div
              v-if="isGitHub"
              class="flex flex-col gap-1.5"
            >
              <span class="text-text-dark text-[13px] font-medium">
                Project name
              </span>
              <div
                class="border-divider text-text-dark bg-app-bg flex h-[38px] items-center rounded-[6px] border px-3 text-[14px] font-medium"
                data-testid="github-import-derived-name"
              >
                {{ derivedName ?? '—' }}
              </div>
              <small class="text-text-muted text-xs">
                Derived from the organization and the project.
              </small>
            </div>

            <div
              v-else
              class="flex flex-col gap-1.5"
            >
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
                <small
                  v-else
                  class="text-text-muted text-xs"
                >
                  Optional. Assigned right after the project is created.
                </small>
              </div>

              <div class="flex w-full flex-col gap-1.5 sm:w-48">
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

            <div
              v-if="isGitHub && githubSelection"
              class="bg-app-bg flex flex-col gap-2.5 rounded-lg p-3.5"
              data-testid="github-import-details"
            >
              <span class="text-text-dark text-[13px] font-semibold">
                What will be added
              </span>
              <div class="flex flex-col gap-2">
                <div
                  v-for="row in detailRows"
                  :key="row.label"
                  class="flex items-center justify-between gap-4"
                >
                  <span class="text-text-muted text-[13px]">{{ row.label }}</span>
                  <span
                    class="text-text-dark text-right text-[13px] font-medium"
                    :data-testid="row.testid"
                  >
                    {{ row.value }}
                  </span>
                </div>
              </div>
              <p class="border-divider text-text-muted border-t pt-2.5 text-xs">
                {{ outcomeFor($form) }}
              </p>
            </div>

            <Message
              v-if="importError"
              severity="error"
              :closable="false"
            >
              {{ importError }}
            </Message>
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
              label="Add project"
              type="submit"
              data-testid="add-project-submit"
              :disabled="!canSubmit"
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
          Source is a field in the form, so both kinds of project are created
          the same way and carry the same settings.
        </p>

        <div class="bg-app-bg flex flex-col gap-2 rounded-lg p-3.5">
          <span class="text-text-dark text-sm font-semibold">
            Naming
          </span>
          <span class="text-text-muted text-[13px] font-normal">
            Imported projects are named
            <span class="text-text-dark font-medium">organization/project</span>,
            so the owner is visible in the projects list. Manual projects keep
            the name you type.
          </span>
        </div>

        <div class="bg-app-bg flex flex-col gap-2 rounded-lg p-3.5">
          <span class="text-text-dark text-sm font-semibold">
            Repository link
          </span>
          <span class="text-text-muted text-[13px] font-normal">
            A GitHub project whose issues all come from one repository is linked
            to it. That link is what makes a timer reuse this project instead of
            creating another.
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

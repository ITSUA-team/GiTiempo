<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  type CreateProjectInput,
  type GitHubOwner,
  type GitHubProject,
  type GitHubRepository,
  WorkspaceRoles,
  type WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import {
  Form,
} from '@primevue/forms';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import { createProjectFormSchema, type CreateProjectFormInput } from '@gitiempo/web-shared';
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';

import { useToasts } from '@/composables/feedback/useToasts';
import { useAdminGitHubProjectCandidates } from '@/composables/useAdminGitHubProjectCandidates';
import { routeNames } from '@/router';
import { adminMembersClient } from '@/services/admin-members-client';
import { adminProjectsClient } from '@/services/admin-projects-client';
import { useAuthStore } from '@/stores/auth';

interface ProjectFormInstance {
  /* eslint-disable no-unused-vars */
  setFieldValue(field: keyof CreateProjectFormInput, value: unknown): void;
  /* eslint-enable no-unused-vars */
}

type ProjectCreateMode = 'manual' | 'github';

const router = useRouter();
const authStore = useAuthStore();
const { successToast, errorToast } = useToasts();

const members = ref<WorkspaceMemberListResponse>([]);
const membersLoading = ref(false);
const membersError = ref<string | null>(null);
const isSubmitting = ref(false);
const projectFormRef = ref<ProjectFormInstance | null>(null);
const createMode = ref<ProjectCreateMode>('manual');

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

const projectName = ref(initialValues.name);

const {
  clearSelection: clearGitHubSelection,
  completeOwners,
  completeProjects,
  completeRepositories,
  connectedLogin,
  connectionError,
  connectionState,
  isConnected,
  loadCandidatesForSelectedOwner,
  loadConnectionStatus,
  loadOwners,
  ownerSuggestions,
  ownersError,
  ownersLoading,
  projectSuggestions,
  projects,
  projectsError,
  projectsLoading,
  providerReference: githubProviderReference,
  repositories,
  repositorySuggestions,
  repositoriesError,
  repositoriesLoading,
  selectOwner,
  selectProject,
  selectRepository,
  selectedCandidateLabel,
  selectedCandidateSource,
  selectedOwner,
  selectedProject,
  selectedRepository,
} = useAdminGitHubProjectCandidates({
  onLoadError(error, message) {
    errorToast(message, {
      error,
      logContext: { action: 'load-github-project-candidates', feature: 'projects' },
    });
  },
});

const isGitHubMode = computed(() => createMode.value === 'github');
const createButtonLabel = computed(() =>
  isGitHubMode.value ? 'Create GitHub project' : 'Create project',
);
const isCreateDisabled = computed(
  () => isSubmitting.value || (isGitHubMode.value && !githubProviderReference.value),
);

const githubAutoCompletePt = {
  root: { class: 'w-full' },
  pcInputText: {
    root: {
      class:
        'border-divider bg-surface-primary h-[34px] rounded-l-[6px] rounded-r-none border px-3 text-[14px] font-medium text-text-dark shadow-none',
    },
  },
  dropdown: { class: 'w-8 text-text-muted' },
  option: { class: 'font-sans text-[14px]' },
} as const;

function memberOptions() {
  return members.value
    .filter((member) => member.role === WorkspaceRoles.PM)
    .map((member) => ({
      label: member.displayName ?? member.email,
      value: member.userId,
    }));
}

function setProjectName(value: string): void {
  projectName.value = value;
  projectFormRef.value?.setFieldValue('name', value);
}

function handleProjectNameUpdate(value: string | undefined): void {
  setProjectName(value ?? '');
}

function getOwnerLabel(owner: GitHubOwner): string {
  const suffix = owner.type === 'organization' ? 'organization' : 'personal';

  return `${owner.label} (${suffix})`;
}

function getRepositoryLabel(repository: GitHubRepository): string {
  return repository.fullName;
}

function getProjectLabel(project: GitHubProject): string {
  return `${project.title} #${project.number}`;
}

function handleOwnerUpdate(value: GitHubOwner | string | null): void {
  void selectOwner(value);
}

function handleRepositoryUpdate(value: GitHubRepository | string | null): void {
  const candidateName = selectRepository(value);

  if (candidateName) setProjectName(candidateName);
}

function handleProjectUpdate(value: GitHubProject | string | null): void {
  const candidateName = selectProject(value);

  if (candidateName) setProjectName(candidateName);
}

function selectCreateMode(mode: ProjectCreateMode): void {
  if (createMode.value === mode) return;

  createMode.value = mode;
  if (mode === 'manual') {
    clearGitHubSelection();
    setProjectName('');
    return;
  }

  setProjectName(selectedCandidateLabel.value ?? '');
  if (connectionState.value === 'idle' || connectionState.value === 'error') {
    loadGitHubConnection();
  }
}

function clearGitHubSourceSelection(): void {
  clearGitHubSelection();
  setProjectName('');
}

function loadGitHubConnection(): void {
  if (!authStore.accessToken) return;

  void loadConnectionStatus();
}

function retryGitHubOwners(): void {
  void loadOwners(connectedLogin.value);
}

function retryGitHubCandidates(): void {
  void loadCandidatesForSelectedOwner();
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

  if (isGitHubMode.value && !githubProviderReference.value) {
    errorToast('Select a GitHub repository or Project V2 before creating.', {
      logContext: { action: 'create-project', feature: 'projects' },
    });
    return;
  }

  isSubmitting.value = true;

  try {
    const rawName = isGitHubMode.value
      ? selectedCandidateLabel.value ?? projectName.value
      : name || projectName.value;
    const trimmedName = rawName.trim();
    if (!trimmedName) {
      throw new Error('Project name is required');
    }
    const createInput: CreateProjectInput = {
      defaultBillableForTasks,
      name: trimmedName,
      visibility,
    };

    if (isGitHubMode.value && githubProviderReference.value) {
      createInput.providerReference = githubProviderReference.value;
    }

    const project = await adminProjectsClient.createProject(createInput);

    if (!isGitHubMode.value && managerUserId) {
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

onMounted(() => {
  void loadMembers();
});
</script>

<template>
  <div class="flex min-w-0 flex-col gap-5">
    <div>
      <Button
        label="← Back to projects"
        variant="text"
        class="!p-0 text-[13px] font-semibold"
        @click="handleBack"
      />
    </div>

    <div class="flex flex-col gap-1.5">
      <h1 class="text-text-dark text-[28px] leading-tight font-semibold">
        Add Project
      </h1>
      <p class="text-text-muted text-sm font-normal">
        Choose a manual project or create from a connected GitHub repository or
        Project V2 source.
      </p>
    </div>

    <div class="flex min-w-0 flex-col gap-5 md:flex-row">
      <div class="bg-surface-primary flex min-w-0 flex-1 flex-col gap-3 rounded-lg p-4">
        <h2 class="text-text-dark text-lg font-semibold">
          {{ isGitHubMode ? 'Add GitHub Project' : 'Add Project Manually' }}
        </h2>

        <div
          v-if="isGitHubMode"
          data-testid="github-project-candidate-controls"
          class="border-divider bg-app-bg flex flex-col gap-3 rounded-lg border p-3.5"
        >
          <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex flex-col gap-1">
              <h3 class="text-text-dark text-base font-semibold">
                GitHub project source
              </h3>
              <p class="text-text-muted text-[13px] font-normal">
                Browse connected repositories or Projects V2 sources.
              </p>
            </div>
            <Button
              v-if="connectionState === 'error'"
              data-testid="github-connection-retry"
              label="Retry GitHub"
              severity="secondary"
              variant="outlined"
              size="small"
              :disabled="isSubmitting"
              @click="loadGitHubConnection"
            />
          </div>

          <div
            v-if="connectionState === 'loading'"
            class="text-text-muted text-[13px]"
          >
            Checking GitHub connection...
          </div>

          <Message
            v-else-if="connectionState === 'error'"
            severity="error"
            size="small"
            variant="simple"
          >
            {{ connectionError }} Switch to Manual project if you want to create
            without GitHub.
          </Message>

          <div
            v-else-if="connectionState === 'disconnected'"
            data-testid="github-disconnected-state"
            class="text-text-muted text-[13px]"
          >
            Connect GitHub from your profile to browse provider-backed candidates.
            Switch to Manual project if you want to create without GitHub.
          </div>

          <div
            v-else-if="isConnected"
            class="flex flex-col gap-3"
          >
            <div class="flex flex-col gap-1.5">
              <label
                for="github-owner"
                class="text-text-dark text-[13px] font-medium"
              >
                GitHub owner
              </label>
              <AutoComplete
                input-id="github-owner"
                :model-value="selectedOwner"
                :suggestions="ownerSuggestions"
                :option-label="getOwnerLabel"
                complete-on-focus
                dropdown
                dropdown-mode="blank"
                force-selection
                :min-length="0"
                show-clear
                placeholder="Select owner"
                :loading="ownersLoading"
                :disabled="isSubmitting || ownersLoading"
                :pt="githubAutoCompletePt"
                @complete="completeOwners"
                @update:model-value="handleOwnerUpdate"
              />
              <small
                v-if="ownersError"
                class="text-status-error-text text-xs"
              >
                {{ ownersError }}
              </small>
            </div>

            <Button
              v-if="ownersError"
              label="Retry owners"
              severity="secondary"
              variant="outlined"
              size="small"
              class="self-start"
              :disabled="isSubmitting || ownersLoading"
              @click="retryGitHubOwners"
            />

            <div
              v-if="selectedOwner"
              class="grid gap-3 lg:grid-cols-2"
            >
              <div class="flex flex-col gap-1.5">
                <label
                  for="github-repository"
                  class="text-text-dark text-[13px] font-medium"
                >
                  Repository candidate
                </label>
                <AutoComplete
                  input-id="github-repository"
                  :model-value="selectedRepository"
                  :suggestions="repositorySuggestions"
                  :option-label="getRepositoryLabel"
                  complete-on-focus
                  dropdown
                  dropdown-mode="blank"
                  force-selection
                  :min-length="0"
                  show-clear
                  placeholder="Search repositories"
                  :loading="repositoriesLoading"
                  :disabled="isSubmitting || repositoriesLoading || !!repositoriesError"
                  :pt="githubAutoCompletePt"
                  @complete="completeRepositories"
                  @update:model-value="handleRepositoryUpdate"
                />
                <small
                  v-if="repositoriesError"
                  class="text-status-error-text text-xs"
                >
                  {{ repositoriesError }}
                </small>
                <small
                  v-else-if="!repositoriesLoading && repositories.length === 0"
                  class="text-text-muted text-xs"
                >
                  No repositories are available for this owner.
                </small>
              </div>

              <div class="flex flex-col gap-1.5">
                <label
                  for="github-project-v2"
                  class="text-text-dark text-[13px] font-medium"
                >
                  Project V2 candidate
                </label>
                <AutoComplete
                  input-id="github-project-v2"
                  :model-value="selectedProject"
                  :suggestions="projectSuggestions"
                  :option-label="getProjectLabel"
                  complete-on-focus
                  dropdown
                  dropdown-mode="blank"
                  force-selection
                  :min-length="0"
                  show-clear
                  placeholder="Search Projects V2"
                  :loading="projectsLoading"
                  :disabled="isSubmitting || projectsLoading || !!projectsError"
                  :pt="githubAutoCompletePt"
                  @complete="completeProjects"
                  @update:model-value="handleProjectUpdate"
                />
                <small
                  v-if="projectsError"
                  class="text-status-error-text text-xs"
                >
                  {{ projectsError }}
                </small>
                <small
                  v-else-if="!projectsLoading && projects.length === 0"
                  class="text-text-muted text-xs"
                >
                  No Projects V2 are available for this owner.
                </small>
              </div>
            </div>

            <div
              v-if="repositoriesError || projectsError"
              class="flex justify-start"
            >
              <Button
                data-testid="github-candidates-retry"
                label="Retry candidates"
                severity="secondary"
                variant="outlined"
                size="small"
                :disabled="isSubmitting || repositoriesLoading || projectsLoading"
                @click="retryGitHubCandidates"
              />
            </div>

            <div
              v-if="selectedCandidateLabel"
              data-testid="github-selected-source"
              class="border-brand bg-accent-tint flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span class="text-text-dark text-[13px] font-medium">
                Selected {{ selectedCandidateSource }}: {{ selectedCandidateLabel }}
              </span>
              <Button
                label="Clear selection"
                severity="secondary"
                variant="outlined"
                size="small"
                :disabled="isSubmitting"
                @click="clearGitHubSourceSelection"
              />
            </div>
          </div>
        </div>

        <Form
          ref="projectFormRef"
          v-slot="$form"
          :resolver="resolver"
          :initial-values="initialValues"
          @submit="handleSubmit"
        >
          <div
            v-if="!isGitHubMode"
            class="flex flex-col gap-2.5"
          >
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
                :model-value="projectName"
                :invalid="$form.name?.invalid"
                :disabled="isSubmitting"
                class="h-[34px] w-full rounded-[6px] px-3 text-[14px] font-medium"
                placeholder="Customer Portal"
                @update:model-value="handleProjectNameUpdate"
              />
              <small
                v-if="$form.name?.invalid"
                class="text-status-error-text text-xs"
              >
                {{ $form.name.error?.message }}
              </small>
            </div>

            <div class="flex flex-col gap-1.5">
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
                :pt="{
                  root: { class: 'h-[34px] w-full rounded-[6px] text-[14px]' },
                  label: { class: 'flex items-center py-0 text-[14px] font-medium' },
                }"
              />
              <small
                v-if="membersError"
                class="text-status-error-text text-xs"
              >
                {{ membersError }}
              </small>
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
                :pt="{
                  root: { class: 'h-[34px] w-full rounded-[6px] text-[14px]' },
                  label: { class: 'flex items-center py-0 text-[14px] font-medium' },
                }"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <span class="text-text-dark text-[13px] font-medium">
                Default billable for new tasks
              </span>
              <label
                for="default-billable-for-tasks"
                class="border-divider bg-surface-primary flex h-[34px] cursor-pointer items-center gap-2.5 rounded-[6px] border px-3"
              >
                <Checkbox
                  input-id="default-billable-for-tasks"
                  name="defaultBillableForTasks"
                  binary
                  :disabled="isSubmitting"
                />
                <span class="text-text-dark text-[14px] font-medium">
                  Billable by default
                </span>
              </label>
              <small class="text-text-muted text-xs">
                New tasks in this project inherit this value unless changed later.
              </small>
            </div>
          </div>

          <div class="mt-3 flex items-center justify-end gap-2.5">
            <Button
              label="Back"
              severity="secondary"
              outlined
              type="button"
              :disabled="isSubmitting"
              @click="handleBack"
            />
            <Button
              :label="createButtonLabel"
              type="submit"
              :disabled="isCreateDisabled"
              :loading="isSubmitting"
            />
          </div>
        </Form>
      </div>

      <div class="shadow-card bg-surface-primary flex w-full flex-col gap-3.5 rounded-lg p-5 md:w-80 md:shrink-0">
        <h2 class="text-text-dark text-lg font-semibold">
          Creation Type
        </h2>
        <p class="text-text-muted text-[13px] font-normal">
          Manual and GitHub projects are separate creation paths. Switch modes
          before filling fields.
        </p>

        <button
          type="button"
          data-testid="select-manual-project-source"
          :aria-pressed="!isGitHubMode"
          :disabled="isSubmitting"
          class="flex cursor-pointer flex-col gap-2 rounded-lg border p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60"
          :class="!isGitHubMode ? 'border-brand bg-accent-tint' : 'border-divider bg-app-bg'"
          @click="selectCreateMode('manual')"
        >
          <span class="text-text-dark text-sm font-semibold">
            Manual project
          </span>
          <span class="text-text-muted text-[13px] font-normal">
            Use this when a project is internal, still being prepared, or not
            available through a workspace import yet.
          </span>
        </button>

        <button
          type="button"
          data-testid="select-github-project-source"
          :aria-pressed="isGitHubMode"
          :disabled="isSubmitting"
          class="flex cursor-pointer flex-col gap-2 rounded-lg border p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60"
          :class="isGitHubMode ? 'border-brand bg-accent-tint' : 'border-divider bg-app-bg'"
          @click="selectCreateMode('github')"
        >
          <span class="text-text-dark text-sm font-semibold">
            GitHub project source
          </span>
          <span class="text-text-muted text-[13px] font-normal">
            <template v-if="isGitHubMode && selectedCandidateLabel">
              Pending source: {{ selectedCandidateSource }} {{ selectedCandidateLabel }}.
            </template>
            <template v-else>
              Select a repository or Project V2 project to preserve its external context.
            </template>
          </span>
        </button>

        <p class="text-text-muted text-xs font-normal">
          GitHub mode shows only GitHub source fields here. PM, visibility, and
          defaults can be adjusted after creation.
        </p>
      </div>
    </div>
  </div>
</template>

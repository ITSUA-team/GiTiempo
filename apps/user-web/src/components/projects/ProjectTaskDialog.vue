<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import type {
  GitHubIssue,
  GitHubIssueCreateReference,
  GitHubOwner,
  GitHubProject,
  GitHubProjectIssueItem,
  GitHubRepository,
  ProjectResponse,
  TaskStatus,
} from "@gitiempo/shared";
import { filterAutocompleteOptions, InlineRequestMessage } from "@gitiempo/web-shared";
import { computed, shallowRef, watch } from "vue";

import {
  createDefaultGitHubBrowsingClient,
  createDefaultProfileGitHubClient,
} from "@/config/clients";

const props = defineProps<{
  errors: {
    projectId: string | null;
    status: string | null;
    title: string | null;
  };
  defaultBillableForTimeEntries: boolean;
  isDeleting: boolean;
  isOpen: boolean;
  isSaving: boolean;
  mode: "create" | "edit" | null;
  projectId: string | null;
  projects: ProjectResponse[];
  requestErrorMessage: string | null;
  saveLabel: string;
  status: TaskStatus;
  subtitle: string;
  title: string;
  valueTitle: string;
}>();

const emit = defineEmits<{
  close: [];
  deleteTask: [];
  githubLoadError: [message: string, error: unknown];
  save: [];
  "update:defaultBillableForTimeEntries": [value: boolean];
  "update:providerReference": [value: GitHubIssueCreateReference | null];
  "update:projectId": [value: string | null];
  "update:status": [value: TaskStatus];
  "update:title": [value: string];
}>();

type GitHubConnectionState =
  | "idle"
  | "loading"
  | "connected"
  | "disconnected"
  | "error";

type AutoCompleteValue<T> = T | string | null | undefined;

interface GitHubIssueCandidate {
  issue: GitHubIssue;
  label: string;
  projectId: string | null;
  projectItemId: string | null;
  sourceType: "repository_issue" | "project_v2_issue_item";
}

const profileGitHubClient = createDefaultProfileGitHubClient();
const githubBrowsingClient = createDefaultGitHubBrowsingClient();

const statusOptions = [
  { label: "Open", value: "open" },
  { label: "Closed", value: "closed" },
] satisfies { label: string; value: TaskStatus }[];

const selectedProjectName = computed(() => {
  return props.projects.find((project) => project.id === props.projectId)?.name ?? "";
});
const selectedProject = computed(() =>
  props.projects.find((project) => project.id === props.projectId) ?? null,
);
const selectedProjectCanHintGitHubScope = computed(
  () => props.mode === "create" && selectedProject.value?.source === "github",
);
const projectSearchValue = shallowRef<string | null>(null);
const projectSearchQuery = shallowRef("");
const projectSuggestions = computed(() => {
  return filterAutocompleteOptions(
    props.projects,
    projectSearchQuery.value,
    (project) => project.name,
  );
});

const projectModel = computed({
  get: () => projectSearchValue.value ?? selectedProject.value,
  set: (value: ProjectResponse | string | null | undefined) => {
    if (typeof value === "string") {
      projectSearchValue.value = value;
      projectSearchQuery.value = value;
      return;
    }

    projectSearchValue.value = null;
    projectSearchQuery.value = "";
    emit("update:projectId", value?.id ?? null);
  },
});

const statusModel = computed({
  get: () => props.status,
  set: (value: TaskStatus | null | undefined) => {
    emit("update:status", value ?? "open");
  },
});

const titleModel = computed({
  get: () => props.valueTitle,
  set: (value: string) => {
    if (props.mode === "create" && selectedGitHubIssue.value) {
      clearGitHubIssueSelection();
    }

    emit("update:title", value);
  },
});

const defaultBillableModel = computed({
  get: () => props.defaultBillableForTimeEntries,
  set: (value: boolean) => {
    emit("update:defaultBillableForTimeEntries", value);
  },
});

const isDialogMutating = computed(() => props.isSaving || props.isDeleting);
const githubConnectionState = shallowRef<GitHubConnectionState>("idle");
const githubConnectionError = shallowRef<string | null>(null);
const githubOwners = shallowRef<GitHubOwner[]>([]);
const githubOwnerSuggestions = shallowRef<GitHubOwner[]>([]);
const selectedGitHubOwner = shallowRef<GitHubOwner | null>(null);
const githubOwnersLoading = shallowRef(false);
const githubOwnersError = shallowRef<string | null>(null);
const githubRepositories = shallowRef<GitHubRepository[]>([]);
const githubRepositorySuggestions = shallowRef<GitHubRepository[]>([]);
const selectedGitHubRepository = shallowRef<GitHubRepository | null>(null);
const githubRepositoriesLoading = shallowRef(false);
const githubRepositoriesError = shallowRef<string | null>(null);
const githubProjects = shallowRef<GitHubProject[]>([]);
const githubProjectSuggestions = shallowRef<GitHubProject[]>([]);
const selectedGitHubProject = shallowRef<GitHubProject | null>(null);
const githubProjectsLoading = shallowRef(false);
const githubProjectsError = shallowRef<string | null>(null);
const githubIssueCandidates = shallowRef<GitHubIssueCandidate[]>([]);
const githubIssueSuggestions = shallowRef<GitHubIssueCandidate[]>([]);
const selectedGitHubIssue = shallowRef<GitHubIssueCandidate | null>(null);
const githubIssuesLoading = shallowRef(false);
const githubIssuesError = shallowRef<string | null>(null);
const selectedGitHubIssueSource = computed(() => {
  if (!selectedGitHubIssue.value) return "Manual";

  return selectedGitHubIssue.value.sourceType === "project_v2_issue_item"
    ? "GitHub Project V2 issue"
    : "GitHub repository issue";
});
let githubConnectionRequestId = 0;
let githubOwnersRequestId = 0;
let githubScopesRequestId = 0;
let githubIssuesRequestId = 0;

const hasGitHubIssueScope = computed(
  () => selectedGitHubRepository.value !== null || selectedGitHubProject.value !== null,
);

watch(
  [() => props.isOpen, () => props.mode, () => props.projectId],
  () => {
    projectSearchValue.value = null;
    projectSearchQuery.value = "";
  },
);

watch(
  [() => props.isOpen, () => props.mode],
  ([isOpen, mode]) => {
    resetGitHubTaskCandidates();

    if (isOpen && mode === "create") {
      void loadGitHubConnectionStatus();
    }
  },
  { immediate: true },
);

watch(
  () => props.projectId,
  () => {
    if (props.mode === "create") clearGitHubIssueSelection();
  },
);

function handleProjectComplete(event: { query: string }): void {
  projectSearchQuery.value = event.query;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function emitGitHubLoadError(error: unknown, fallback: string): string {
  const message = getErrorMessage(error, fallback);

  emit("githubLoadError", message, error);

  return message;
}

function getGitHubOwnerLabel(owner: GitHubOwner): string {
  const suffix = owner.type === "organization" ? "organization" : "personal";

  return `${owner.label} (${suffix})`;
}

function getGitHubRepositoryLabel(repository: GitHubRepository): string {
  return repository.fullName;
}

function getGitHubProjectLabel(project: GitHubProject): string {
  return `${project.title} #${project.number}`;
}

function getGitHubIssueLabel(candidate: GitHubIssueCandidate): string {
  return candidate.label;
}

function getOwnerScopedQuery(owner: GitHubOwner) {
  return owner.type === "organization"
    ? { ownerType: "organization" as const, owner: owner.login, limit: 100 }
    : { ownerType: "personal" as const, limit: 100 };
}

function isGitHubOwner(value: AutoCompleteValue<GitHubOwner>): value is GitHubOwner {
  return typeof value === "object" && value !== null && "login" in value;
}

function isGitHubRepository(
  value: AutoCompleteValue<GitHubRepository>,
): value is GitHubRepository {
  return typeof value === "object" && value !== null && "fullName" in value;
}

function isGitHubProject(
  value: AutoCompleteValue<GitHubProject>,
): value is GitHubProject {
  return typeof value === "object" && value !== null && "title" in value;
}

function isGitHubIssueCandidate(
  value: AutoCompleteValue<GitHubIssueCandidate>,
): value is GitHubIssueCandidate {
  return typeof value === "object" && value !== null && "issue" in value;
}

function clearGitHubIssueSelection(): void {
  selectedGitHubIssue.value = null;
  emit("update:providerReference", null);
}

function clearGitHubIssues(): void {
  githubIssuesRequestId += 1;
  githubIssueCandidates.value = [];
  githubIssueSuggestions.value = [];
  githubIssuesLoading.value = false;
  githubIssuesError.value = null;
  clearGitHubIssueSelection();
}

function clearGitHubScopes(): void {
  githubScopesRequestId += 1;
  githubRepositories.value = [];
  githubRepositorySuggestions.value = [];
  selectedGitHubRepository.value = null;
  githubRepositoriesLoading.value = false;
  githubRepositoriesError.value = null;
  githubProjects.value = [];
  githubProjectSuggestions.value = [];
  selectedGitHubProject.value = null;
  githubProjectsLoading.value = false;
  githubProjectsError.value = null;
  clearGitHubIssues();
}

function resetGitHubTaskCandidates(): void {
  githubConnectionRequestId += 1;
  githubOwnersRequestId += 1;
  githubConnectionState.value = "idle";
  githubConnectionError.value = null;
  githubOwners.value = [];
  githubOwnerSuggestions.value = [];
  selectedGitHubOwner.value = null;
  githubOwnersLoading.value = false;
  githubOwnersError.value = null;
  clearGitHubScopes();
}

function createRepositoryIssueCandidate(issue: GitHubIssue): GitHubIssueCandidate {
  return {
    issue,
    label: `#${issue.number} ${issue.title}`,
    projectId: null,
    projectItemId: null,
    sourceType: "repository_issue",
  };
}

function createProjectIssueCandidate(
  item: GitHubProjectIssueItem,
  projectId: string,
): GitHubIssueCandidate {
  return {
    issue: item.issue,
    label: `#${item.issue.number} ${item.issue.title}`,
    projectId,
    projectItemId: item.projectItemId,
    sourceType: "project_v2_issue_item",
  };
}

function createIssueProviderReference(
  candidate: GitHubIssueCandidate,
): GitHubIssueCreateReference {
  const base = {
    provider: "github" as const,
    externalType: "issue" as const,
    externalId: candidate.issue.id,
    externalKey: `${candidate.issue.repository.fullName}#${candidate.issue.number}`,
    externalUrl: candidate.issue.url,
    metadata: {
      nodeId: candidate.issue.nodeId,
      number: candidate.issue.number,
      projectId: candidate.projectId,
      repository: candidate.issue.repository.fullName,
      state: candidate.issue.state,
      title: candidate.issue.title,
      updatedAt: candidate.issue.updatedAt,
    },
  };

  if (candidate.sourceType === "project_v2_issue_item") {
    return {
      ...base,
      sourceType: "project_v2_issue_item",
      projectItemId: candidate.projectItemId ?? "",
    };
  }

  return {
    ...base,
    sourceType: "repository_issue",
  };
}

async function loadGitHubRepositories(
  owner: GitHubOwner,
  requestId: number,
): Promise<void> {
  if (requestId !== githubScopesRequestId) return;

  githubRepositoriesLoading.value = true;
  githubRepositoriesError.value = null;

  try {
    const response = await githubBrowsingClient.listRepositories(
      getOwnerScopedQuery(owner),
    );
    if (requestId !== githubScopesRequestId) return;

    githubRepositories.value = response.items;
    githubRepositorySuggestions.value = response.items;
  } catch (error) {
    if (requestId !== githubScopesRequestId) return;

    githubRepositories.value = [];
    githubRepositorySuggestions.value = [];
    githubRepositoriesError.value = emitGitHubLoadError(
      error,
      "Failed to load GitHub repositories",
    );
  } finally {
    if (requestId === githubScopesRequestId) {
      githubRepositoriesLoading.value = false;
    }
  }
}

async function loadGitHubProjects(
  owner: GitHubOwner,
  requestId: number,
): Promise<void> {
  if (requestId !== githubScopesRequestId) return;

  githubProjectsLoading.value = true;
  githubProjectsError.value = null;

  try {
    const response = await githubBrowsingClient.listProjects(
      getOwnerScopedQuery(owner),
    );
    if (requestId !== githubScopesRequestId) return;

    githubProjects.value = response.items;
    githubProjectSuggestions.value = response.items;
  } catch (error) {
    if (requestId !== githubScopesRequestId) return;

    githubProjects.value = [];
    githubProjectSuggestions.value = [];
    githubProjectsError.value = emitGitHubLoadError(
      error,
      "Failed to load GitHub Projects",
    );
  } finally {
    if (requestId === githubScopesRequestId) {
      githubProjectsLoading.value = false;
    }
  }
}

async function loadGitHubScopes(): Promise<void> {
  clearGitHubScopes();

  const owner = selectedGitHubOwner.value;
  if (!owner) return;

  const requestId = ++githubScopesRequestId;

  await Promise.all([
    loadGitHubRepositories(owner, requestId),
    loadGitHubProjects(owner, requestId),
  ]);
}

async function loadGitHubOwners(preferredLogin?: string | null): Promise<void> {
  const requestId = ++githubOwnersRequestId;

  githubOwnersLoading.value = true;
  githubOwnersError.value = null;

  try {
    const response = await githubBrowsingClient.listOwners({ type: "all" });
    if (requestId !== githubOwnersRequestId) return;

    githubOwners.value = response.items;
    githubOwnerSuggestions.value = response.items;
    selectedGitHubOwner.value =
      response.items.find((owner) => owner.login === preferredLogin) ??
      response.items[0] ??
      null;
    await loadGitHubScopes();
  } catch (error) {
    if (requestId !== githubOwnersRequestId) return;

    githubOwners.value = [];
    githubOwnerSuggestions.value = [];
    selectedGitHubOwner.value = null;
    clearGitHubScopes();
    githubOwnersError.value = emitGitHubLoadError(
      error,
      "Failed to load GitHub owners",
    );
  } finally {
    if (requestId === githubOwnersRequestId) {
      githubOwnersLoading.value = false;
    }
  }
}

async function loadGitHubConnectionStatus(): Promise<void> {
  const requestId = ++githubConnectionRequestId;

  githubOwnersRequestId += 1;
  githubConnectionState.value = "loading";
  githubConnectionError.value = null;
  githubOwnersLoading.value = false;
  clearGitHubScopes();

  try {
    const response = await profileGitHubClient.getConnectionStatus();
    if (requestId !== githubConnectionRequestId) return;

    if (response.status === "disconnected") {
      githubConnectionState.value = "disconnected";
      return;
    }

    githubConnectionState.value = "connected";
    await loadGitHubOwners(response.account.login);
  } catch (error) {
    if (requestId !== githubConnectionRequestId) return;

    githubConnectionState.value = "error";
    githubConnectionError.value = emitGitHubLoadError(
      error,
      "Failed to load GitHub connection status",
    );
  }
}

async function loadRepositoryIssues(): Promise<void> {
  const repository = selectedGitHubRepository.value;

  if (!repository) return;

  const requestId = ++githubIssuesRequestId;

  githubIssuesLoading.value = true;
  githubIssuesError.value = null;

  try {
    const response = await githubBrowsingClient.listRepositoryIssues(
      repository.owner,
      repository.name,
      { limit: 100, state: "all" },
    );
    if (requestId !== githubIssuesRequestId) return;

    githubIssueCandidates.value = response.items.map(createRepositoryIssueCandidate);
    githubIssueSuggestions.value = githubIssueCandidates.value;
  } catch (error) {
    if (requestId !== githubIssuesRequestId) return;

    githubIssueCandidates.value = [];
    githubIssueSuggestions.value = [];
    githubIssuesError.value = emitGitHubLoadError(
      error,
      "Failed to load GitHub issues",
    );
  } finally {
    if (requestId === githubIssuesRequestId) {
      githubIssuesLoading.value = false;
    }
  }
}

async function loadProjectIssues(): Promise<void> {
  const project = selectedGitHubProject.value;

  if (!project) return;

  const requestId = ++githubIssuesRequestId;

  githubIssuesLoading.value = true;
  githubIssuesError.value = null;

  try {
    const response = await githubBrowsingClient.listProjectIssues(project.id, {
      limit: 100,
      state: "all",
    });
    if (requestId !== githubIssuesRequestId) return;

    githubIssueCandidates.value = response.items.map((item) =>
      createProjectIssueCandidate(item, project.id),
    );
    githubIssueSuggestions.value = githubIssueCandidates.value;
  } catch (error) {
    if (requestId !== githubIssuesRequestId) return;

    githubIssueCandidates.value = [];
    githubIssueSuggestions.value = [];
    githubIssuesError.value = emitGitHubLoadError(
      error,
      "Failed to load GitHub project issues",
    );
  } finally {
    if (requestId === githubIssuesRequestId) {
      githubIssuesLoading.value = false;
    }
  }
}

function handleGitHubOwnerComplete(event: { query: string }): void {
  githubOwnerSuggestions.value = filterAutocompleteOptions(
    githubOwners.value,
    event.query,
    (owner) => `${owner.label} ${owner.login} ${owner.type}`,
  );
}

function handleGitHubRepositoryComplete(event: { query: string }): void {
  githubRepositorySuggestions.value = filterAutocompleteOptions(
    githubRepositories.value,
    event.query,
    (repository) => `${repository.fullName} ${repository.description ?? ""}`,
  );
}

function handleGitHubProjectComplete(event: { query: string }): void {
  githubProjectSuggestions.value = filterAutocompleteOptions(
    githubProjects.value,
    event.query,
    (project) => `${project.title} ${project.owner} ${project.description ?? ""}`,
  );
}

function handleGitHubIssueComplete(event: { query: string }): void {
  githubIssueSuggestions.value = filterAutocompleteOptions(
    githubIssueCandidates.value,
    event.query,
    (candidate) => `${candidate.issue.title} ${candidate.issue.number}`,
  );
}

function handleGitHubOwnerUpdate(value: AutoCompleteValue<GitHubOwner>): void {
  if (!isGitHubOwner(value)) {
    selectedGitHubOwner.value = null;
    clearGitHubScopes();
    return;
  }

  selectedGitHubOwner.value = value;
  void loadGitHubScopes();
}

function handleGitHubRepositoryUpdate(
  value: AutoCompleteValue<GitHubRepository>,
): void {
  if (!isGitHubRepository(value)) {
    selectedGitHubRepository.value = null;
    clearGitHubIssues();
    return;
  }

  selectedGitHubRepository.value = value;
  selectedGitHubProject.value = null;
  clearGitHubIssueSelection();
  void loadRepositoryIssues();
}

function handleGitHubProjectUpdate(value: AutoCompleteValue<GitHubProject>): void {
  if (!isGitHubProject(value)) {
    selectedGitHubProject.value = null;
    clearGitHubIssues();
    return;
  }

  selectedGitHubProject.value = value;
  selectedGitHubRepository.value = null;
  clearGitHubIssueSelection();
  void loadProjectIssues();
}

function handleGitHubIssueUpdate(
  value: AutoCompleteValue<GitHubIssueCandidate>,
): void {
  if (!isGitHubIssueCandidate(value)) {
    clearGitHubIssueSelection();
    return;
  }

  selectedGitHubIssue.value = value;
  emit("update:title", value.issue.title);
  emit("update:providerReference", createIssueProviderReference(value));
}
</script>

<template>
  <Dialog
    :closable="!isDialogMutating"
    modal
    :dismissable-mask="!isDialogMutating"
    :draggable="false"
    :pt="{
      root: 'w-[min(480px,calc(100vw-2rem))] rounded-lg border border-divider',
      header: 'px-6 pt-6 pb-0',
      content: 'px-6 pb-6 pt-4',
      footer: 'px-6 pb-6 pt-0',
    }"
    :visible="props.isOpen"
    @update:visible="(nextVisible) => {
      if (!nextVisible && !isDialogMutating) {
        emit('close');
      }
    }"
  >
    <template #header>
      <div class="flex flex-col gap-1">
        <h2 class="text-text-dark text-lg font-semibold">
          {{ props.title }}
        </h2>
        <p class="text-text-muted text-[13px]">
          {{ props.subtitle }}
        </p>
      </div>
    </template>

    <div class="flex flex-col gap-4">
      <InlineRequestMessage
        v-if="props.requestErrorMessage"
        :message="props.requestErrorMessage"
        :title="props.mode === 'edit' ? 'Could not update this task.' : 'Could not create this task.'"
      />

      <div class="flex flex-col gap-1">
        <label
          id="project-task-project-label"
          :for="props.mode === 'edit' ? undefined : 'project-task-project'"
          class="text-text-dark text-[13px] font-medium"
        >
          Project
        </label>
        <div
          v-if="props.mode === 'edit'"
          aria-labelledby="project-task-project-label"
          class="border-divider bg-surface-primary text-text-dark flex h-[38px] items-center rounded-md border px-3 text-sm"
          role="textbox"
          aria-readonly="true"
        >
          {{ selectedProjectName }}
        </div>
        <AutoComplete
          v-else
          v-model="projectModel"
          complete-on-focus
          data-key="id"
          dropdown
          dropdown-mode="blank"
          fluid
          force-selection
          input-id="project-task-project"
          :min-length="0"
          option-label="name"
          placeholder="Select project"
          :disabled="isDialogMutating"
          :invalid="!!props.errors.projectId"
          :suggestions="projectSuggestions"
          @complete="handleProjectComplete"
        />
        <small
          v-if="props.errors.projectId"
          class="text-destructive text-xs"
        >
          {{ props.errors.projectId }}
        </small>
      </div>

      <div
        v-if="props.mode === 'create'"
        data-testid="github-task-candidate-controls"
        class="border-divider bg-app-bg flex flex-col gap-3 rounded-lg border p-3.5"
      >
        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex flex-col gap-1">
            <h3 class="text-text-dark text-base font-semibold">
              GitHub issue source
            </h3>
            <p class="text-text-muted text-[13px]">
              Choose an issue from a connected repository or Project V2 scope, or keep manual entry.
            </p>
          </div>
          <Button
            v-if="githubConnectionState === 'error'"
            data-testid="github-task-connection-retry"
            label="Retry GitHub"
            severity="secondary"
            variant="outlined"
            size="small"
            :disabled="isDialogMutating"
            @click="void loadGitHubConnectionStatus()"
          />
        </div>

        <div
          v-if="githubConnectionState === 'loading'"
          class="text-text-muted text-[13px]"
        >
          Checking GitHub connection...
        </div>

        <InlineRequestMessage
          v-else-if="githubConnectionState === 'error'"
          :message="`${githubConnectionError ?? 'GitHub is unavailable.'} Manual task creation is still available.`"
          title="Could not load GitHub candidates."
        />

        <div
          v-else-if="githubConnectionState === 'disconnected'"
          data-testid="github-task-disconnected-state"
          class="text-text-muted text-[13px]"
        >
          Connect GitHub from your profile to browse issue candidates. You can still create a manual task now.
        </div>

        <div
          v-else-if="githubConnectionState === 'connected'"
          class="flex flex-col gap-3"
        >
          <div
            v-if="selectedProjectCanHintGitHubScope"
            class="border-divider bg-surface-primary text-text-muted rounded-md border px-3 py-2 text-xs"
          >
            This project is GitHub-backed. Select the matching GitHub scope below to browse issue candidates.
          </div>

          <div class="flex flex-col gap-1.5">
            <label
              for="project-task-github-owner"
              class="text-text-dark text-[13px] font-medium"
            >
              GitHub owner
            </label>
            <AutoComplete
              input-id="project-task-github-owner"
              :model-value="selectedGitHubOwner"
              :suggestions="githubOwnerSuggestions"
              :option-label="getGitHubOwnerLabel"
              complete-on-focus
              dropdown
              dropdown-mode="blank"
              force-selection
              :min-length="0"
              placeholder="Select owner"
              :disabled="isDialogMutating || githubOwnersLoading"
              :loading="githubOwnersLoading"
              show-clear
              @complete="handleGitHubOwnerComplete"
              @update:model-value="handleGitHubOwnerUpdate"
            />
            <small
              v-if="githubOwnersError"
              class="text-destructive text-xs"
            >
              {{ githubOwnersError }}
            </small>
          </div>

          <Button
            v-if="githubOwnersError"
            label="Retry owners"
            severity="secondary"
            variant="outlined"
            size="small"
            class="self-start"
            :disabled="isDialogMutating || githubOwnersLoading"
            @click="void loadGitHubOwners()"
          />

          <div
            v-if="selectedGitHubOwner"
            class="grid gap-3 sm:grid-cols-2"
          >
            <div class="flex flex-col gap-1.5">
              <label
                for="project-task-github-repository"
                class="text-text-dark text-[13px] font-medium"
              >
                Repository scope
              </label>
              <AutoComplete
                input-id="project-task-github-repository"
                :model-value="selectedGitHubRepository"
                :suggestions="githubRepositorySuggestions"
                :option-label="getGitHubRepositoryLabel"
                complete-on-focus
                dropdown
                dropdown-mode="blank"
                force-selection
                :min-length="0"
                placeholder="Search repositories"
                :disabled="isDialogMutating || githubRepositoriesLoading || !!githubRepositoriesError"
                :loading="githubRepositoriesLoading"
                show-clear
                @complete="handleGitHubRepositoryComplete"
                @update:model-value="handleGitHubRepositoryUpdate"
              />
              <small
                v-if="githubRepositoriesError"
                class="text-destructive text-xs"
              >
                {{ githubRepositoriesError }}
              </small>
              <small
                v-else-if="!githubRepositoriesLoading && githubRepositories.length === 0"
                class="text-text-muted text-xs"
              >
                No repositories are available for this owner.
              </small>
            </div>

            <div class="flex flex-col gap-1.5">
              <label
                for="project-task-github-project"
                class="text-text-dark text-[13px] font-medium"
              >
                Project V2 scope
              </label>
              <AutoComplete
                input-id="project-task-github-project"
                :model-value="selectedGitHubProject"
                :suggestions="githubProjectSuggestions"
                :option-label="getGitHubProjectLabel"
                complete-on-focus
                dropdown
                dropdown-mode="blank"
                force-selection
                :min-length="0"
                placeholder="Search Projects V2"
                :disabled="isDialogMutating || githubProjectsLoading || !!githubProjectsError"
                :loading="githubProjectsLoading"
                show-clear
                @complete="handleGitHubProjectComplete"
                @update:model-value="handleGitHubProjectUpdate"
              />
              <small
                v-if="githubProjectsError"
                class="text-destructive text-xs"
              >
                {{ githubProjectsError }}
              </small>
              <small
                v-else-if="!githubProjectsLoading && githubProjects.length === 0"
                class="text-text-muted text-xs"
              >
                No Projects V2 are available for this owner.
              </small>
            </div>
          </div>

          <Button
            v-if="githubRepositoriesError || githubProjectsError"
            data-testid="github-task-scopes-retry"
            label="Retry scopes"
            severity="secondary"
            variant="outlined"
            size="small"
            class="self-start"
            :disabled="isDialogMutating || githubRepositoriesLoading || githubProjectsLoading"
            @click="void loadGitHubScopes()"
          />

          <div
            v-if="hasGitHubIssueScope"
            class="flex flex-col gap-1.5"
          >
            <label
              for="project-task-github-issue"
              class="text-text-dark text-[13px] font-medium"
            >
              Issue candidate
            </label>
            <AutoComplete
              input-id="project-task-github-issue"
              :model-value="selectedGitHubIssue"
              :suggestions="githubIssueSuggestions"
              :option-label="getGitHubIssueLabel"
              complete-on-focus
              dropdown
              dropdown-mode="blank"
              force-selection
              :min-length="0"
              placeholder="Search issues"
              :disabled="isDialogMutating || githubIssuesLoading || !!githubIssuesError"
              :loading="githubIssuesLoading"
              show-clear
              @complete="handleGitHubIssueComplete"
              @update:model-value="handleGitHubIssueUpdate"
            />
            <small
              v-if="githubIssuesError"
              class="text-destructive text-xs"
            >
              {{ githubIssuesError }}
            </small>
            <small
              v-else-if="!githubIssuesLoading && githubIssueCandidates.length === 0"
              class="text-text-muted text-xs"
            >
              No issues are available for this scope.
            </small>
          </div>

          <Button
            v-if="githubIssuesError"
            data-testid="github-task-issues-retry"
            label="Retry issues"
            severity="secondary"
            variant="outlined"
            size="small"
            class="self-start"
            :disabled="isDialogMutating || githubIssuesLoading"
            @click="selectedGitHubProject ? void loadProjectIssues() : void loadRepositoryIssues()"
          />

          <div
            v-if="selectedGitHubIssue"
            data-testid="github-task-selected-source"
            class="border-brand bg-accent-tint flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <span class="text-text-dark text-[13px] font-medium">
              Selected {{ selectedGitHubIssueSource }}: {{ selectedGitHubIssue.label }}
            </span>
            <Button
              label="Use manual task title"
              severity="secondary"
              variant="outlined"
              size="small"
              :disabled="isDialogMutating"
              @click="clearGitHubIssueSelection"
            />
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <label
          for="project-task-title"
          class="text-text-dark text-[13px] font-medium"
        >
          Task title
        </label>
        <InputText
          id="project-task-title"
          v-model="titleModel"
          data-testid="project-task-title-input"
          class="h-[38px] w-full"
          :disabled="isDialogMutating"
          :invalid="!!props.errors.title"
        />
        <small
          v-if="props.errors.title"
          class="text-destructive text-xs"
        >
          {{ props.errors.title }}
        </small>
      </div>

      <div
        v-if="props.mode === 'edit'"
        class="flex flex-col gap-1"
      >
        <label
          for="project-task-status"
          class="text-text-dark text-[13px] font-medium"
        >
          Status
        </label>
        <Select
          v-model="statusModel"
          fluid
          input-id="project-task-status"
          option-label="label"
          option-value="value"
          :disabled="isDialogMutating"
          :invalid="!!props.errors.status"
          :options="statusOptions"
        />
        <small
          v-if="props.errors.status"
          class="text-destructive text-xs"
        >
          {{ props.errors.status }}
        </small>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-text-dark text-[13px] font-medium">
          Default billable for time entries
        </span>
        <label
          for="project-task-default-billable"
          class="border-divider bg-surface-primary flex h-[38px] cursor-pointer items-center gap-2.5 rounded-[6px] border px-3"
        >
          <Checkbox
            id="project-task-default-billable"
            v-model="defaultBillableModel"
            binary
            :disabled="isDialogMutating"
          />
          <span class="text-text-dark text-sm font-medium">
            Billable by default
          </span>
        </label>
        <small class="text-text-muted text-xs">
          New time entries for this task inherit this value.
        </small>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          v-if="props.mode === 'edit'"
          type="button"
          label="Delete task"
          severity="danger"
          variant="outlined"
          :disabled="isDialogMutating"
          :loading="props.isDeleting"
          @click="emit('deleteTask')"
        />
        <Button
          type="button"
          :label="props.saveLabel"
          :disabled="props.isDeleting"
          :loading="props.isSaving"
          @click="emit('save')"
        />
      </div>
    </template>
  </Dialog>
</template>

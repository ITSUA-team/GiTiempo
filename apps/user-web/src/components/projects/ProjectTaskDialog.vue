<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import type { ProjectResponse, TaskStatus } from "@gitiempo/shared";
import { filterAutocompleteOptions, InlineRequestMessage } from "@gitiempo/web-shared";
import { computed, shallowRef, watch } from "vue";

import {
  readGitHubRepositoryContext,
  type GitHubIssueTaskSuggestion,
} from "@/lib/github-issue-task-suggestions";

const props = defineProps<{
  errors: {
    projectId: string | null;
    status: string | null;
    title: string | null;
  };
  defaultBillableForTimeEntries: boolean;
  gitHubIssueSuggestionErrorMessage: string | null;
  gitHubIssueSuggestions: GitHubIssueTaskSuggestion[];
  isDeleting: boolean;
  isLoadingGitHubIssueSuggestions: boolean;
  isOpen: boolean;
  isSaving: boolean;
  mode: "create" | "edit" | null;
  projectId: string | null;
  projects: ProjectResponse[];
  requestErrorMessage: string | null;
  saveLabel: string;
  selectedGitHubIssueSuggestionId: string | null;
  status: TaskStatus;
  subtitle: string;
  title: string;
  valueTitle: string;
}>();

const emit = defineEmits<{
  close: [];
  deleteTask: [];
  save: [];
  "update:defaultBillableForTimeEntries": [value: boolean];
  "update:selectedGitHubIssueSuggestionId": [value: string | null];
  "update:projectId": [value: string | null];
  "update:status": [value: TaskStatus];
  "update:title": [value: string];
}>();

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
const projectSearchValue = shallowRef<string | null>(null);
const projectSearchQuery = shallowRef("");
const gitHubIssueSearchValue = shallowRef<string | null>(null);
const gitHubIssueSearchQuery = shallowRef("");
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
const selectedGitHubIssueSuggestion = computed(
  () =>
    props.gitHubIssueSuggestions.find(
      (suggestion) => suggestion.id === props.selectedGitHubIssueSuggestionId,
    ) ?? null,
);
const gitHubIssueSuggestions = computed(() => {
  return filterAutocompleteOptions(
    props.gitHubIssueSuggestions,
    gitHubIssueSearchQuery.value,
    (suggestion) => `${suggestion.title} ${suggestion.repositoryLabel} #${suggestion.issue.number}`,
  );
});
const gitHubIssueModel = computed({
  get: () => gitHubIssueSearchValue.value ?? selectedGitHubIssueSuggestion.value,
  set: (value: GitHubIssueTaskSuggestion | string | null | undefined) => {
    if (typeof value === "string") {
      gitHubIssueSearchValue.value = value;
      gitHubIssueSearchQuery.value = value;
      return;
    }

    gitHubIssueSearchValue.value = null;
    gitHubIssueSearchQuery.value = "";
    emit("update:selectedGitHubIssueSuggestionId", value?.id ?? null);
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
const shouldShowGitHubIssueSuggestions = computed(
  () =>
    props.mode === "create" &&
    readGitHubRepositoryContext(selectedProject.value) !== null,
);

watch(
  [() => props.isOpen, () => props.mode, () => props.projectId],
  () => {
    projectSearchValue.value = null;
    projectSearchQuery.value = "";
    gitHubIssueSearchValue.value = null;
    gitHubIssueSearchQuery.value = "";
  },
);

function handleProjectComplete(event: { query: string }): void {
  projectSearchQuery.value = event.query;
}

function handleGitHubIssueComplete(event: { query: string }): void {
  gitHubIssueSearchQuery.value = event.query;
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
        v-if="shouldShowGitHubIssueSuggestions"
        class="flex flex-col gap-1"
      >
        <label
          for="project-task-github-issue"
          class="text-text-dark text-[13px] font-medium"
        >
          GitHub issue
        </label>
        <AutoComplete
          v-model="gitHubIssueModel"
          append-to="self"
          complete-on-focus
          data-key="id"
          dropdown
          dropdown-mode="blank"
          fluid
          force-selection
          input-id="project-task-github-issue"
          :min-length="0"
          option-label="title"
          overlay-class="w-full max-w-full"
          placeholder="Select GitHub issue"
          :disabled="isDialogMutating"
          :loading="props.isLoadingGitHubIssueSuggestions"
          :suggestions="gitHubIssueSuggestions"
          @complete="handleGitHubIssueComplete"
        >
          <template #option="{ option }">
            <div
              class="border-brand/20 bg-accent-tint/70 flex min-w-0 flex-col gap-1 rounded-md border px-2 py-2"
              data-testid="project-task-github-issue-option"
            >
              <div class="flex min-w-0 items-center gap-2 text-xs">
                <span class="bg-brand text-text-inverse rounded-sm px-1.5 py-0.5 text-[11px] leading-none font-semibold">
                  GitHub
                </span>
                <span class="text-text-muted min-w-0 truncate">
                  {{ option.repositoryLabel }} #{{ option.issue.number }}
                </span>
              </div>
              <span class="text-text-dark truncate text-sm font-medium">
                {{ option.title }}
              </span>
            </div>
          </template>
        </AutoComplete>
        <small
          v-if="props.isLoadingGitHubIssueSuggestions"
          class="text-text-muted text-xs"
        >
          Loading GitHub issue suggestions...
        </small>
        <small
          v-else-if="props.gitHubIssueSuggestionErrorMessage"
          class="text-text-muted text-xs"
        >
          GitHub issue suggestions are unavailable: {{ props.gitHubIssueSuggestionErrorMessage }}
        </small>
        <small
          v-else-if="props.gitHubIssueSuggestions.length === 0"
          class="text-text-muted text-xs"
        >
          No open GitHub issues are available for this project.
        </small>
        <small
          v-else
          class="text-text-muted text-xs"
        >
          Select an issue to prefill the local task title.
        </small>
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

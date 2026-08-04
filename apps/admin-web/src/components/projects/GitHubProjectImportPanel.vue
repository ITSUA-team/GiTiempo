<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { GitHubProject } from '@gitiempo/shared';
import {
  composeGiTiempoSelfAppendedAutoCompleteDropdownPt,
  giTiempoSelectPt,
} from '@gitiempo/web-config/theme';
import { filterAutocompleteOptions } from '@gitiempo/web-shared';
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import Select from 'primevue/select';

import {
  adminGithubBrowsingClient,
  type BoardRepositorySummary,
} from '@/services/admin-github-browsing-client';
import { adminProjectsClient } from '@/services/admin-projects-client';
import { getAdminSettingsClient } from '@/services/admin-settings-client';

const emit = defineEmits<{ back: []; imported: [] }>();

type ScanState = 'failed' | 'missing' | 'ok';

interface BoardOption {
  board: GitHubProject;
  id: string;
  importedProjectId: string | null;
  importedRepository: string | null;
  label: string;
  linkedRepository: string | null;
  linkedRepositoryTaken: boolean;
  reason: string;
  repositories: string[];
  scanState: ScanState;
  summary: BoardRepositorySummary | undefined;
}

interface ImportedBoard {
  linkedRepository: string | null;
  projectId: string;
}

interface AutoCompleteCompleteEvent {
  query: string;
}

const projectAutoCompletePt = composeGiTiempoSelfAppendedAutoCompleteDropdownPt({
  pcInputText: {
    root: {
      autocomplete: 'off',
      'data-1p-ignore': 'true',
      'data-bwignore': 'true',
      'data-lpignore': 'true',
    },
  },
});

const isLoading = ref(true);
const loadError = ref<string | null>(null);
const availability = ref<'available' | 'no-connection' | 'no-organization'>(
  'available',
);
const organizations = ref<string[]>([]);
const selectedOrganization = ref<string | null>(null);
const boards = ref<GitHubProject[]>([]);
const summaries = ref<Record<string, BoardRepositorySummary>>({});
const importedByBoardId = ref(new Map<string, ImportedBoard>());
const importedRepositoryKeys = ref(new Map<string, string>());
const selectedBoardId = ref<string | null>(null);
const typedProjectQuery = ref<string | null>(null);
const projectSuggestions = ref<BoardOption[]>([]);
const isScanningBoard = ref(false);
const isSubmitting = ref(false);
const submitError = ref<string | null>(null);

const organizationOptions = computed(() =>
  organizations.value.map((login) => ({ label: login, value: login })),
);

function skippedParts(skipped: BoardRepositorySummary['skipped']): string[] {
  const parts: string[] = [];

  if (skipped.draftIssues > 0) parts.push(`${skipped.draftIssues} draft items`);
  if (skipped.pullRequests > 0)
    parts.push(`${skipped.pullRequests} pull requests`);
  if (skipped.redacted > 0)
    parts.push(`${skipped.redacted} items you cannot read`);
  if (skipped.unknown > 0) parts.push(`${skipped.unknown} unrecognised items`);

  return parts;
}

function describeReason(
  summary: BoardRepositorySummary | undefined,
  repositories: string[],
  scanState: ScanState,
): string {
  if (scanState === 'missing') {
    return 'Not scanned yet';
  }

  if (scanState === 'failed') {
    return `Could not read: ${summary!.errorMessage}`;
  }

  if (repositories.length === 1) {
    return `1 repository — ${repositories[0]}`;
  }

  if (repositories.length > 1) {
    return `${repositories.length} repositories`;
  }

  const parts = skippedParts(summary!.skipped);

  return parts.length > 0 ? parts.join(', ') : 'No issues yet';
}

function toOption(board: GitHubProject): BoardOption {
  const summary = summaries.value[board.id];
  const scanState: ScanState =
    summary === undefined
      ? 'missing'
      : summary.errorMessage !== null
        ? 'failed'
        : 'ok';
  const repositories = scanState === 'ok' ? summary!.repositories : [];
  const linkedRepository =
    repositories.length === 1 ? repositories[0]! : null;
  const imported = importedByBoardId.value.get(board.id);

  return {
    board,
    id: board.id,
    importedProjectId: imported?.projectId ?? null,
    importedRepository: imported?.linkedRepository ?? null,
    label: board.title,
    linkedRepository,
    linkedRepositoryTaken:
      linkedRepository !== null &&
      importedRepositoryKeys.value.has(linkedRepository.toLowerCase()),
    reason: describeReason(summary, repositories, scanState),
    repositories,
    scanState,
    summary,
  };
}

const boardOptions = computed<BoardOption[]>(() =>
  boards.value
    .filter((board) => board.owner === selectedOrganization.value)
    .map((board) => toOption(board)),
);

const selectedOption = computed<BoardOption | null>(
  () =>
    boardOptions.value.find(
      (option) => option.board.id === selectedBoardId.value,
    ) ?? null,
);

const derivedName = computed(() =>
  selectedOption.value
    ? `${selectedOption.value.board.owner}/${selectedOption.value.board.title}`
    : null,
);

const projectModelValue = computed<BoardOption | string | null>(
  () => typedProjectQuery.value ?? selectedOption.value,
);

const linkedRepositoryLabel = computed(() => {
  const option = selectedOption.value;

  if (!option) {
    return null;
  }

  if (option.importedProjectId !== null) {
    return option.importedRepository ?? 'None';
  }

  if (option.scanState === 'missing') {
    return 'Unknown — this project has not been scanned yet';
  }

  if (option.scanState === 'failed') {
    return 'Unknown — this project could not be read';
  }

  if (option.linkedRepository) {
    return option.linkedRepositoryTaken
      ? `${option.linkedRepository} — already tracked by another project`
      : option.linkedRepository;
  }

  if (option.repositories.length > 1) {
    return `None — issues come from ${option.repositories.length} repositories`;
  }

  return 'None — no issue to read a repository from';
});

const issuesScannedLabel = computed(() => {
  const option = selectedOption.value;

  if (!option) {
    return null;
  }

  const summary = option.summary;

  if (!summary) {
    return 'Not scanned yet';
  }

  if (summary.errorMessage) {
    return `Could not read this project: ${summary.errorMessage}`;
  }

  if (summary.totalItems === 0) {
    const parts = skippedParts(summary.skipped);

    return parts.length > 0 ? `None. ${parts.join(', ')} skipped` : 'No issues yet';
  }

  const issues = `${summary.totalItems} ${summary.totalItems === 1 ? 'issue' : 'issues'}`;
  const scope =
    option.repositories.length === 1
      ? `, all from ${option.repositories[0]}`
      : `, from ${option.repositories.join(', ')}`;

  return `${issues}${scope}${summary.hasMore ? ' (more not scanned)' : ''}`;
});

const statusLabel = computed(() => {
  const option = selectedOption.value;

  if (!option) {
    return null;
  }

  return option.importedProjectId === null ? 'Not added yet' : 'Already added';
});

const outcomeDescription = computed(() => {
  const option = selectedOption.value;
  const name = derivedName.value;

  if (!option || !name) {
    return null;
  }

  if (option.importedProjectId !== null) {
    return `This project is already in GiTiempo as ${name}. Adding never modifies an existing project, so Add project stays disabled.`;
  }

  if (option.scanState === 'missing') {
    return `Adds ${name}. Its issues have not been scanned yet, so no repository can be linked.`;
  }

  if (option.scanState === 'failed') {
    return `Adds ${name} without a repository, because its issues could not be read. Nothing will be linked.`;
  }

  if (option.linkedRepository && option.linkedRepositoryTaken) {
    return `Adds ${name}, but ${option.linkedRepository} already belongs to another project, so it will not be linked here. Timers started from its issues keep using that project.`;
  }

  if (option.linkedRepository) {
    return `Adds ${name} and links ${option.linkedRepository}. A timer started from any issue of that repository reuses this project instead of creating a second one.`;
  }

  if (option.repositories.length > 1) {
    return `Adds ${name} without a repository. Linking one of the ${option.repositories.length} would misrepresent the others, so timers started from those issues keep creating their own projects.`;
  }

  if ((option.summary?.skipped.draftIssues ?? 0) > 0) {
    return `Adds ${name} as an empty project. Draft items live only on the board and belong to no repository, so nothing can be linked until real issues are added.`;
  }

  return `Adds ${name} without a repository. Nothing on this project points at one yet, so nothing can be linked until it has issues.`;
});

const detailRows = computed(() => {
  if (!selectedOption.value) {
    return [];
  }

  return [
    {
      label: 'Project name in GiTiempo',
      testid: 'github-import-derived-name',
      value: derivedName.value!,
    },
    { label: 'Source', testid: 'github-import-source', value: 'GitHub' },
    {
      label: 'Linked repository',
      testid: 'github-import-linked-repository',
      value: linkedRepositoryLabel.value!,
    },
    {
      label: 'Issues scanned',
      testid: 'github-import-issues-scanned',
      value: issuesScannedLabel.value!,
    },
    {
      label: 'Status',
      testid: 'github-import-status',
      value: statusLabel.value!,
    },
  ];
});

const alreadyAddedCount = computed(
  () =>
    boardOptions.value.filter((option) => option.importedProjectId !== null)
      .length,
);

const canSubmit = computed(
  () =>
    selectedOption.value !== null &&
    selectedOption.value.importedProjectId === null &&
    selectedOption.value.scanState !== 'missing' &&
    !isScanningBoard.value &&
    !isSubmitting.value,
);

const projectPlaceholder = computed(() =>
  selectedOrganization.value === null
    ? 'Select an organization first'
    : 'Search projects',
);

const projectHint = computed(() =>
  selectedOrganization.value === null
    ? 'Pick an organization to list its open projects.'
    : `Open projects of ${selectedOrganization.value}. Type to filter.`,
);

function handleOrganizationUpdate(value: string | null): void {
  selectedOrganization.value = value;
  selectedBoardId.value = null;
  typedProjectQuery.value = null;
  projectSuggestions.value = [];
  submitError.value = null;
}

function handleProjectComplete(event: AutoCompleteCompleteEvent): void {
  projectSuggestions.value = filterAutocompleteOptions(
    boardOptions.value,
    event.query ?? '',
    (option) => option.label,
  );
}

async function handleProjectUpdate(
  value: BoardOption | string | null,
): Promise<void> {
  submitError.value = null;

  if (typeof value === 'string') {
    typedProjectQuery.value = value;
    selectedBoardId.value = null;
    return;
  }

  typedProjectQuery.value = null;
  selectedBoardId.value = value?.board.id ?? null;

  const boardId = value?.board.id;

  if (boardId === undefined || summaries.value[boardId] !== undefined) {
    return;
  }

  isScanningBoard.value = true;

  try {
    summaries.value = {
      ...summaries.value,
      ...(await adminGithubBrowsingClient.listBoardRepositories([boardId])),
    };
  } finally {
    isScanningBoard.value = false;
  }
}

async function load(): Promise<void> {
  isLoading.value = true;
  loadError.value = null;

  try {
    const connection =
      await getAdminSettingsClient().getGitHubConnectionStatus();

    if (connection.status !== 'connected') {
      availability.value = 'no-connection';
      return;
    }

    const workspaceOrganizations =
      await getAdminSettingsClient().listWorkspaceGitHubOrganizations();

    if (workspaceOrganizations.items.length === 0) {
      availability.value = 'no-organization';
      return;
    }

    availability.value = 'available';
    organizations.value = workspaceOrganizations.items.map(
      (organization) => organization.organizationLogin,
    );
    selectedOrganization.value =
      organizations.value.length === 1 ? organizations.value[0]! : null;

    const [listedBoards, importedProjects, importedRepositories] =
      await Promise.all([
        adminGithubBrowsingClient.listOrganizationProjects(organizations.value),
        adminProjectsClient.listImportedGitHubProjects(),
        adminProjectsClient.listImportedGitHubRepositories(),
      ]);

    boards.value = listedBoards;
    importedByBoardId.value = new Map(
      importedProjects.items.map((item) => [
        item.githubProjectId,
        { linkedRepository: item.linkedRepository, projectId: item.projectId },
      ]),
    );
    importedRepositoryKeys.value = new Map(
      importedRepositories.items.map((item) => [
        item.githubRepo.toLowerCase(),
        item.projectId,
      ]),
    );
    summaries.value = await adminGithubBrowsingClient.listBoardRepositories(
      listedBoards.map((board) => board.id),
    );
  } catch (error) {
    loadError.value =
      error instanceof Error
        ? error.message
        : 'Could not load GitHub projects.';
  } finally {
    isLoading.value = false;
  }
}

async function handleSubmit(): Promise<void> {
  const option = selectedOption.value;

  if (option === null || option.importedProjectId !== null) {
    return;
  }

  isSubmitting.value = true;
  submitError.value = null;

  try {
    const response = await adminProjectsClient.importGitHubProjects({
      githubProjects: [
        {
          githubProjectId: option.board.id,
          githubRepos: option.repositories,
          number: option.board.number,
          owner: option.board.owner,
          title: option.board.title,
          url: option.board.url,
        },
      ],
    });
    const result = response.results[0];

    if (result?.status === 'failed') {
      submitError.value = result.message ?? 'Import failed.';
      return;
    }

    emit('imported');
  } catch (error) {
    submitError.value =
      error instanceof Error ? error.message : 'Import failed.';
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div
    class="flex flex-col gap-3"
    data-testid="github-import-panel"
  >
    <div
      v-if="isLoading"
      class="flex justify-center py-8"
    >
      <ProgressSpinner style="width: 32px; height: 32px" />
    </div>

    <Message
      v-else-if="loadError"
      severity="error"
      :closable="false"
    >
      {{ loadError }}
    </Message>

    <Message
      v-else-if="availability === 'no-connection'"
      severity="info"
      :closable="false"
    >
      Connect a GitHub account in Settings to import projects.
    </Message>

    <Message
      v-else-if="availability === 'no-organization'"
      severity="info"
      :closable="false"
    >
      No GitHub organization is approved for this workspace yet. Approve one in
      Settings to import its projects.
    </Message>

    <Message
      v-else-if="boards.length === 0"
      severity="info"
      :closable="false"
    >
      No open GitHub projects were found in the approved organizations.
    </Message>

    <template v-else>
      <div class="flex flex-col gap-1.5">
        <label
          id="github-import-organization-label"
          for="github-import-organization"
          class="text-text-dark text-[13px] font-medium"
        >
          Organization
        </label>
        <Select
          aria-labelledby="github-import-organization-label"
          input-id="github-import-organization"
          label-id="github-import-organization"
          data-testid="github-import-organization"
          :options="organizationOptions"
          option-label="label"
          option-value="value"
          placeholder="Select an organization"
          :disabled="isSubmitting"
          :model-value="selectedOrganization"
          :pt="giTiempoSelectPt"
          @update:model-value="handleOrganizationUpdate"
        />
        <small class="text-text-muted text-xs">
          Organizations approved for this workspace in Settings.
        </small>
      </div>

      <div class="flex flex-col gap-1.5">
        <label
          for="github-import-project"
          class="text-text-dark text-[13px] font-medium"
        >
          GitHub project
        </label>
        <AutoComplete
          append-to="self"
          class="w-full"
          complete-on-focus
          data-key="id"
          dropdown
          dropdown-mode="blank"
          force-selection
          input-id="github-import-project"
          :min-length="0"
          option-label="label"
          show-clear
          :disabled="isSubmitting || selectedOrganization === null"
          :loading="isScanningBoard"
          :model-value="projectModelValue"
          :placeholder="projectPlaceholder"
          :pt="projectAutoCompletePt"
          :suggestions="projectSuggestions"
          @complete="handleProjectComplete"
          @update:model-value="
            void handleProjectUpdate(
              ($event ?? null) as BoardOption | string | null,
            )
          "
        >
          <template #option="{ option }">
            <div
              class="flex w-full items-center justify-between gap-3"
              data-testid="github-import-option"
              :data-imported="option.importedProjectId !== null ? 'true' : 'false'"
            >
              <span class="flex items-center gap-2">
                <span
                  class="text-[14px] font-semibold"
                  :class="
                    option.importedProjectId !== null
                      ? 'text-text-muted'
                      : 'text-text-dark'
                  "
                >
                  {{ option.board.title }}
                </span>
                <span class="text-text-muted text-xs">
                  #{{ option.board.number }}
                </span>
              </span>
              <span
                v-if="option.importedProjectId !== null"
                class="border-divider text-text-muted rounded-sm border px-1.5 text-[11px]"
              >
                Already added
              </span>
              <span
                v-else
                class="text-text-muted text-xs"
              >
                {{ option.reason }}
              </span>
            </div>
          </template>
          <template #footer>
            <div
              v-if="alreadyAddedCount > 0"
              class="border-divider text-text-muted border-t px-3 py-2 text-xs"
              data-testid="github-import-added-count"
            >
              {{ alreadyAddedCount }} of {{ boardOptions.length }} already added
            </div>
          </template>
        </AutoComplete>
        <small class="text-text-muted text-xs">
          {{ projectHint }}
        </small>
      </div>

      <div
        v-if="selectedOption"
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
          {{ outcomeDescription }}
        </p>
      </div>

      <Message
        v-if="submitError"
        severity="error"
        :closable="false"
      >
        {{ submitError }}
      </Message>

      <div class="mt-4 flex items-center justify-end gap-2">
        <Button
          label="Back"
          severity="secondary"
          outlined
          type="button"
          :disabled="isSubmitting"
          @click="emit('back')"
        />
        <Button
          label="Add project"
          type="button"
          data-testid="github-import-submit"
          :disabled="!canSubmit"
          :loading="isSubmitting"
          @click="handleSubmit"
        />
      </div>
    </template>
  </div>
</template>

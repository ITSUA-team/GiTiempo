<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { GitHubProject } from '@gitiempo/shared';
import {
  composeGiTiempoSelfAppendedAutoCompleteDropdownPt,
  giTiempoSelectPt,
} from '@gitiempo/web-config/theme';
import { filterAutocompleteOptions } from '@gitiempo/web-shared';
import AutoComplete from 'primevue/autocomplete';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import Select from 'primevue/select';

import {
  adminGithubBrowsingClient,
  type BoardRepositorySummary,
} from '@/services/admin-github-browsing-client';
import { adminProjectsClient } from '@/services/admin-projects-client';
import { getAdminSettingsClient } from '@/services/admin-settings-client';
import {
  describeBlockedReason,
  isBoardAddable,
  toBoardOption,
  type BoardOption,
  type GitHubFieldsAvailability,
  type ImportedBoard,
  type RepositoryOwner,
} from './github-project-import';

const props = defineProps<{ disabled: boolean }>();

const selection = defineModel<BoardOption | null>({ required: true });
const availability = defineModel<GitHubFieldsAvailability>('availability', {
  required: true,
});

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

const loadError = ref<string | null>(null);
const organizations = ref<string[]>([]);
const selectedOrganization = ref<string | null>(null);
const boards = ref<GitHubProject[]>([]);
const summaries = ref<Record<string, BoardRepositorySummary>>({});
const importedByBoardId = ref(new Map<string, ImportedBoard>());
const importedRepositoryKeys = ref(new Map<string, RepositoryOwner>());
const typedProjectQuery = ref<string | null>(null);
const boardsTruncated = ref(false);
const projectSuggestions = ref<BoardOption[]>([]);
const isScanningBoard = defineModel<boolean>('scanning', { required: true });
let pendingScans = 0;

const organizationOptions = computed(() =>
  organizations.value.map((login) => ({ label: login, value: login })),
);

const boardOptions = computed<BoardOption[]>(() =>
  boards.value
    .filter((board) => board.owner === selectedOrganization.value)
    .map((board) =>
      toBoardOption(
        board,
        summaries.value[board.id],
        importedByBoardId.value,
        importedRepositoryKeys.value,
      ),
    ),
);

const projectModelValue = computed<BoardOption | string | null>(
  () => typedProjectQuery.value ?? selection.value,
);

const alreadyAddedCount = computed(
  () =>
    boardOptions.value.filter((option) => option.importedProjectId !== null)
      .length,
);

const projectPlaceholder = computed(() =>
  selectedOrganization.value === null
    ? 'Select an organization first'
    : 'Search projects',
);

const projectHint = computed(() => {
  if (selectedOrganization.value === null) {
    return 'Pick an organization to list its open projects.';
  }

  if (boardsTruncated.value) {
    return `Open projects of ${selectedOrganization.value}. Type to filter. This organization has more projects than we list here, so a missing one may need to be imported by its own request.`;
  }

  return `Open projects of ${selectedOrganization.value}. Type to filter.`;
});

function handleOrganizationUpdate(value: string | null): void {
  selectedOrganization.value = value;
  selection.value = null;
  typedProjectQuery.value = null;
  projectSuggestions.value = [];
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
  if (typeof value === 'string') {
    typedProjectQuery.value = value;
    selection.value = null;
    return;
  }

  typedProjectQuery.value = null;
  selection.value = value;

  const boardId = value?.board.id;

  if (boardId === undefined || summaries.value[boardId] !== undefined) {
    return;
  }

  pendingScans += 1;
  isScanningBoard.value = true;

  try {
    summaries.value = {
      ...summaries.value,
      ...(await adminGithubBrowsingClient.listBoardRepositories([boardId])),
    };

    if (selection.value?.board.id === boardId) {
      selection.value =
        boardOptions.value.find((option) => option.id === boardId) ?? null;
    }
  } finally {
    pendingScans -= 1;
    isScanningBoard.value = pendingScans > 0;
  }
}

async function load(): Promise<void> {
  availability.value = 'loading';
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

    boards.value = listedBoards.items;
    boardsTruncated.value = listedBoards.hasMore;
    importedByBoardId.value = new Map(
      importedProjects.items.map((item) => [
        item.githubProjectId,
        { linkedRepository: item.linkedRepository, projectId: item.projectId },
      ]),
    );
    importedRepositoryKeys.value = new Map(
      importedRepositories.items.map((item) => [
        item.githubRepo.toLowerCase(),
        {
          projectId: item.projectId,
          projectIsActive: item.projectIsActive,
          projectName: item.projectName,
        },
      ]),
    );

    if (listedBoards.items.length === 0) {
      availability.value = 'no-projects';
      return;
    }

    summaries.value = await adminGithubBrowsingClient.listBoardRepositories(
      listedBoards.items.map((board) => board.id),
    );
    availability.value = 'available';
  } catch (error) {
    availability.value = 'error';
    loadError.value =
      error instanceof Error
        ? error.message
        : 'Could not load GitHub projects.';
  }
}

onMounted(load);
</script>

<template>
  <div
    class="flex flex-col gap-3"
    data-testid="github-import-fields"
  >
    <div
      v-if="availability === 'loading'"
      class="flex justify-center py-6"
    >
      <ProgressSpinner style="width: 28px; height: 28px" />
    </div>

    <Message
      v-else-if="availability === 'error'"
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
      v-else-if="availability === 'no-projects'"
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
          :disabled="props.disabled"
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
          :disabled="props.disabled || selectedOrganization === null"
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
              :data-addable="isBoardAddable(option) ? 'true' : 'false'"
            >
              <span class="flex items-center gap-2">
                <span
                  class="text-[14px] font-semibold"
                  :class="
                    isBoardAddable(option) ? 'text-text-dark' : 'text-text-muted'
                  "
                >
                  {{ option.board.title }}
                </span>
                <span class="text-text-muted text-xs">
                  #{{ option.board.number }}
                </span>
              </span>
              <span
                v-if="describeBlockedReason(option)"
                class="border-divider text-text-muted shrink-0 rounded-sm border px-1.5 text-[11px]"
                data-testid="github-import-option-blocked"
              >
                {{ describeBlockedReason(option) }}
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
    </template>
  </div>
</template>

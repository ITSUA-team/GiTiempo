<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { GitHubProject } from '@gitiempo/shared';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';

import {
  adminGithubBrowsingClient,
  type BoardRepositorySummary,
} from '@/services/admin-github-browsing-client';
import { adminProjectsClient } from '@/services/admin-projects-client';
import { getAdminSettingsClient } from '@/services/admin-settings-client';

const emit = defineEmits<{ imported: [] }>();

interface BoardRow {
  board: GitHubProject;
  context: string;
  importedProjectId: string | null;
  linkedRepository: string | null;
  repositories: string[];
}

const isLoading = ref(true);
const loadError = ref<string | null>(null);
const availability = ref<'available' | 'no-connection' | 'no-organization'>(
  'available',
);
const rows = ref<BoardRow[]>([]);
const importingId = ref<string | null>(null);
const importError = ref<string | null>(null);

const availableCount = computed(
  () => rows.value.filter((row) => row.importedProjectId === null).length,
);

function describeContext(
  summary: BoardRepositorySummary | undefined,
  repositories: string[],
): string {
  if (!summary) {
    return 'Not scanned.';
  }

  if (summary.errorMessage) {
    return `Could not read this project: ${summary.errorMessage}`;
  }

  if (repositories.length > 0) {
    return repositories.join(', ');
  }

  const { draftIssues, pullRequests, redacted, unknown } = summary.skipped;
  const parts: string[] = [];

  if (draftIssues > 0) parts.push(`${draftIssues} draft items`);
  if (pullRequests > 0) parts.push(`${pullRequests} pull requests`);
  if (redacted > 0) parts.push(`${redacted} items you cannot read`);
  if (unknown > 0) parts.push(`${unknown} unrecognised items`);

  return parts.length > 0
    ? `No linked repository — ${parts.join(', ')}`
    : 'No issues yet';
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

    const organizations =
      await getAdminSettingsClient().listWorkspaceGitHubOrganizations();

    if (organizations.items.length === 0) {
      availability.value = 'no-organization';
      return;
    }

    availability.value = 'available';

    const [boards, importedProjects, importedRepositories] = await Promise.all([
      adminGithubBrowsingClient.listOrganizationProjects(
        organizations.items.map(
          (organization) => organization.organizationLogin,
        ),
      ),
      adminProjectsClient.listImportedGitHubProjects(),
      adminProjectsClient.listImportedGitHubRepositories(),
    ]);
    const importedBoards = new Map(
      importedProjects.items.map((item) => [item.githubProjectId, item]),
    );
    const importedRepoKeys = new Map(
      importedRepositories.items.map((item) => [
        item.githubRepo.toLowerCase(),
        item.projectId,
      ]),
    );
    const summaries = await adminGithubBrowsingClient.listBoardRepositories(
      boards.map((board) => board.id),
    );

    rows.value = boards.map((board) => {
      const summary = summaries[board.id];
      const repositories = summary?.repositories ?? [];
      const viaRepository = repositories
        .map((fullName) => importedRepoKeys.get(fullName.toLowerCase()))
        .find((projectId) => projectId !== undefined);

      const imported = importedBoards.get(board.id);

      return {
        board,
        context: describeContext(summary, repositories),
        importedProjectId: imported?.projectId ?? viaRepository ?? null,
        linkedRepository:
          imported?.linkedRepository ??
          (repositories.length === 1 ? repositories[0]! : null),
        repositories,
      };
    });
  } catch (error) {
    loadError.value =
      error instanceof Error
        ? error.message
        : 'Could not load GitHub projects.';
  } finally {
    isLoading.value = false;
  }
}

async function importBoard(row: BoardRow): Promise<void> {
  if (row.importedProjectId !== null || importingId.value !== null) {
    return;
  }

  importingId.value = row.board.id;
  importError.value = null;

  try {
    const response = await adminProjectsClient.importGitHubProjects({
      githubProjects: [
        {
          githubProjectId: row.board.id,
          githubRepos: row.repositories,
          number: row.board.number,
          owner: row.board.owner,
          title: row.board.title,
          url: row.board.url,
        },
      ],
    });
    const result = response.results[0];

    if (result?.status === 'failed') {
      importError.value = result.message ?? 'Import failed.';
      return;
    }

    emit('imported');
  } catch (error) {
    importError.value =
      error instanceof Error ? error.message : 'Import failed.';
  } finally {
    importingId.value = null;
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
      v-else-if="rows.length === 0"
      severity="info"
      :closable="false"
    >
      No open GitHub projects were found in the approved organizations.
    </Message>

    <template v-else>
      <p class="text-text-muted text-[13px]">
        Click a project to add it. {{ availableCount }} of {{ rows.length }}
        available.
      </p>

      <Message
        v-if="importError"
        severity="error"
        :closable="false"
      >
        {{ importError }}
      </Message>

      <button
        v-for="row in rows"
        :key="row.board.id"
        type="button"
        class="focus-visible:outline-brand flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        :class="
          row.importedProjectId !== null
            ? 'border-divider bg-app-bg cursor-not-allowed opacity-70'
            : 'border-divider hover:border-brand hover:bg-accent-tint cursor-pointer'
        "
        :disabled="row.importedProjectId !== null || importingId !== null"
        :data-imported="row.importedProjectId !== null ? 'true' : 'false'"
        data-testid="github-import-board"
        @click="importBoard(row)"
      >
        <span class="flex items-center gap-2">
          <span class="text-text-dark text-sm font-semibold">
            <span class="text-text-muted font-normal">{{ row.board.owner }}/</span>{{ row.board.title }}
          </span>
          <span class="text-text-muted text-xs">#{{ row.board.number }}</span>
          <span
            v-if="row.importedProjectId !== null"
            class="border-divider text-text-muted rounded-sm border px-1.5 text-[11px]"
          >
            Already added
          </span>
          <span
            v-else-if="importingId === row.board.id"
            class="text-brand text-[11px]"
          >
            Adding…
          </span>
        </span>
        <span class="text-text-muted text-[13px]">{{ row.context }}</span>
        <span
          v-if="row.linkedRepository"
          class="text-text-muted text-[11px]"
          data-testid="github-import-linked-repository"
        >
          Repository {{ row.linkedRepository }}
        </span>
        <span
          v-else-if="row.repositories.length > 1"
          class="text-text-muted text-[11px]"
        >
          Spans {{ row.repositories.length }} repositories — none is linked
        </span>
        <span
          v-else
          class="text-text-muted text-[11px]"
        >
          No repository — tracked as {{ row.board.owner }}/{{ row.board.title }}
        </span>
      </button>
    </template>
  </div>
</template>

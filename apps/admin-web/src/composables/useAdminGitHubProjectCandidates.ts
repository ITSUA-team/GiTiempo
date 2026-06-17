import { computed, ref } from 'vue';
import type {
  GitHubOwner,
  GitHubProject,
  GitHubProjectCreateReference,
  GitHubProjectListQuery,
  GitHubRepository,
  GitHubRepositoryListQuery,
} from '@gitiempo/shared';
import type { GitHubBrowsingClient } from '@gitiempo/web-shared/github-browsing-client';

import {
  adminGitHubBrowsingClient,
} from '@/services/admin-github-browsing-client';
import {
  adminGitHubConnectionClient,
  type AdminGitHubConnectionClient,
} from '@/services/admin-github-connection-client';

export type GitHubProjectCandidateConnectionState =
  | 'idle'
  | 'loading'
  | 'connected'
  | 'disconnected'
  | 'error';

type AutoCompleteValue<T> = T | string | null;

interface AutoCompleteCompleteEvent {
  query: string;
}

/* eslint-disable no-unused-vars */
interface UseAdminGitHubProjectCandidatesOptions {
  browsingClient?: Pick<
    GitHubBrowsingClient,
    'listOwners' | 'listProjects' | 'listRepositories'
  >;
  connectionClient?: Pick<AdminGitHubConnectionClient, 'getConnectionStatus'>;
  onLoadError?(error: unknown, message: string): void;
}

type TextGetter<T> = (item: T) => string;
/* eslint-enable no-unused-vars */

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function filterByQuery<T>(
  items: T[],
  query: string,
  getText: TextGetter<T>,
): T[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) return items;

  return items.filter((item) =>
    getText(item).toLowerCase().includes(normalizedQuery),
  );
}

function isOwner(value: AutoCompleteValue<GitHubOwner>): value is GitHubOwner {
  return typeof value === 'object' && value !== null && 'login' in value;
}

function isRepository(
  value: AutoCompleteValue<GitHubRepository>,
): value is GitHubRepository {
  return typeof value === 'object' && value !== null && 'fullName' in value;
}

function isProject(
  value: AutoCompleteValue<GitHubProject>,
): value is GitHubProject {
  return typeof value === 'object' && value !== null && 'title' in value;
}

function getOwnerScopedQuery(
  owner: GitHubOwner,
): GitHubProjectListQuery & GitHubRepositoryListQuery {
  return owner.type === 'organization'
    ? { ownerType: 'organization', owner: owner.login, limit: 100 }
    : { ownerType: 'personal', limit: 100 };
}

function createRepositoryReference(
  repository: GitHubRepository,
): GitHubProjectCreateReference {
  return {
    provider: 'github',
    externalType: 'repository',
    externalId: repository.id,
    externalKey: repository.fullName,
    externalUrl: repository.url,
    metadata: {
      description: repository.description,
      fullName: repository.fullName,
      isArchived: repository.isArchived,
      name: repository.name,
      nodeId: repository.nodeId,
      owner: repository.owner,
      updatedAt: repository.updatedAt,
      visibility: repository.visibility,
    },
  };
}

function createProjectReference(project: GitHubProject): GitHubProjectCreateReference {
  return {
    provider: 'github',
    externalType: 'project_v2',
    externalId: project.id,
    externalKey: project.id,
    externalUrl: project.url,
    metadata: {
      description: project.description,
      number: project.number,
      owner: project.owner,
      state: project.state,
      title: project.title,
      updatedAt: project.updatedAt,
    },
  };
}

export function useAdminGitHubProjectCandidates(
  options: UseAdminGitHubProjectCandidatesOptions = {},
) {
  const browsingClient = options.browsingClient ?? adminGitHubBrowsingClient;
  const connectionClient = options.connectionClient ?? adminGitHubConnectionClient;

  const connectionState = ref<GitHubProjectCandidateConnectionState>('idle');
  const connectionError = ref<string | null>(null);
  const connectedLogin = ref<string | null>(null);

  const owners = ref<GitHubOwner[]>([]);
  const ownerSuggestions = ref<GitHubOwner[]>([]);
  const selectedOwner = ref<GitHubOwner | null>(null);
  const ownersLoading = ref(false);
  const ownersError = ref<string | null>(null);

  const repositories = ref<GitHubRepository[]>([]);
  const repositorySuggestions = ref<GitHubRepository[]>([]);
  const selectedRepository = ref<GitHubRepository | null>(null);
  const repositoriesLoading = ref(false);
  const repositoriesError = ref<string | null>(null);

  const projects = ref<GitHubProject[]>([]);
  const projectSuggestions = ref<GitHubProject[]>([]);
  const selectedProject = ref<GitHubProject | null>(null);
  const projectsLoading = ref(false);
  const projectsError = ref<string | null>(null);

  const isConnected = computed(() => connectionState.value === 'connected');
  const selectedCandidateLabel = computed(() => {
    if (selectedRepository.value) return selectedRepository.value.fullName;
    if (selectedProject.value) return selectedProject.value.title;
    return null;
  });
  const selectedCandidateSource = computed(() => {
    if (selectedRepository.value) return 'GitHub repository';
    if (selectedProject.value) return 'GitHub Project V2';
    return 'Manual';
  });
  const providerReference = computed<GitHubProjectCreateReference | undefined>(() => {
    if (selectedRepository.value) {
      return createRepositoryReference(selectedRepository.value);
    }
    if (selectedProject.value) {
      return createProjectReference(selectedProject.value);
    }

    return undefined;
  });

  function notifyError(error: unknown, fallback: string): string {
    const message = getErrorMessage(error, fallback);
    options.onLoadError?.(error, message);

    return message;
  }

  function clearCandidateLists(): void {
    repositories.value = [];
    repositorySuggestions.value = [];
    projects.value = [];
    projectSuggestions.value = [];
    repositoriesError.value = null;
    projectsError.value = null;
  }

  function clearSelection(): void {
    selectedRepository.value = null;
    selectedProject.value = null;
  }

  async function loadRepositories(): Promise<void> {
    if (!selectedOwner.value) return;

    repositoriesLoading.value = true;
    repositoriesError.value = null;

    try {
      const response = await browsingClient.listRepositories(
        getOwnerScopedQuery(selectedOwner.value),
      );
      repositories.value = response.items;
      repositorySuggestions.value = response.items;
    } catch (error) {
      repositories.value = [];
      repositorySuggestions.value = [];
      repositoriesError.value = notifyError(
        error,
        'Failed to load GitHub repositories',
      );
    } finally {
      repositoriesLoading.value = false;
    }
  }

  async function loadProjects(): Promise<void> {
    if (!selectedOwner.value) return;

    projectsLoading.value = true;
    projectsError.value = null;

    try {
      const response = await browsingClient.listProjects(
        getOwnerScopedQuery(selectedOwner.value),
      );
      projects.value = response.items;
      projectSuggestions.value = response.items;
    } catch (error) {
      projects.value = [];
      projectSuggestions.value = [];
      projectsError.value = notifyError(
        error,
        'Failed to load GitHub Projects',
      );
    } finally {
      projectsLoading.value = false;
    }
  }

  async function loadCandidatesForSelectedOwner(): Promise<void> {
    clearSelection();
    clearCandidateLists();

    if (!selectedOwner.value) return;

    await Promise.all([loadRepositories(), loadProjects()]);
  }

  async function loadOwners(preferredLogin?: string | null): Promise<void> {
    ownersLoading.value = true;
    ownersError.value = null;

    try {
      const response = await browsingClient.listOwners({ type: 'all' });
      owners.value = response.items;
      ownerSuggestions.value = response.items;
      selectedOwner.value =
        response.items.find((owner) => owner.login === preferredLogin) ??
        response.items[0] ??
        null;
      await loadCandidatesForSelectedOwner();
    } catch (error) {
      owners.value = [];
      ownerSuggestions.value = [];
      selectedOwner.value = null;
      clearCandidateLists();
      ownersError.value = notifyError(error, 'Failed to load GitHub owners');
    } finally {
      ownersLoading.value = false;
    }
  }

  async function loadConnectionStatus(): Promise<void> {
    connectionState.value = 'loading';
    connectionError.value = null;
    connectedLogin.value = null;
    clearSelection();

    try {
      const response = await connectionClient.getConnectionStatus();

      if (response.status === 'disconnected') {
        connectionState.value = 'disconnected';
        owners.value = [];
        ownerSuggestions.value = [];
        selectedOwner.value = null;
        clearCandidateLists();
        return;
      }

      connectionState.value = 'connected';
      connectedLogin.value = response.account.login;
      await loadOwners(response.account.login);
    } catch (error) {
      connectionState.value = 'error';
      connectionError.value = notifyError(
        error,
        'Failed to load GitHub connection status',
      );
    }
  }

  function completeOwners(event: AutoCompleteCompleteEvent): void {
    ownerSuggestions.value = filterByQuery(
      owners.value,
      event.query,
      (owner) => `${owner.label} ${owner.login} ${owner.type}`,
    );
  }

  function completeRepositories(event: AutoCompleteCompleteEvent): void {
    repositorySuggestions.value = filterByQuery(
      repositories.value,
      event.query,
      (repository) => `${repository.fullName} ${repository.description ?? ''}`,
    );
  }

  function completeProjects(event: AutoCompleteCompleteEvent): void {
    projectSuggestions.value = filterByQuery(
      projects.value,
      event.query,
      (project) => `${project.title} ${project.owner} ${project.description ?? ''}`,
    );
  }

  async function selectOwner(value: AutoCompleteValue<GitHubOwner>): Promise<void> {
    if (!isOwner(value)) {
      if (value === null || value === '') {
        selectedOwner.value = null;
        clearSelection();
        clearCandidateLists();
      }

      return;
    }

    selectedOwner.value = value;
    await loadCandidatesForSelectedOwner();
  }

  function selectRepository(
    value: AutoCompleteValue<GitHubRepository>,
  ): string | null {
    if (!isRepository(value)) {
      if (value === null || value === '') selectedRepository.value = null;
      return null;
    }

    selectedRepository.value = value;
    selectedProject.value = null;

    return value.fullName;
  }

  function selectProject(value: AutoCompleteValue<GitHubProject>): string | null {
    if (!isProject(value)) {
      if (value === null || value === '') selectedProject.value = null;
      return null;
    }

    selectedProject.value = value;
    selectedRepository.value = null;

    return value.title;
  }

  return {
    clearSelection,
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
    owners,
    ownerSuggestions,
    ownersError,
    ownersLoading,
    projects,
    projectSuggestions,
    projectsError,
    projectsLoading,
    providerReference,
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
  };
}

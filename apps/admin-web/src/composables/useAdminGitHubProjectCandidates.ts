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

const DEFAULT_GITHUB_ORGANIZATION_LOGIN = 'ITSUA-team';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function filterByQuery<T>(
  items: T[],
  query: string,
  getText: TextGetter<T>,
): T[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) return [...items];

  return items.filter((item) =>
    getText(item).toLowerCase().includes(normalizedQuery),
  );
}

function createTypedOrganizationOwner(query: string): GitHubOwner | null {
  const login = query.trim();
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(login)) {
    return null;
  }

  return {
    avatarUrl: null,
    label: `Use ${login}`,
    login,
    type: 'organization',
    url: `https://github.com/${login}`,
  };
}

function createDefaultOrganizationOwner(): GitHubOwner {
  return {
    avatarUrl: null,
    label: DEFAULT_GITHUB_ORGANIZATION_LOGIN,
    login: DEFAULT_GITHUB_ORGANIZATION_LOGIN,
    type: 'organization',
    url: `https://github.com/${DEFAULT_GITHUB_ORGANIZATION_LOGIN}`,
  };
}

function isOwnerLogin(owner: GitHubOwner, login: string): boolean {
  return owner.login.toLowerCase() === login.toLowerCase();
}

function withDefaultOrganizationOwner(items: GitHubOwner[]): GitHubOwner[] {
  const defaultOwner = items.find((owner) =>
    isOwnerLogin(owner, DEFAULT_GITHUB_ORGANIZATION_LOGIN),
  );

  if (defaultOwner) {
    return [
      defaultOwner,
      ...items.filter((owner) => owner !== defaultOwner),
    ];
  }

  return [createDefaultOrganizationOwner(), ...items];
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
  return { ownerType: 'organization', owner: owner.login, limit: 100 };
}

function getOwnerDisplayLabel(owner: GitHubOwner): string {
  const suffix = owner.type === 'organization' ? 'organization' : 'personal';

  return `${owner.label} (${suffix})`;
}

function getOwnerSearchText(owner: GitHubOwner): string {
  return `${getOwnerDisplayLabel(owner)} ${owner.login} ${owner.type}`;
}

function isSelectedOwnerQuery(query: string, owner: GitHubOwner | null): boolean {
  if (!owner) return false;

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return false;

  return [getOwnerDisplayLabel(owner), owner.label, owner.login].some(
    (value) => value.toLowerCase() === normalizedQuery,
  );
}

function isSelectedRepositoryQuery(
  query: string,
  repository: GitHubRepository | null,
): boolean {
  if (!repository) return false;

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return false;

  return [repository.fullName, repository.name].some(
    (value) => value.toLowerCase() === normalizedQuery,
  );
}

function getProjectDisplayLabel(project: GitHubProject): string {
  return `${project.title} #${project.number}`;
}

function getProjectSearchText(project: GitHubProject): string {
  return `${getProjectDisplayLabel(project)} ${project.owner} ${project.description ?? ''}`;
}

function isSelectedProjectQuery(
  query: string,
  project: GitHubProject | null,
): boolean {
  if (!project) return false;

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return false;

  return [getProjectDisplayLabel(project), project.title, String(project.number)].some(
    (value) => value.toLowerCase() === normalizedQuery,
  );
}

function getInitialOwner(
  items: GitHubOwner[],
  preferredLogin?: string | null,
): GitHubOwner | null {
  const defaultOrganization = items.find((owner) =>
    isOwnerLogin(owner, DEFAULT_GITHUB_ORGANIZATION_LOGIN),
  );
  const preferredOrganization = items.find(
    (owner) => owner.type === 'organization' && owner.login === preferredLogin,
  );
  const firstOrganization = items.find((owner) => owner.type === 'organization');

  return defaultOrganization ?? preferredOrganization ?? firstOrganization ?? null;
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
  const ownerFieldValue = ref<AutoCompleteValue<GitHubOwner>>(null);
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
      const response = await browsingClient.listOwners({ type: 'organization' });
      const organizationOwners = withDefaultOrganizationOwner(
        response.items.filter((owner) => owner.type === 'organization'),
      );
      owners.value = organizationOwners;
      ownerSuggestions.value = organizationOwners;
      selectedOwner.value = getInitialOwner(organizationOwners, preferredLogin);
      ownerFieldValue.value = selectedOwner.value;
      await loadCandidatesForSelectedOwner();
    } catch (error) {
      owners.value = [];
      ownerFieldValue.value = null;
      ownerSuggestions.value = [];
      selectedOwner.value = null;
      clearCandidateLists();
      ownersError.value = notifyError(error, 'Failed to load GitHub organizations');
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
        ownerFieldValue.value = null;
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
    if (isSelectedOwnerQuery(event.query, selectedOwner.value)) {
      ownerSuggestions.value = selectedOwner.value
        ? [
            selectedOwner.value,
            ...owners.value.filter(
              (owner) => owner.login !== selectedOwner.value?.login,
            ),
          ]
        : [...owners.value];
      return;
    }

    const suggestions = filterByQuery(
      owners.value,
      event.query,
      getOwnerSearchText,
    );
    const typedOwner = createTypedOrganizationOwner(event.query);

    if (
      typedOwner &&
      !suggestions.some(
        (owner) => owner.login.toLowerCase() === typedOwner.login.toLowerCase(),
      )
    ) {
      suggestions.push(typedOwner);
    }

    ownerSuggestions.value = suggestions;
  }

  function completeRepositories(event: AutoCompleteCompleteEvent): void {
    if (isSelectedRepositoryQuery(event.query, selectedRepository.value)) {
      repositorySuggestions.value = [...repositories.value];
      return;
    }

    repositorySuggestions.value = filterByQuery(
      repositories.value,
      event.query,
      (repository) => `${repository.fullName} ${repository.description ?? ''}`,
    );
  }

  function completeProjects(event: AutoCompleteCompleteEvent): void {
    if (isSelectedProjectQuery(event.query, selectedProject.value)) {
      projectSuggestions.value = [...projects.value];
      return;
    }

    projectSuggestions.value = filterByQuery(
      projects.value,
      event.query,
      getProjectSearchText,
    );
  }

  async function selectOwner(value: AutoCompleteValue<GitHubOwner>): Promise<void> {
    ownerFieldValue.value = value;

    if (typeof value === 'string') {
      if (selectedOwner.value && !isSelectedOwnerQuery(value, selectedOwner.value)) {
        selectedOwner.value = null;
        clearSelection();
        clearCandidateLists();
      }

      return;
    }

    if (!isOwner(value) || value.type !== 'organization') {
      ownerFieldValue.value = null;
      selectedOwner.value = null;
      clearSelection();
      clearCandidateLists();

      return;
    }

    ownerFieldValue.value = value;
    selectedOwner.value = value;
    await loadCandidatesForSelectedOwner();
  }

  function selectRepository(
    value: AutoCompleteValue<GitHubRepository>,
  ): string | null {
    if (!isRepository(value)) {
      clearSelection();
      return null;
    }

    selectedRepository.value = value;
    selectedProject.value = null;

    return value.fullName;
  }

  function selectProject(value: AutoCompleteValue<GitHubProject>): string | null {
    if (!isProject(value)) {
      clearSelection();
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
    ownerFieldValue,
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

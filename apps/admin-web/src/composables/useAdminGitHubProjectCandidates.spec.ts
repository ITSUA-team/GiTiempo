import { describe, expect, it, vi } from 'vitest';
import type { GitHubOwner, GitHubProject, GitHubRepository } from '@gitiempo/shared';

import { useAdminGitHubProjectCandidates } from './useAdminGitHubProjectCandidates';

const personalOwner: GitHubOwner = {
  avatarUrl: null,
  label: 'octocat',
  login: 'octocat',
  type: 'personal',
  url: 'https://github.com/octocat',
};

const organizationOwner: GitHubOwner = {
  avatarUrl: null,
  label: 'Octo Org',
  login: 'octo-org',
  type: 'organization',
  url: 'https://github.com/octo-org',
};

const defaultOrganizationOwner: GitHubOwner = {
  avatarUrl: null,
  label: 'ITSUA-team',
  login: 'ITSUA-team',
  type: 'organization',
  url: 'https://github.com/ITSUA-team',
};

const repository: GitHubRepository = {
  description: null,
  fullName: 'octo-org/repo',
  id: '123',
  isArchived: false,
  name: 'repo',
  nodeId: 'R_kwDO',
  owner: 'octo-org',
  updatedAt: '2026-05-02T10:00:00.000Z',
  url: 'https://github.com/octo-org/repo',
  visibility: 'private',
};

const secondRepository: GitHubRepository = {
  description: 'Second repository',
  fullName: 'octo-org/web',
  id: '456',
  isArchived: false,
  name: 'web',
  nodeId: 'R_kwDO_web',
  owner: 'octo-org',
  updatedAt: '2026-05-04T10:00:00.000Z',
  url: 'https://github.com/octo-org/web',
  visibility: 'private',
};

const project: GitHubProject = {
  description: null,
  id: 'PVT_kwDO',
  number: 7,
  owner: 'octo-org',
  state: 'open',
  title: 'Roadmap',
  updatedAt: '2026-05-03T10:00:00.000Z',
  url: 'https://github.com/orgs/octo-org/projects/7',
};

const secondProject: GitHubProject = {
  description: 'Delivery work',
  id: 'PVT_second',
  number: 8,
  owner: 'octo-org',
  state: 'open',
  title: 'Delivery',
  updatedAt: '2026-05-04T10:00:00.000Z',
  url: 'https://github.com/orgs/octo-org/projects/8',
};

function createCandidates(
  owners: GitHubOwner[] = [personalOwner, organizationOwner],
  repositoryItems: GitHubRepository[] = [repository],
  projectItems: GitHubProject[] = [project],
) {
  const browsingClient = {
    listOwners: vi.fn().mockResolvedValue({ items: owners }),
    listProjects: vi.fn().mockResolvedValue({
      items: projectItems,
      pagination: { hasNextPage: false, limit: 100, nextPageToken: null },
    }),
    listRepositories: vi.fn().mockResolvedValue({
      items: repositoryItems,
      pagination: { hasNextPage: false, limit: 100, nextPageToken: null },
    }),
  };
  const connectionClient = {
    getConnectionStatus: vi.fn().mockResolvedValue({
      account: {
        avatarUrl: null,
        connectedAt: '2026-05-01T10:00:00.000Z',
        githubUserId: '123',
        login: 'octocat',
        updatedAt: '2026-05-01T10:00:00.000Z',
      },
      status: 'connected' as const,
    }),
  };

  return {
    browsingClient,
    connectionClient,
    state: useAdminGitHubProjectCandidates({ browsingClient, connectionClient }),
  };
}

function createDeferred<T>() {
  // eslint-disable-next-line no-unused-vars
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

describe('useAdminGitHubProjectCandidates', () => {
  it('loads organization owners instead of the connected personal account', async () => {
    const { browsingClient, state } = createCandidates();

    await state.loadConnectionStatus();

    expect(browsingClient.listOwners).toHaveBeenCalledWith({
      type: 'organization',
    });
    expect(state.owners.value).toEqual([
      defaultOrganizationOwner,
      organizationOwner,
    ]);
    expect(state.ownerFieldValue.value).toEqual(defaultOrganizationOwner);
    expect(state.ownerSuggestions.value).toEqual([
      defaultOrganizationOwner,
      organizationOwner,
    ]);
    expect(state.selectedOwner.value).toEqual(defaultOrganizationOwner);
    expect(browsingClient.listRepositories).toHaveBeenCalledWith({
      limit: 100,
      owner: 'ITSUA-team',
      ownerType: 'organization',
    });
    expect(browsingClient.listProjects).toHaveBeenCalledWith({
      limit: 100,
      owner: 'ITSUA-team',
      ownerType: 'organization',
    });
  });

  it('ignores personal owners returned from the browsing client', async () => {
    const { browsingClient, state } = createCandidates();

    await state.loadOwners('octocat');
    state.completeOwners({ query: '' });

    expect(state.ownerSuggestions.value).toEqual([
      defaultOrganizationOwner,
      organizationOwner,
    ]);

    await state.selectOwner(personalOwner);

    expect(state.selectedOwner.value).toBeNull();
    expect(state.ownerFieldValue.value).toBeNull();
    expect(browsingClient.listRepositories).toHaveBeenLastCalledWith({
      limit: 100,
      owner: 'ITSUA-team',
      ownerType: 'organization',
    });
    expect(browsingClient.listProjects).toHaveBeenLastCalledWith({
      limit: 100,
      owner: 'ITSUA-team',
      ownerType: 'organization',
    });
  });

  it('shows all GitHub options for empty autocomplete queries', async () => {
    const { state } = createCandidates(
      [personalOwner, organizationOwner],
      [repository, secondRepository],
      [project, secondProject],
    );

    await state.loadOwners('octocat');

    state.ownerSuggestions.value = [];
    state.repositorySuggestions.value = [];
    state.projectSuggestions.value = [];

    state.completeOwners({ query: '' });
    state.completeRepositories({ query: '' });
    state.completeProjects({ query: '' });

    expect(state.ownerSuggestions.value).toEqual([
      defaultOrganizationOwner,
      organizationOwner,
    ]);
    expect(state.repositorySuggestions.value).toEqual([
      repository,
      secondRepository,
    ]);
    expect(state.projectSuggestions.value).toEqual([project, secondProject]);
  });

  it('defaults to ITSUA-team when GitHub returns no owners', async () => {
    const { browsingClient, state } = createCandidates([]);

    await state.loadOwners('octocat');

    expect(state.owners.value).toEqual([defaultOrganizationOwner]);
    expect(state.selectedOwner.value).toEqual(defaultOrganizationOwner);
    expect(browsingClient.listRepositories).toHaveBeenLastCalledWith({
      limit: 100,
      owner: 'ITSUA-team',
      ownerType: 'organization',
    });
    expect(browsingClient.listProjects).toHaveBeenLastCalledWith({
      limit: 100,
      owner: 'ITSUA-team',
      ownerType: 'organization',
    });

    state.completeOwners({ query: 'ITSUA' });

    expect(state.ownerSuggestions.value).toEqual([
      defaultOrganizationOwner,
      {
        avatarUrl: null,
        label: 'Use ITSUA',
        login: 'ITSUA',
        type: 'organization',
        url: 'https://github.com/ITSUA',
      },
    ]);

    await state.selectOwner(state.ownerSuggestions.value[1] ?? null);

    expect(state.selectedOwner.value?.login).toBe('ITSUA');
    state.ownerSuggestions.value = [];
    state.completeOwners({ query: 'Use ITSUA (organization)' });
    expect(state.ownerSuggestions.value[0]?.login).toBe('ITSUA');
    expect(browsingClient.listRepositories).toHaveBeenLastCalledWith({
      limit: 100,
      owner: 'ITSUA',
      ownerType: 'organization',
    });
    expect(browsingClient.listProjects).toHaveBeenLastCalledWith({
      limit: 100,
      owner: 'ITSUA',
      ownerType: 'organization',
    });
  });

  it('does not treat raw typed owner input as a selected owner', async () => {
    const { browsingClient, state } = createCandidates([]);

    await state.loadOwners('octocat');
    const repositoryCallCount = browsingClient.listRepositories.mock.calls.length;
    const projectCallCount = browsingClient.listProjects.mock.calls.length;

    await state.selectOwner('ITSUA');

    expect(state.ownerFieldValue.value).toBe('ITSUA');
    expect(state.selectedOwner.value).toBeNull();
    expect(browsingClient.listRepositories).toHaveBeenCalledTimes(
      repositoryCallCount,
    );
    expect(browsingClient.listProjects).toHaveBeenCalledTimes(projectCallCount);
  });

  it('keeps all GitHub candidates visible when completing selected candidate labels', async () => {
    const { state } = createCandidates(
      [personalOwner, organizationOwner],
      [repository, secondRepository],
      [project, secondProject],
    );

    await state.loadOwners('octocat');

    state.selectRepository(repository);
    state.completeRepositories({ query: repository.fullName });

    expect(state.repositorySuggestions.value).toEqual([
      repository,
      secondRepository,
    ]);

    state.selectProject(project);
    state.completeProjects({ query: 'Roadmap #7' });

    expect(state.projectSuggestions.value).toEqual([project, secondProject]);
  });

  it('clears selected provider references when candidate fields receive raw text', async () => {
    const { state } = createCandidates();

    await state.loadOwners('octocat');

    state.selectRepository(repository);
    expect(state.providerReference.value).toEqual(
      expect.objectContaining({ externalKey: 'octo-org/repo' }),
    );

    state.selectRepository('octo-org/edited');
    expect(state.selectedRepository.value).toBeNull();
    expect(state.selectedCandidateLabel.value).toBeNull();
    expect(state.providerReference.value).toBeUndefined();

    state.selectProject(project);
    expect(state.providerReference.value).toEqual(
      expect.objectContaining({ externalKey: 'PVT_kwDO' }),
    );

    state.selectProject('Roadmap edited');
    expect(state.selectedProject.value).toBeNull();
    expect(state.selectedCandidateLabel.value).toBeNull();
    expect(state.providerReference.value).toBeUndefined();
  });

  it('keeps the latest owner candidates when earlier loads resolve later', async () => {
    const { browsingClient, state } = createCandidates();

    await state.loadOwners('octocat');

    const staleRepositories = createDeferred<{
      items: GitHubRepository[];
      pagination: { hasNextPage: boolean; limit: number; nextPageToken: string | null };
    }>();
    const staleProjects = createDeferred<{
      items: GitHubProject[];
      pagination: { hasNextPage: boolean; limit: number; nextPageToken: string | null };
    }>();
    const latestRepositories = createDeferred<{
      items: GitHubRepository[];
      pagination: { hasNextPage: boolean; limit: number; nextPageToken: string | null };
    }>();
    const latestProjects = createDeferred<{
      items: GitHubProject[];
      pagination: { hasNextPage: boolean; limit: number; nextPageToken: string | null };
    }>();

    browsingClient.listRepositories
      .mockReturnValueOnce(staleRepositories.promise)
      .mockReturnValueOnce(latestRepositories.promise);
    browsingClient.listProjects
      .mockReturnValueOnce(staleProjects.promise)
      .mockReturnValueOnce(latestProjects.promise);

    const staleSelection = state.selectOwner(organizationOwner);
    const latestSelection = state.selectOwner(defaultOrganizationOwner);

    latestRepositories.resolve({
      items: [secondRepository],
      pagination: { hasNextPage: false, limit: 100, nextPageToken: null },
    });
    latestProjects.resolve({
      items: [secondProject],
      pagination: { hasNextPage: false, limit: 100, nextPageToken: null },
    });
    await latestSelection;

    staleRepositories.resolve({
      items: [repository],
      pagination: { hasNextPage: false, limit: 100, nextPageToken: null },
    });
    staleProjects.resolve({
      items: [project],
      pagination: { hasNextPage: false, limit: 100, nextPageToken: null },
    });
    await staleSelection;

    expect(state.selectedOwner.value).toEqual(defaultOrganizationOwner);
    expect(state.repositories.value).toEqual([secondRepository]);
    expect(state.repositorySuggestions.value).toEqual([secondRepository]);
    expect(state.projects.value).toEqual([secondProject]);
    expect(state.projectSuggestions.value).toEqual([secondProject]);
    expect(state.repositoriesLoading.value).toBe(false);
    expect(state.projectsLoading.value).toBe(false);
  });
});

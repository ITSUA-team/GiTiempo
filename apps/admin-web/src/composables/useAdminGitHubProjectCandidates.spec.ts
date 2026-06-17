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

describe('useAdminGitHubProjectCandidates', () => {
  it('prefers an organization owner when connected GitHub owners include one', async () => {
    const { browsingClient, state } = createCandidates();

    await state.loadConnectionStatus();

    expect(state.selectedOwner.value).toEqual(organizationOwner);
    expect(browsingClient.listRepositories).toHaveBeenCalledWith({
      limit: 100,
      owner: 'octo-org',
      ownerType: 'organization',
    });
    expect(browsingClient.listProjects).toHaveBeenCalledWith({
      limit: 100,
      owner: 'octo-org',
      ownerType: 'organization',
    });
  });

  it('keeps all owners reachable when completing a selected personal owner label', async () => {
    const { state } = createCandidates();

    await state.loadOwners('octocat');
    await state.selectOwner(personalOwner);
    state.completeOwners({ query: 'octocat (personal)' });

    expect(state.ownerSuggestions.value).toEqual([
      personalOwner,
      organizationOwner,
    ]);
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
      personalOwner,
      organizationOwner,
    ]);
    expect(state.repositorySuggestions.value).toEqual([
      repository,
      secondRepository,
    ]);
    expect(state.projectSuggestions.value).toEqual([project, secondProject]);
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
});

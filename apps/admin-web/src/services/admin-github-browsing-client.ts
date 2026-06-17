import {
  createGitHubBrowsingClient,
  type GitHubBrowsingClient,
} from '@gitiempo/web-shared/github-browsing-client';

import { getAuthenticatedAppApiClient } from '@/services/api-client';

function createDefaultGitHubBrowsingClient(): GitHubBrowsingClient {
  return createGitHubBrowsingClient({
    apiClient: getAuthenticatedAppApiClient(),
  });
}

export const adminGitHubBrowsingClient: GitHubBrowsingClient = {
  listOwners(query) {
    return createDefaultGitHubBrowsingClient().listOwners(query);
  },
  listProjectIssues(projectId, query) {
    return createDefaultGitHubBrowsingClient().listProjectIssues(
      projectId,
      query,
    );
  },
  listProjects(query) {
    return createDefaultGitHubBrowsingClient().listProjects(query);
  },
  listRepositories(query) {
    return createDefaultGitHubBrowsingClient().listRepositories(query);
  },
  listRepositoryIssues(owner, repo, query) {
    return createDefaultGitHubBrowsingClient().listRepositoryIssues(
      owner,
      repo,
      query,
    );
  },
};

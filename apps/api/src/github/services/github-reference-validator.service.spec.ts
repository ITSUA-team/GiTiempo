import { UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../auth/types/auth-user';
import { GithubReferenceValidatorService } from './github-reference-validator.service';

const user: AuthUser = {
  email: 'user@example.com',
  firebaseUid: 'firebase-user',
  role: 'member',
  sub: 'user-1',
  workspaceId: 'workspace-1',
};

const repository = {
  description: 'Repository project',
  fullName: 'octo-org/repo',
  id: '123',
  isArchived: false,
  name: 'repo',
  nodeId: 'R_kwDO',
  owner: 'octo-org',
  updatedAt: '2026-05-14T12:00:00.000Z',
  url: 'https://github.com/octo-org/repo',
  visibility: 'private' as const,
};

const issue = {
  id: '456',
  nodeId: 'I_kwDO',
  number: 42,
  repository: {
    fullName: 'octo-org/repo',
    name: 'repo',
    owner: 'octo-org',
  },
  state: 'open' as const,
  title: 'Track project work',
  updatedAt: '2026-05-15T12:00:00.000Z',
  url: 'https://github.com/octo-org/repo/issues/42',
};

function createService() {
  const connections = {
    getValidAccessToken: vi.fn().mockResolvedValue('access-token'),
  };
  const apiClient = {
    getProject: vi.fn(),
    getProjectIssueItem: vi.fn(),
    getRepository: vi.fn(),
    getRepositoryIssue: vi.fn(),
  };
  const service = new GithubReferenceValidatorService(
    connections as never,
    apiClient as never,
  );

  return { apiClient, connections, service };
}

describe('GithubReferenceValidatorService', () => {
  it('normalizes repository references from the GitHub API response', async () => {
    const { apiClient, connections, service } = createService();
    apiClient.getRepository.mockResolvedValue(repository);

    const result = await service.validateProjectReference(user, {
      externalId: '123',
      externalKey: 'OCTO-ORG/REPO',
      externalType: 'repository',
      externalUrl: 'https://github.com/octo-org/repo',
      metadata: { description: 'client-supplied stale copy' },
      provider: 'github',
    });

    expect(connections.getValidAccessToken).toHaveBeenCalledWith(user.sub);
    expect(apiClient.getRepository).toHaveBeenCalledWith({
      accessToken: 'access-token',
      owner: 'OCTO-ORG',
      repo: 'REPO',
    });
    expect(result).toEqual({
      externalId: repository.id,
      externalKey: repository.fullName,
      externalType: 'repository',
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
      provider: 'github',
    });
  });

  it('rejects project references that do not match the validated source', async () => {
    const { apiClient, service } = createService();
    apiClient.getRepository.mockResolvedValue(repository);

    await expect(
      service.validateProjectReference(user, {
        externalId: '999',
        externalKey: 'octo-org/repo',
        externalType: 'repository',
        externalUrl: 'https://github.com/octo-org/repo',
        provider: 'github',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('normalizes repository issue references from the GitHub API response', async () => {
    const { apiClient, service } = createService();
    apiClient.getRepositoryIssue.mockResolvedValue(issue);

    const result = await service.validateIssueReference(user, {
      externalId: issue.id,
      externalKey: 'octo-org/repo#42',
      externalType: 'issue',
      externalUrl: issue.url,
      metadata: { title: 'client title' },
      provider: 'github',
      sourceType: 'repository_issue',
    });

    expect(apiClient.getRepositoryIssue).toHaveBeenCalledWith({
      accessToken: 'access-token',
      issueNumber: 42,
      owner: 'octo-org',
      repo: 'repo',
    });
    expect(result).toEqual({
      externalId: issue.id,
      externalKey: 'octo-org/repo#42',
      externalType: 'issue',
      externalUrl: issue.url,
      metadata: {
        nodeId: issue.nodeId,
        number: issue.number,
        projectId: null,
        repository: issue.repository.fullName,
        state: issue.state,
        title: issue.title,
        updatedAt: issue.updatedAt,
      },
      provider: 'github',
      sourceType: 'repository_issue',
    });
  });

  it('normalizes Project V2 issue item references from the GitHub API response', async () => {
    const { apiClient, service } = createService();
    apiClient.getProjectIssueItem.mockResolvedValue({
      item: { isArchived: false, issue, projectItemId: 'PVTI_kwDO' },
      projectId: 'PVT_kwDO',
    });

    const result = await service.validateIssueReference(user, {
      externalId: issue.id,
      externalKey: 'octo-org/repo#42',
      externalType: 'issue',
      externalUrl: issue.url,
      metadata: { projectId: 'PVT_kwDO' },
      projectItemId: 'PVTI_kwDO',
      provider: 'github',
      sourceType: 'project_v2_issue_item',
    });

    expect(apiClient.getProjectIssueItem).toHaveBeenCalledWith({
      accessToken: 'access-token',
      projectItemId: 'PVTI_kwDO',
    });
    expect(result).toEqual({
      externalId: issue.id,
      externalKey: 'octo-org/repo#42',
      externalType: 'issue',
      externalUrl: issue.url,
      metadata: {
        nodeId: issue.nodeId,
        number: issue.number,
        projectId: 'PVT_kwDO',
        repository: issue.repository.fullName,
        state: issue.state,
        title: issue.title,
        updatedAt: issue.updatedAt,
      },
      projectItemId: 'PVTI_kwDO',
      provider: 'github',
      sourceType: 'project_v2_issue_item',
    });
  });
});

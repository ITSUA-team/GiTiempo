import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import type {
  GitHubIssue,
  GitHubIssueCreateReference,
  GitHubProject,
  GitHubProjectCreateReference,
  GitHubProjectRepositoryCreateReference,
  GitHubProjectV2CreateReference,
  GitHubRepository,
} from '@gitiempo/shared';
import type { AuthUser } from '../../auth/types/auth-user';
import { parseGitHubIssueExternalKey } from '../github-issue-external-key';
import { GithubApiClientService } from './github-api-client.service';
import { GithubConnectionsService } from './github-connections.service';

const INVALID_REFERENCE_MESSAGE =
  'GitHub provider reference does not match the validated source';

@Injectable()
export class GithubReferenceValidatorService {
  constructor(
    private readonly connections: GithubConnectionsService,
    private readonly apiClient: GithubApiClientService,
  ) {}

  async validateProjectReference(
    user: AuthUser,
    reference: GitHubProjectCreateReference,
  ): Promise<GitHubProjectCreateReference> {
    const accessToken = await this.connections.getValidAccessToken(user.sub);

    if (reference.externalType === 'repository') {
      const { owner, repo } = this.parseRepositoryKey(reference.externalKey);
      const repository = await this.apiClient.getRepository({
        accessToken,
        owner,
        repo,
      });

      this.assertSameRepositoryReference(reference, repository);
      return this.toRepositoryReference(repository);
    }

    const project = await this.apiClient.getProject({
      accessToken,
      projectId: reference.externalId ?? reference.externalKey,
    });

    this.assertSameProjectReference(reference, project);
    return this.toProjectReference(project);
  }

  async validateIssueReference(
    user: AuthUser,
    reference: GitHubIssueCreateReference,
  ): Promise<GitHubIssueCreateReference> {
    const accessToken = await this.connections.getValidAccessToken(user.sub);

    if (reference.sourceType === 'project_v2_issue_item') {
      const result = await this.apiClient.getProjectIssueItem({
        accessToken,
        projectItemId: reference.projectItemId,
      });

      this.assertSameIssueReference(reference, result.item.issue);
      if (
        reference.metadata?.projectId !== undefined &&
        reference.metadata.projectId !== result.projectId
      ) {
        throw new UnprocessableEntityException(INVALID_REFERENCE_MESSAGE);
      }

      return this.toProjectIssueItemReference(
        result.item.issue,
        result.projectId,
        result.item.projectItemId,
      );
    }

    const issueKey = parseGitHubIssueExternalKey(reference.externalKey);
    if (!issueKey) {
      throw new UnprocessableEntityException(INVALID_REFERENCE_MESSAGE);
    }

    const { owner, repo } = this.parseRepositoryKey(issueKey.githubRepo);
    const issue = await this.apiClient.getRepositoryIssue({
      accessToken,
      issueNumber: issueKey.issueNumber,
      owner,
      repo,
    });

    this.assertSameIssueReference(reference, issue);
    return this.toRepositoryIssueReference(issue);
  }

  private parseRepositoryKey(value: string): { owner: string; repo: string } {
    const [owner, repo, ...extra] = value.split('/');
    if (!owner || !repo || extra.length > 0) {
      throw new UnprocessableEntityException(INVALID_REFERENCE_MESSAGE);
    }

    return { owner, repo };
  }

  private assertSameRepositoryReference(
    reference: GitHubProjectRepositoryCreateReference,
    repository: GitHubRepository,
  ): void {
    this.assertSameText(reference.externalKey, repository.fullName);
    this.assertOptionalSameText(reference.externalId, repository.id);
    this.assertSameText(reference.externalUrl, repository.url);
  }

  private assertSameProjectReference(
    reference: GitHubProjectV2CreateReference,
    project: GitHubProject,
  ): void {
    this.assertSameText(reference.externalKey, project.id, false);
    this.assertOptionalSameText(reference.externalId, project.id, false);
    if (reference.externalUrl !== null && project.url !== null) {
      this.assertSameText(reference.externalUrl, project.url, false);
    }
  }

  private assertSameIssueReference(
    reference: GitHubIssueCreateReference,
    issue: GitHubIssue,
  ): void {
    this.assertSameText(
      reference.externalKey,
      `${issue.repository.fullName}#${issue.number}`,
    );
    this.assertOptionalSameText(reference.externalId, issue.id, false);
    this.assertSameText(reference.externalUrl, issue.url, false);
  }

  private assertSameText(
    actual: string,
    expected: string,
    ignoreCase = true,
  ): void {
    const matches = ignoreCase
      ? actual.toLowerCase() === expected.toLowerCase()
      : actual === expected;
    if (!matches) {
      throw new UnprocessableEntityException(INVALID_REFERENCE_MESSAGE);
    }
  }

  private assertOptionalSameText(
    actual: string | null | undefined,
    expected: string,
    ignoreCase = true,
  ): void {
    if (actual === undefined || actual === null) return;
    this.assertSameText(actual, expected, ignoreCase);
  }

  private toRepositoryReference(
    repository: GitHubRepository,
  ): GitHubProjectCreateReference {
    return {
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
    };
  }

  private toProjectReference(
    project: GitHubProject,
  ): GitHubProjectCreateReference {
    return {
      externalId: project.id,
      externalKey: project.id,
      externalType: 'project_v2',
      externalUrl: project.url,
      metadata: {
        description: project.description,
        number: project.number,
        owner: project.owner,
        state: project.state,
        title: project.title,
        updatedAt: project.updatedAt,
      },
      provider: 'github',
    };
  }

  private toRepositoryIssueReference(
    issue: GitHubIssue,
  ): GitHubIssueCreateReference {
    return {
      externalId: issue.id,
      externalKey: `${issue.repository.fullName}#${issue.number}`,
      externalType: 'issue',
      externalUrl: issue.url,
      metadata: this.toIssueMetadata(issue, null),
      provider: 'github',
      sourceType: 'repository_issue',
    };
  }

  private toProjectIssueItemReference(
    issue: GitHubIssue,
    projectId: string,
    projectItemId: string,
  ): GitHubIssueCreateReference {
    return {
      externalId: issue.id,
      externalKey: `${issue.repository.fullName}#${issue.number}`,
      externalType: 'issue',
      externalUrl: issue.url,
      metadata: this.toIssueMetadata(issue, projectId),
      projectItemId,
      provider: 'github',
      sourceType: 'project_v2_issue_item',
    };
  }

  private toIssueMetadata(
    issue: GitHubIssue,
    projectId: string | null,
  ): NonNullable<GitHubIssueCreateReference['metadata']> {
    return {
      nodeId: issue.nodeId,
      number: issue.number,
      projectId,
      repository: issue.repository.fullName,
      state: issue.state,
      title: issue.title,
      updatedAt: issue.updatedAt,
    };
  }
}

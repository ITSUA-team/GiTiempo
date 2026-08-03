import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type {
  ImportGitHubProjectsInput,
  ImportGitHubProjectsResponse,
  ImportedGitHubProject,
  ProjectGitHubProjectListResponse,
  ImportGitHubRepositoriesInput,
  ImportGitHubRepositoriesResponse,
  ImportedGitHubRepository,
  ProjectGitHubRepositoryListResponse,
} from '@gitiempo/shared';
import type { AuthUser } from '../../auth/types/auth-user';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import { parseGitHubRepoKey } from '../../github/github-repo-key';
import { GithubService } from '../../github/services/github.service';
import { WorkspaceGitHubOrganizationsService } from '../../github/services/workspace-github-organizations.service';
import { MembersService } from '../../members/services/members.service';
import { GithubTaskMaterializationService } from '../../tasks/services/github-task-materialization.service';
import { projectExternalRefs } from '../../projects/schemas/project-external-refs.schema';
import { projects } from '../../projects/schemas/projects.schema';

@Injectable()
export class ProjectImportsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly members: MembersService,
    private readonly github: GithubService,
    private readonly githubTasks: GithubTaskMaterializationService,
    private readonly organizations: WorkspaceGitHubOrganizationsService,
  ) {}

  async listImportedGitHubProjects(
    user: AuthUser,
  ): Promise<ProjectGitHubProjectListResponse> {
    await this.members.requireRole(user.sub, user.workspaceId, ['admin', 'pm']);

    const rows = await this.db
      .select({
        externalKey: projectExternalRefs.externalKey,
        externalType: projectExternalRefs.externalType,
        projectId: projectExternalRefs.projectId,
        projectIsActive: projects.isActive,
      })
      .from(projectExternalRefs)
      .innerJoin(projects, eq(projects.id, projectExternalRefs.projectId))
      .where(
        and(
          eq(projectExternalRefs.workspaceId, user.workspaceId),
          eq(projectExternalRefs.provider, 'github'),
        ),
      );

    const repositoryByProject = new Map(
      rows
        .filter((row) => row.externalType === 'repository')
        .map((row) => [row.projectId, row.externalKey]),
    );

    return {
      items: rows
        .filter((row) => row.externalType === 'project')
        .map((row) => ({
          githubProjectId: row.externalKey,
          linkedRepository: repositoryByProject.get(row.projectId) ?? null,
          projectId: row.projectId,
          projectIsActive: row.projectIsActive,
        })),
    };
  }

  async importGitHubProjects(
    user: AuthUser,
    input: ImportGitHubProjectsInput,
  ): Promise<ImportGitHubProjectsResponse> {
    await this.members.requireRole(user.sub, user.workspaceId, ['admin', 'pm']);

    const results: ImportedGitHubProject[] = [];

    for (const board of input.githubProjects) {
      results.push(await this.importBoard(user, board));
    }

    return { results };
  }

  private async importBoard(
    user: AuthUser,
    board: ImportGitHubProjectsInput['githubProjects'][number],
  ): Promise<ImportedGitHubProject> {
    try {
      await this.organizations.assertOrganizationAllowed(
        user.workspaceId,
        board.owner,
      );

      const repository =
        board.githubRepos.length === 1
          ? await this.resolveRepository(user, board.githubRepos[0]!)
          : null;

      const existing = await this.db
        .select({ projectId: projectExternalRefs.projectId })
        .from(projectExternalRefs)
        .where(
          and(
            eq(projectExternalRefs.workspaceId, user.workspaceId),
            eq(projectExternalRefs.provider, 'github'),
            eq(projectExternalRefs.externalType, 'project'),
            eq(projectExternalRefs.externalKey, board.githubProjectId),
          ),
        )
        .limit(1);

      if (existing[0]) {
        return {
          githubProjectId: board.githubProjectId,
          linkedRepository: repository,
          message: null,
          projectId: existing[0].projectId,
          status: 'already-imported',
        };
      }

      const projectId = await this.db.transaction(async (tx) => {
        const [project] = await tx
          .insert(projects)
          .values({
            workspaceId: user.workspaceId,
            name: `${board.owner}/${board.title}`,
            color: null,
          })
          .returning({ id: projects.id });

        const [ref] = await tx
          .insert(projectExternalRefs)
          .values({
            workspaceId: user.workspaceId,
            projectId: project!.id,
            provider: 'github',
            externalType: 'project',
            externalKey: board.githubProjectId,
            externalUrl: board.url,
            metadata: {
              githubProjectNumber: board.number,
              githubProjectOwner: board.owner,
              githubProjectTitle: board.title,
            },
            syncedAt: new Date(),
          })
          .onConflictDoNothing({
            target: [
              projectExternalRefs.workspaceId,
              projectExternalRefs.provider,
              projectExternalRefs.externalType,
              projectExternalRefs.externalKey,
            ],
          })
          .returning({ projectId: projectExternalRefs.projectId });

        if (!ref) {
          await tx.delete(projects).where(eq(projects.id, project!.id));
          return null;
        }

        if (repository !== null) {
          await tx
            .insert(projectExternalRefs)
            .values({
              workspaceId: user.workspaceId,
              projectId: project!.id,
              provider: 'github',
              externalType: 'repository',
              externalKey: repository,
              externalUrl: `https://github.com/${repository}`,
              metadata: { githubRepo: repository },
              syncedAt: new Date(),
            })
            .onConflictDoNothing({
              target: [
                projectExternalRefs.workspaceId,
                projectExternalRefs.provider,
                projectExternalRefs.externalType,
                projectExternalRefs.externalKey,
              ],
            });
        }

        return project!.id;
      });

      if (projectId === null) {
        return {
          githubProjectId: board.githubProjectId,
          linkedRepository: repository,
          message: null,
          projectId: null,
          status: 'already-imported',
        };
      }

      return {
        githubProjectId: board.githubProjectId,
        linkedRepository: repository,
        message: null,
        projectId,
        status: 'imported',
      };
    } catch (error) {
      return {
        githubProjectId: board.githubProjectId,
        linkedRepository: null,
        message: toImportFailureMessage(error),
        projectId: null,
        status: 'failed',
      };
    }
  }

  private async resolveRepository(
    user: AuthUser,
    githubRepo: string,
  ): Promise<string | null> {
    const parts = parseGitHubRepoKey(githubRepo);

    if (!parts) {
      return null;
    }

    const repository = await this.github.getRepository(
      user,
      parts.owner,
      parts.repo,
    );

    return repository.fullName;
  }

  async listImportedGitHubRepositories(
    user: AuthUser,
  ): Promise<ProjectGitHubRepositoryListResponse> {
    await this.members.requireRole(user.sub, user.workspaceId, ['admin', 'pm']);

    const rows = await this.db
      .select({
        githubRepo: projectExternalRefs.externalKey,
        projectId: projectExternalRefs.projectId,
        projectIsActive: projects.isActive,
      })
      .from(projectExternalRefs)
      .innerJoin(projects, eq(projects.id, projectExternalRefs.projectId))
      .where(
        and(
          eq(projectExternalRefs.workspaceId, user.workspaceId),
          eq(projectExternalRefs.provider, 'github'),
          eq(projectExternalRefs.externalType, 'repository'),
        ),
      );

    return { items: rows };
  }

  async importGitHubRepositories(
    user: AuthUser,
    input: ImportGitHubRepositoriesInput,
  ): Promise<ImportGitHubRepositoriesResponse> {
    await this.members.requireRole(user.sub, user.workspaceId, ['admin', 'pm']);

    const results: ImportedGitHubRepository[] = [];

    for (const githubRepo of dedupeRepoKeys(input.githubRepos)) {
      results.push(await this.importOne(user, githubRepo));
    }

    return { results };
  }

  private async importOne(
    user: AuthUser,
    githubRepo: string,
  ): Promise<ImportedGitHubRepository> {
    const parts = parseGitHubRepoKey(githubRepo);

    if (!parts) {
      return {
        githubRepo,
        message: 'Repository must be supplied as owner/repo.',
        projectId: null,
        status: 'failed',
      };
    }

    try {
      const repository = await this.github.getRepository(
        user,
        parts.owner,
        parts.repo,
      );

      const { created, project } = await this.db.transaction((tx) =>
        this.githubTasks.findOrCreateProjectForRepo(
          tx,
          user,
          repository.fullName,
        ),
      );

      return {
        githubRepo: repository.fullName,
        message: null,
        projectId: project.id,
        status: created ? 'imported' : 'already-imported',
      };
    } catch (error) {
      return {
        githubRepo,
        message: toImportFailureMessage(error),
        projectId: null,
        status: 'failed',
      };
    }
  }
}

function dedupeRepoKeys(githubRepos: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const githubRepo of githubRepos) {
    const key = githubRepo.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(githubRepo);
    }
  }

  return unique;
}

function toImportFailureMessage(error: unknown): string {
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? (error as { status: unknown }).status
      : null;

  if (status === 403) {
    return 'This organization is not approved for the workspace.';
  }

  if (status === 404) {
    return 'Repository not found, or your GitHub account cannot read it.';
  }

  return error instanceof Error ? error.message : 'Import failed.';
}

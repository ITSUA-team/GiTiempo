import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type {
  ImportGitHubProjectsInput,
  ImportGitHubProjectsResponse,
  ImportedGitHubProject,
  ProjectGitHubProjectListResponse,
  ImportGitHubRepositoriesInput,
  ImportGitHubRepositoriesResponse,
  ImportedGitHubRepository,
  ProjectGitHubRepositoryListResponse,
  TrackingProject,
} from '@gitiempo/shared';
import type { AuthUser } from '../../auth/types/auth-user';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import {
  normalizeGitHubRepoKey,
  parseGitHubRepoKey,
} from '../../github/github-repo-key';
import { GithubService } from '../../github/services/github.service';
import { MembersService } from '../../members/services/members.service';
import { GithubTaskMaterializationService } from '../../tasks/services/github-task-materialization.service';
import {
  describeProjectNameConflict,
  findActiveProjectNameConflict,
} from '../../projects/project-name-policy';
import { projectExternalRefs } from '../../projects/schemas/project-external-refs.schema';
import { projects } from '../../projects/schemas/projects.schema';

@Injectable()
export class ProjectImportsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly members: MembersService,
    private readonly github: GithubService,
    private readonly githubTasks: GithubTaskMaterializationService,
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
    let verified: Awaited<
      ReturnType<GithubService['resolveImportableProject']>
    >;
    try {
      verified = await this.github.resolveImportableProject(
        user,
        board.githubProjectId,
      );
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }

      return {
        githubProjectId: board.githubProjectId,
        linkedRepository: null,
        message:
          'This GitHub project could not be verified for your workspace. It may belong to an organization that is not approved, or be one your GitHub account cannot see.',
        projectId: null,
        status: 'failed',
        trackingProject: null,
      };
    }

    try {
      const repository =
        board.githubRepos.length === 1
          ? await this.resolveRepository(user, board.githubRepos[0]!)
          : null;

      const existing = await this.db
        .select({ projectId: projectExternalRefs.projectId })
        .from(projectExternalRefs)
        .innerJoin(projects, eq(projects.id, projectExternalRefs.projectId))
        .where(
          and(
            eq(projectExternalRefs.workspaceId, user.workspaceId),
            eq(projectExternalRefs.provider, 'github'),
            eq(projectExternalRefs.externalType, 'project'),
            eq(projectExternalRefs.externalKey, board.githubProjectId),
            eq(projects.isActive, true),
          ),
        )
        .orderBy(projects.createdAt, projectExternalRefs.projectId)
        .limit(1);

      if (existing[0]) {
        return {
          githubProjectId: board.githubProjectId,
          linkedRepository: repository,
          message: null,
          projectId: existing[0].projectId,
          status: 'already-imported',
          trackingProject: null,
        };
      }

      if (repository !== null) {
        const tracking = await this.findRepositoryOwner(
          user.workspaceId,
          repository,
        );

        if (tracking) {
          return this.toRepositoryTakenResult(
            board.githubProjectId,
            repository,
            tracking,
          );
        }
      }

      const derivedName = `${verified.ownerLogin}/${verified.title}`;

      const outcome = await this.db.transaction(async (tx) => {
        const nameConflict = await findActiveProjectNameConflict(
          tx,
          user.workspaceId,
          derivedName,
          null,
        );

        if (nameConflict) {
          return { kind: 'name-taken' as const, conflict: nameConflict };
        }

        const [project] = await tx
          .insert(projects)
          .values({
            workspaceId: user.workspaceId,
            name: derivedName,
            color: null,
            ...(board.visibility === undefined
              ? {}
              : { visibility: board.visibility }),
            ...(board.defaultBillableForTasks === undefined
              ? {}
              : { defaultBillableForTasks: board.defaultBillableForTasks }),
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
            externalUrl: verified.url,
            metadata: {
              githubProjectNumber: verified.number,
              githubProjectOwner: verified.ownerLogin,
              githubProjectTitle: verified.title,
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
          const [reclaimedBoard] = await tx
            .update(projectExternalRefs)
            .set({
              projectId: project!.id,
              externalUrl: verified.url,
              metadata: {
                githubProjectNumber: verified.number,
                githubProjectOwner: verified.ownerLogin,
                githubProjectTitle: verified.title,
              },
              syncedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(projectExternalRefs.workspaceId, user.workspaceId),
                eq(projectExternalRefs.provider, 'github'),
                eq(projectExternalRefs.externalType, 'project'),
                eq(projectExternalRefs.externalKey, board.githubProjectId),
                inArray(
                  projectExternalRefs.projectId,
                  tx
                    .select({ id: projects.id })
                    .from(projects)
                    .where(eq(projects.isActive, false)),
                ),
              ),
            )
            .returning({ projectId: projectExternalRefs.projectId });

          if (!reclaimedBoard) {
            await tx.delete(projects).where(eq(projects.id, project!.id));
            return { kind: 'board-taken' as const };
          }
        }

        if (repository !== null) {
          const [repositoryRef] = await tx
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
            })
            .returning({ projectId: projectExternalRefs.projectId });

          if (!repositoryRef) {
            const [reclaimed] = await tx
              .update(projectExternalRefs)
              .set({
                projectId: project!.id,
                externalKey: repository,
                externalUrl: `https://github.com/${repository}`,
                metadata: { githubRepo: repository },
                syncedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(projectExternalRefs.workspaceId, user.workspaceId),
                  eq(projectExternalRefs.provider, 'github'),
                  eq(projectExternalRefs.externalType, 'repository'),
                  sql`lower(${projectExternalRefs.externalKey}) = ${normalizeGitHubRepoKey(repository)}`,
                  inArray(
                    projectExternalRefs.projectId,
                    tx
                      .select({ id: projects.id })
                      .from(projects)
                      .where(eq(projects.isActive, false)),
                  ),
                ),
              )
              .returning({ projectId: projectExternalRefs.projectId });

            if (!reclaimed) {
              await tx.delete(projects).where(eq(projects.id, project!.id));
              return { kind: 'repository-taken' as const };
            }
          }
        }

        return { kind: 'imported' as const, projectId: project!.id };
      });

      if (outcome.kind === 'board-taken') {
        return {
          githubProjectId: board.githubProjectId,
          linkedRepository: repository,
          message: null,
          projectId: null,
          status: 'already-imported',
          trackingProject: null,
        };
      }

      if (outcome.kind === 'name-taken') {
        return {
          githubProjectId: board.githubProjectId,
          linkedRepository: repository,
          message: `${describeProjectNameConflict(outcome.conflict.name)} Rename that project or the GitHub board, then import again.`,
          projectId: null,
          status: 'name-taken',
          trackingProject: {
            id: outcome.conflict.id,
            isActive: true,
            name: outcome.conflict.name,
          },
        };
      }

      if (outcome.kind === 'repository-taken') {
        const tracking =
          repository === null
            ? null
            : await this.findRepositoryOwner(user.workspaceId, repository);

        return this.toRepositoryTakenResult(
          board.githubProjectId,
          repository,
          tracking,
        );
      }

      return {
        githubProjectId: board.githubProjectId,
        linkedRepository: repository,
        message: null,
        projectId: outcome.projectId,
        status: 'imported',
        trackingProject: null,
      };
    } catch (error) {
      return {
        githubProjectId: board.githubProjectId,
        linkedRepository: null,
        message: toImportFailureMessage(error),
        projectId: null,
        status: 'failed',
        trackingProject: null,
      };
    }
  }

  private async findRepositoryOwner(
    workspaceId: string,
    githubRepo: string,
  ): Promise<TrackingProject | null> {
    const normalized = normalizeGitHubRepoKey(githubRepo);

    if (!normalized) {
      return null;
    }

    const [row] = await this.db
      .select({
        id: projects.id,
        isActive: projects.isActive,
        name: projects.name,
      })
      .from(projectExternalRefs)
      .innerJoin(projects, eq(projects.id, projectExternalRefs.projectId))
      .where(
        and(
          eq(projectExternalRefs.workspaceId, workspaceId),
          eq(projectExternalRefs.provider, 'github'),
          eq(projectExternalRefs.externalType, 'repository'),
          eq(projects.isActive, true),
          sql`lower(${projectExternalRefs.externalKey}) = ${normalized}`,
        ),
      )
      .orderBy(projects.createdAt, projectExternalRefs.projectId)
      .limit(1);

    return row ?? null;
  }

  private toRepositoryTakenResult(
    githubProjectId: string,
    repository: string | null,
    tracking: TrackingProject | null,
  ): ImportedGitHubProject {
    const owner = tracking?.name ?? 'another project';

    return {
      githubProjectId,
      linkedRepository: repository,
      message: `${repository ?? 'That repository'} is already tracked by ${owner}. Timers started from its issues keep using that project.`,
      projectId: null,
      status: 'repository-taken',
      trackingProject: tracking,
    };
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
        projectName: projects.name,
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

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import {
  githubTrackingErrorMessages,
  githubTrackingErrorStatuses,
  type GitHubTrackingErrorCode,
} from '@gitiempo/shared';
import type { AuthUser } from '../../auth/types/auth-user';
import { DomainError } from '../../commons/errors/domain-error';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import {
  lockProjectNamespace,
  resolveAvailableProjectName,
} from '../../projects/project-name-policy';
import { projectExternalRefs } from '../../projects/schemas/project-external-refs.schema';
import {
  projectRowSelection,
  projects,
} from '../../projects/schemas/projects.schema';
import type { ProjectRow } from '../../projects/services/projects.service';
import {
  normalizeGitHubIssueExternalKey,
  normalizeGitHubLogin,
  normalizeGitHubRepoKey,
  parseGitHubRepoKey,
  rewriteGitHubIssueOwner,
} from '../../github/github-repo-key';
import { WorkspaceGitHubOrganizationsService } from '../../github/services/workspace-github-organizations.service';
import { taskExternalRefs } from '../schemas/task-external-refs.schema';
import { taskRowSelection, tasks } from '../schemas/tasks.schema';

type QueryExecutor = Pick<
  DrizzleDB,
  'delete' | 'execute' | 'insert' | 'select'
>;
type TaskRow = typeof tasks.$inferSelect;

export interface ExternalReferenceMaterializationInput {
  canonicalIssueUrl: string;
  githubRepo: string;
  issueKey: string;
  issueTitle: string;
}

export type ExternalReferenceMaterialization =
  | {
      kind: 'external-reference';
      project: ProjectRow;
      projectCreated: boolean;
      task: TaskRow;
      taskCreated: boolean;
    }
  | {
      kind: 'managed';
      project: ProjectRow;
      task: TaskRow | null;
    };

@Injectable()
export class GithubTaskMaterializationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly organizations: WorkspaceGitHubOrganizationsService,
  ) {}

  /**
   * Anchors an issue key's owner casing to the workspace's connected
   * organization, the single source of truth. Whatever casing the extension or
   * the app supplied ("itsua-team" vs "ITSUA-team"), it resolves to the one
   * connected form, so the same issue can never be stored under two owners. If
   * the organization is not connected there is no authority to resolve
   * against, so the key is left as received.
   */
  private async canonicalizeIssueKey(
    workspaceId: string,
    issueKey: string,
  ): Promise<string> {
    const repoPart = issueKey.slice(0, issueKey.lastIndexOf('#'));
    const parts = parseGitHubRepoKey(repoPart);
    if (!parts) {
      return issueKey;
    }

    const canonicalOwner =
      await this.organizations.resolveCanonicalOrganizationLogin(
        workspaceId,
        parts.owner,
      );
    if (!canonicalOwner || canonicalOwner === parts.owner) {
      return issueKey;
    }

    return rewriteGitHubIssueOwner(issueKey, canonicalOwner) ?? issueKey;
  }

  async findOrCreateProjectForRepo(
    executor: QueryExecutor,
    user: AuthUser,
    githubRepo: string,
  ): Promise<{ created: boolean; project: ProjectRow }> {
    const existingRef = await this.findGitHubProjectRef(
      executor,
      user.workspaceId,
      githubRepo,
    );

    if (existingRef) {
      const project = await this.requireProjectRow(
        executor,
        user.workspaceId,
        existingRef.projectId,
      );
      return { project, created: false };
    }

    await lockProjectNamespace(executor, user.workspaceId);

    const lockedRef = await this.findGitHubProjectRef(
      executor,
      user.workspaceId,
      githubRepo,
      true,
    );
    if (lockedRef) {
      return {
        project: await this.requireProjectRow(
          executor,
          user.workspaceId,
          lockedRef.projectId,
        ),
        created: false,
      };
    }

    const name = await resolveAvailableProjectName(
      executor,
      user.workspaceId,
      githubRepo,
    );

    const project = (
      await executor
        .insert(projects)
        .values({
          workspaceId: user.workspaceId,
          name,
          color: null,
          trackingMode: 'managed',
        })
        .returning()
    )[0]!;

    const [createdRef] = await executor
      .insert(projectExternalRefs)
      .values({
        workspaceId: user.workspaceId,
        projectId: project.id,
        provider: 'github',
        externalType: 'repository',
        externalKey: githubRepo,
        externalUrl: `https://github.com/${githubRepo}`,
        metadata: { githubRepo },
        referenceProvenance: 'provider-verified',
        syncedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ projectId: projectExternalRefs.projectId });

    if (!createdRef) {
      await executor.delete(projects).where(eq(projects.id, project.id));

      const winningRef = await this.findGitHubProjectRef(
        executor,
        user.workspaceId,
        githubRepo,
      );
      if (!winningRef) {
        throw DomainError.internal(
          'github_project_mapping_missing',
          'Failed to load GitHub project mapping',
        );
      }

      const winningProject = await this.requireProjectRow(
        executor,
        user.workspaceId,
        winningRef.projectId,
      );
      return { project: winningProject, created: false };
    }

    return { project, created: true };
  }

  async findOrCreateTaskForIssue(
    executor: QueryExecutor,
    input: {
      defaultBillableForTimeEntries: boolean;
      issueKey: string;
      issueTitle: string;
      projectId: string;
      workspaceId: string;
    },
  ): Promise<TaskRow> {
    // Resolve the owner casing against the connected organization so both the
    // extension and the app converge on one canonical key for the same issue.
    const issueKey = await this.canonicalizeIssueKey(
      input.workspaceId,
      input.issueKey,
    );

    const existingRef = await this.findGitHubTaskRef(
      executor,
      input.workspaceId,
      input.projectId,
      issueKey,
    );

    if (existingRef) {
      return this.requireTaskRow(
        executor,
        input.workspaceId,
        input.projectId,
        existingRef.taskId,
      );
    }

    const [task] = await executor
      .insert(tasks)
      .values({
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        title: input.issueTitle,
        defaultBillableForTimeEntries: input.defaultBillableForTimeEntries,
      })
      .returning();
    if (!task) {
      throw DomainError.internal(
        'github_task_create_failed',
        'Failed to create GitHub task',
      );
    }

    const separatorIndex = issueKey.lastIndexOf('#');
    const githubRepo = issueKey.slice(0, separatorIndex);
    const issueNumber = Number(issueKey.slice(separatorIndex + 1));
    const [createdRef] = await executor
      .insert(taskExternalRefs)
      .values({
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        taskId: task.id,
        provider: 'github',
        externalType: 'issue',
        externalKey: issueKey,
        externalUrl: `https://github.com/${githubRepo}/issues/${issueNumber}`,
        metadata: { githubRepo, issueNumber },
        referenceProvenance: 'provider-verified',
        syncedAt: new Date(),
      })
      // The unique index guarding this insert is keyed on lower(external_key),
      // an expression a column-list conflict target cannot reference — so any
      // conflict (a concurrent insert of the same issue under any casing)
      // funnels into the recovery path below.
      .onConflictDoNothing()
      .returning({ taskId: taskExternalRefs.taskId });

    if (!createdRef) {
      await executor.delete(tasks).where(eq(tasks.id, task.id));

      const winningRef = await this.findGitHubTaskRefInWorkspace(
        executor,
        input.workspaceId,
        issueKey,
      );
      if (!winningRef) {
        throw DomainError.internal(
          'github_task_mapping_missing',
          'Failed to load GitHub task mapping',
        );
      }
      if (winningRef.projectId !== input.projectId) {
        throw new NotFoundException('GitHub issue not found');
      }

      return this.requireTaskRow(
        executor,
        input.workspaceId,
        input.projectId,
        winningRef.taskId,
      );
    }

    return task;
  }

  /**
   * Resolves browser-supplied issue context without provider I/O. Callers must
   * re-authorize through the managed path when this reports a managed target.
   */
  async materializeExternalReference(
    executor: QueryExecutor,
    user: AuthUser,
    input: ExternalReferenceMaterializationInput,
  ): Promise<ExternalReferenceMaterialization> {
    const normalizedRepo = normalizeGitHubRepoKey(input.githubRepo);
    const normalizedIssue = normalizeGitHubIssueExternalKey(input.issueKey);
    if (!normalizedRepo || !normalizedIssue) {
      throw DomainError.internal(
        'github_reference_invalid',
        'GitHub reference is invalid',
      );
    }

    await lockProjectNamespace(executor, user.workspaceId);

    const existingIssue = await this.findGitHubTaskRefInWorkspace(
      executor,
      user.workspaceId,
      input.issueKey,
      true,
    );
    if (existingIssue) {
      const project = await this.requireProjectRow(
        executor,
        user.workspaceId,
        existingIssue.projectId,
      );
      const task = await this.requireTaskRow(
        executor,
        user.workspaceId,
        existingIssue.projectId,
        existingIssue.taskId,
      );
      return project.trackingMode === 'external-reference'
        ? {
            kind: 'external-reference',
            project,
            projectCreated: false,
            task,
            taskCreated: false,
          }
        : { kind: 'managed', project, task };
    }

    const existingRepository = await this.findGitHubProjectRef(
      executor,
      user.workspaceId,
      input.githubRepo,
      true,
    );
    const project = existingRepository
      ? await this.requireProjectRow(
          executor,
          user.workspaceId,
          existingRepository.projectId,
        )
      : await this.createExternalProjectForRepo(
          executor,
          user.workspaceId,
          input.githubRepo,
        );

    if (project.trackingMode !== 'external-reference') {
      return { kind: 'managed', project, task: null };
    }

    const { task, created } = await this.findOrCreateExternalTaskForIssue(
      executor,
      {
        canonicalIssueUrl: input.canonicalIssueUrl,
        githubRepo: input.githubRepo,
        issueKey: input.issueKey,
        issueTitle: input.issueTitle,
        project,
        workspaceId: user.workspaceId,
      },
    );

    return {
      kind: 'external-reference',
      project,
      projectCreated: existingRepository === null,
      task,
      taskCreated: created,
    };
  }

  async findExistingReferenceProject(
    executor: Pick<DrizzleDB, 'select'>,
    workspaceId: string,
    input: Pick<
      ExternalReferenceMaterializationInput,
      'githubRepo' | 'issueKey'
    >,
    lockMapping = false,
  ): Promise<ProjectRow | null> {
    return this.findExistingIssueProject(
      executor,
      workspaceId,
      input.githubRepo,
      input.issueKey,
      lockMapping,
    );
  }

  /** Read-only lookup; timer requests never create projects or assignments. */
  async findExistingIssueProject(
    executor: Pick<DrizzleDB, 'select'>,
    workspaceId: string,
    githubRepo: string,
    issueKey: string,
    lockMapping = false,
  ): Promise<ProjectRow | null> {
    const issueRef = await this.findGitHubTaskRefInWorkspace(
      executor,
      workspaceId,
      issueKey,
      lockMapping,
    );
    if (issueRef) {
      return this.requireProjectRow(executor, workspaceId, issueRef.projectId);
    }
    const repositoryRef = await this.findGitHubProjectRef(
      executor,
      workspaceId,
      githubRepo,
      lockMapping,
    );
    return repositoryRef
      ? this.requireProjectRow(executor, workspaceId, repositoryRef.projectId)
      : null;
  }

  private async createExternalProjectForRepo(
    executor: QueryExecutor,
    workspaceId: string,
    githubRepo: string,
  ): Promise<ProjectRow> {
    const name = await resolveAvailableProjectName(
      executor,
      workspaceId,
      githubRepo,
    );
    const [project] = await executor
      .insert(projects)
      .values({
        workspaceId,
        name,
        color: null,
        visibility: 'private',
        trackingMode: 'external-reference',
      })
      .returning();
    if (!project) {
      throw DomainError.internal(
        'external_project_create_failed',
        'Failed to create external reference project',
      );
    }

    const [createdRef] = await executor
      .insert(projectExternalRefs)
      .values({
        workspaceId,
        projectId: project.id,
        provider: 'github',
        externalType: 'repository',
        externalKey: githubRepo,
        externalUrl: `https://github.com/${githubRepo}`,
        metadata: { githubRepo },
        referenceProvenance: 'user-supplied',
        syncedAt: null,
      })
      .onConflictDoNothing()
      .returning({ projectId: projectExternalRefs.projectId });

    if (createdRef) {
      return project;
    }

    await executor.delete(projects).where(eq(projects.id, project.id));
    const winner = await this.findGitHubProjectRef(
      executor,
      workspaceId,
      githubRepo,
      true,
    );
    if (!winner) {
      throw DomainError.internal(
        'github_project_mapping_missing',
        'Failed to load GitHub project mapping',
      );
    }
    return this.requireProjectRow(executor, workspaceId, winner.projectId);
  }

  private async findOrCreateExternalTaskForIssue(
    executor: QueryExecutor,
    input: ExternalReferenceMaterializationInput & {
      project: ProjectRow;
      workspaceId: string;
    },
  ): Promise<{ created: boolean; task: TaskRow }> {
    const existing = await this.findGitHubTaskRefInWorkspace(
      executor,
      input.workspaceId,
      input.issueKey,
      true,
    );
    if (existing) {
      const task = await this.requireTaskRow(
        executor,
        input.workspaceId,
        existing.projectId,
        existing.taskId,
      );
      if (existing.projectId !== input.project.id) {
        throw new NotFoundException('GitHub issue not found');
      }
      return { task, created: false };
    }

    const [task] = await executor
      .insert(tasks)
      .values({
        workspaceId: input.workspaceId,
        projectId: input.project.id,
        title: input.issueTitle,
        defaultBillableForTimeEntries: input.project.defaultBillableForTasks,
      })
      .returning();
    if (!task) {
      throw DomainError.internal(
        'github_task_create_failed',
        'Failed to create GitHub task',
      );
    }

    const separatorIndex = input.issueKey.lastIndexOf('#');
    const issueNumber = Number(input.issueKey.slice(separatorIndex + 1));
    const [createdRef] = await executor
      .insert(taskExternalRefs)
      .values({
        workspaceId: input.workspaceId,
        projectId: input.project.id,
        taskId: task.id,
        provider: 'github',
        externalType: 'issue',
        externalKey: input.issueKey,
        externalUrl: input.canonicalIssueUrl,
        metadata: { githubRepo: input.githubRepo, issueNumber },
        referenceProvenance: 'user-supplied',
        syncedAt: null,
      })
      .onConflictDoNothing()
      .returning({
        projectId: taskExternalRefs.projectId,
        taskId: taskExternalRefs.taskId,
      });

    if (createdRef) {
      return { task, created: true };
    }

    await executor.delete(tasks).where(eq(tasks.id, task.id));
    const winner = await this.findGitHubTaskRefInWorkspace(
      executor,
      input.workspaceId,
      input.issueKey,
      true,
    );
    if (!winner) {
      throw DomainError.internal(
        'github_task_mapping_missing',
        'Failed to load GitHub task mapping',
      );
    }
    if (winner.projectId !== input.project.id) {
      throw new NotFoundException('GitHub issue not found');
    }
    return {
      task: await this.requireTaskRow(
        executor,
        input.workspaceId,
        winner.projectId,
        winner.taskId,
      ),
      created: false,
    };
  }

  async listMappedBoardIds(
    workspaceId: string,
    organizationLogin: string,
  ): Promise<string[]> {
    const refs = await this.db
      .select({
        id: projectExternalRefs.externalKey,
        metadata: projectExternalRefs.metadata,
      })
      .from(projectExternalRefs)
      .innerJoin(projects, eq(projects.id, projectExternalRefs.projectId))
      .where(
        and(
          eq(projectExternalRefs.workspaceId, workspaceId),
          eq(projectExternalRefs.provider, 'github'),
          eq(projectExternalRefs.externalType, 'project'),
          eq(projects.isActive, true),
        ),
      );
    const normalizedOrganization = normalizeGitHubLogin(organizationLogin);
    return refs.flatMap((ref) =>
      normalizeGitHubLogin(
        typeof ref.metadata.githubProjectOwner === 'string'
          ? ref.metadata.githubProjectOwner
          : '',
      ) === normalizedOrganization
        ? [ref.id]
        : [],
    );
  }

  async resolveExistingProjectForIssue(
    executor: Pick<DrizzleDB, 'select'>,
    user: AuthUser,
    input: {
      githubRepo: string;
      issueKey: string;
      verifiedBoardIds: readonly string[];
    },
  ): Promise<ProjectRow> {
    const existing = await this.findExistingIssueProject(
      executor,
      user.workspaceId,
      input.githubRepo,
      input.issueKey,
      true,
    );
    if (existing) return existing;
    if (input.verifiedBoardIds.length === 0) {
      throw this.trackingError('github_project_mapping_required');
    }
    const refs = await executor
      .select({ projectId: projectExternalRefs.projectId })
      .from(projectExternalRefs)
      .innerJoin(projects, eq(projects.id, projectExternalRefs.projectId))
      .where(
        and(
          eq(projectExternalRefs.workspaceId, user.workspaceId),
          eq(projectExternalRefs.provider, 'github'),
          eq(projectExternalRefs.externalType, 'project'),
          eq(projects.isActive, true),
          inArray(projectExternalRefs.externalKey, [...input.verifiedBoardIds]),
        ),
      )
      .for('update');
    const ids = [...new Set(refs.map((ref) => ref.projectId))];
    if (ids.length !== 1) {
      throw this.trackingError(
        ids.length
          ? 'github_project_mapping_ambiguous'
          : 'github_project_mapping_required',
      );
    }
    return this.requireProjectRow(executor, user.workspaceId, ids[0]!);
  }

  private trackingError(code: GitHubTrackingErrorCode): DomainError {
    return new DomainError(
      code,
      githubTrackingErrorMessages[code],
      githubTrackingErrorStatuses[code],
    );
  }

  async resolveProjectForIssue(
    executor: QueryExecutor,
    user: AuthUser,
    input: {
      githubProjectId?: string | undefined;
      githubRepo: string;
      issueKey: string;
    },
  ): Promise<{ created: boolean; project: ProjectRow }> {
    const boardProject =
      input.githubProjectId === undefined
        ? null
        : await this.findBoardProject(
            executor,
            user.workspaceId,
            input.githubProjectId,
          );

    if (boardProject) {
      const trackedIssue = await this.findGitHubTaskRefInWorkspace(
        executor,
        user.workspaceId,
        await this.canonicalizeIssueKey(user.workspaceId, input.issueKey),
      );

      if (trackedIssue?.projectId === boardProject.id) {
        return { project: boardProject, created: false };
      }
    }

    const repositoryRef = await this.findGitHubProjectRef(
      executor,
      user.workspaceId,
      input.githubRepo,
    );

    if (repositoryRef) {
      return {
        project: await this.requireProjectRow(
          executor,
          user.workspaceId,
          repositoryRef.projectId,
        ),
        created: false,
      };
    }

    return this.findOrCreateProjectForRepo(executor, user, input.githubRepo);
  }

  private async findBoardProject(
    executor: Pick<DrizzleDB, 'select'>,
    workspaceId: string,
    githubProjectId: string,
  ): Promise<ProjectRow | null> {
    const boardRef = await this.findGitHubBoardRef(
      executor,
      workspaceId,
      githubProjectId,
    );

    if (!boardRef) {
      return null;
    }

    return this.findProjectRow(executor, workspaceId, boardRef.projectId);
  }

  private async findGitHubBoardRef(
    executor: Pick<DrizzleDB, 'select'>,
    workspaceId: string,
    githubProjectId: string,
  ): Promise<{ projectId: string } | null> {
    const [row] = await executor
      .select({ projectId: projectExternalRefs.projectId })
      .from(projectExternalRefs)
      .where(
        and(
          eq(projectExternalRefs.workspaceId, workspaceId),
          eq(projectExternalRefs.provider, 'github'),
          eq(projectExternalRefs.externalType, 'project'),
          eq(projectExternalRefs.externalKey, githubProjectId),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  private async findProjectRow(
    executor: Pick<DrizzleDB, 'select'>,
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectRow | null> {
    const [row] = await executor
      .select(projectRowSelection)
      .from(projects)
      .where(
        and(eq(projects.workspaceId, workspaceId), eq(projects.id, projectId)),
      )
      .limit(1);

    return row ?? null;
  }

  async findProjectRepoKey(
    workspaceId: string,
    projectId: string,
    executor: Pick<DrizzleDB, 'select'> = this.db,
  ): Promise<string | null> {
    const [row] = await executor
      .select({ externalKey: projectExternalRefs.externalKey })
      .from(projectExternalRefs)
      .where(
        and(
          eq(projectExternalRefs.workspaceId, workspaceId),
          eq(projectExternalRefs.projectId, projectId),
          eq(projectExternalRefs.provider, 'github'),
          eq(projectExternalRefs.externalType, 'repository'),
        ),
      )
      .limit(1);

    return row?.externalKey ?? null;
  }

  private async findGitHubProjectRef(
    executor: Pick<DrizzleDB, 'select'>,
    workspaceId: string,
    githubRepo: string,
    lockMapping = false,
  ): Promise<{ projectId: string } | null> {
    const normalizedRepo = normalizeGitHubRepoKey(githubRepo);
    if (!normalizedRepo) {
      throw DomainError.internal(
        'github_repo_invalid',
        'GitHub repository reference is invalid',
      );
    }

    const query = executor
      .select({ projectId: projectExternalRefs.projectId })
      .from(projectExternalRefs)
      .innerJoin(projects, eq(projects.id, projectExternalRefs.projectId))
      .where(
        and(
          eq(projectExternalRefs.workspaceId, workspaceId),
          eq(projectExternalRefs.provider, 'github'),
          eq(projectExternalRefs.externalType, 'repository'),
          sql`lower(${projectExternalRefs.externalKey}) = ${normalizedRepo}`,
        ),
      )
      .orderBy(
        sql`${projects.isActive} desc`,
        projectExternalRefs.createdAt,
        projectExternalRefs.projectId,
      )
      .limit(1);

    const [row] = await (lockMapping ? query.for('update') : query);
    return row ?? null;
  }

  private async requireProjectRow(
    executor: Pick<DrizzleDB, 'select'>,
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectRow> {
    const [row] = await executor
      .select(projectRowSelection)
      .from(projects)
      .where(
        and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundException('GitHub project not found');
    }
    return row;
  }

  private async findGitHubTaskRef(
    executor: Pick<DrizzleDB, 'select'>,
    workspaceId: string,
    projectId: string,
    issueKey: string,
  ): Promise<{ taskId: string } | null> {
    const normalizedIssueKey = normalizeGitHubIssueExternalKey(issueKey);
    if (!normalizedIssueKey) {
      throw DomainError.internal(
        'github_issue_invalid',
        'GitHub issue reference is invalid',
      );
    }

    const [row] = await executor
      .select({ taskId: taskExternalRefs.taskId })
      .from(taskExternalRefs)
      .where(
        and(
          eq(taskExternalRefs.workspaceId, workspaceId),
          eq(taskExternalRefs.projectId, projectId),
          eq(taskExternalRefs.provider, 'github'),
          eq(taskExternalRefs.externalType, 'issue'),
          sql`lower(${taskExternalRefs.externalKey}) = ${normalizedIssueKey}`,
        ),
      )
      .limit(1);

    return row ?? null;
  }

  private async findGitHubTaskRefInWorkspace(
    executor: Pick<DrizzleDB, 'select'>,
    workspaceId: string,
    issueKey: string,
    lockMapping = false,
  ): Promise<{ projectId: string; taskId: string } | null> {
    const normalizedIssueKey = normalizeGitHubIssueExternalKey(issueKey);
    if (!normalizedIssueKey) {
      throw DomainError.internal(
        'github_issue_invalid',
        'GitHub issue reference is invalid',
      );
    }

    const query = executor
      .select({
        projectId: taskExternalRefs.projectId,
        taskId: taskExternalRefs.taskId,
      })
      .from(taskExternalRefs)
      .where(
        and(
          eq(taskExternalRefs.workspaceId, workspaceId),
          eq(taskExternalRefs.provider, 'github'),
          eq(taskExternalRefs.externalType, 'issue'),
          sql`lower(${taskExternalRefs.externalKey}) = ${normalizedIssueKey}`,
        ),
      )
      .limit(1);

    const [row] = await (lockMapping ? query.for('update') : query);
    return row ?? null;
  }

  private async requireTaskRow(
    executor: Pick<DrizzleDB, 'select'>,
    workspaceId: string,
    projectId: string,
    taskId: string,
  ): Promise<TaskRow> {
    const [row] = await executor
      .select(taskRowSelection)
      .from(tasks)
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.workspaceId, workspaceId),
          eq(tasks.projectId, projectId),
        ),
      )
      .limit(1);
    if (!row) {
      throw DomainError.internal(
        'github_task_missing',
        'GitHub task mapping points to a missing task',
      );
    }
    return row;
  }
}

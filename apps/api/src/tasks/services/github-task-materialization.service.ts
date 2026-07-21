import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import type { AuthUser } from '../../auth/types/auth-user';
import { DomainError } from '../../commons/errors/domain-error';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import { projectExternalRefs } from '../../projects/schemas/project-external-refs.schema';
import {
  projectRowSelection,
  projects,
} from '../../projects/schemas/projects.schema';
import type { ProjectRow } from '../../projects/services/projects.service';
import {
  normalizeGitHubIssueExternalKey,
  normalizeGitHubRepoKey,
  parseGitHubRepoKey,
  rewriteGitHubIssueOwner,
} from '../../github/github-repo-key';
import { WorkspaceGitHubOrganizationsService } from '../../github/services/workspace-github-organizations.service';
import { taskExternalRefs } from '../schemas/task-external-refs.schema';
import { taskRowSelection, tasks } from '../schemas/tasks.schema';

type QueryExecutor = Pick<DrizzleDB, 'delete' | 'insert' | 'select'>;
type TaskRow = typeof tasks.$inferSelect;

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

    const project = (
      await executor
        .insert(projects)
        .values({
          workspaceId: user.workspaceId,
          name: githubRepo,
          color: null,
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
        syncedAt: new Date(),
      })
      .onConflictDoNothing({
        target: [
          taskExternalRefs.workspaceId,
          taskExternalRefs.provider,
          taskExternalRefs.externalType,
          taskExternalRefs.externalKey,
        ],
      })
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
  ): Promise<{ projectId: string } | null> {
    const normalizedRepo = normalizeGitHubRepoKey(githubRepo);
    if (!normalizedRepo) {
      throw DomainError.internal(
        'github_repo_invalid',
        'GitHub repository reference is invalid',
      );
    }

    const [row] = await executor
      .select({ projectId: projectExternalRefs.projectId })
      .from(projectExternalRefs)
      .where(
        and(
          eq(projectExternalRefs.workspaceId, workspaceId),
          eq(projectExternalRefs.provider, 'github'),
          eq(projectExternalRefs.externalType, 'repository'),
          sql`lower(${projectExternalRefs.externalKey}) = ${normalizedRepo}`,
        ),
      )
      .limit(1);

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
  ): Promise<{ projectId: string; taskId: string } | null> {
    const normalizedIssueKey = normalizeGitHubIssueExternalKey(issueKey);
    if (!normalizedIssueKey) {
      throw DomainError.internal(
        'github_issue_invalid',
        'GitHub issue reference is invalid',
      );
    }

    const [row] = await executor
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

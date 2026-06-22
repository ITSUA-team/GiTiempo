import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type {
  BackfillTaskBillableDefaultInput,
  CreateTaskInput,
  TaskListQuery,
  TaskBillableDefaultBackfillResponse,
  TaskResponse,
  UpdateTaskInput,
} from '@gitiempo/shared';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import type { AuthUser } from '../../auth/types/auth-user';
import { parseGitHubIssueExternalKey } from '../../github/github-issue-external-key';
import type { ProjectRow } from '../../projects/services/projects.service';
import { ProjectsService } from '../../projects/services/projects.service';
import { timeEntries } from '../../time-entries/schemas/time-entries.schema';
import { taskExternalRefs } from '../schemas/task-external-refs.schema';
import { tasks } from '../schemas/tasks.schema';

export type TaskRow = typeof tasks.$inferSelect;
type QueryExecutor = Pick<DrizzleDB, 'select' | 'update'>;

interface TaskResponseRow extends TaskRow {
  githubIssueExternalKey: string | null;
}

@Injectable()
export class TasksService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly projects: ProjectsService,
  ) {}

  async listProjectTasks(
    user: AuthUser,
    projectId: string,
    query: TaskListQuery = { includeInactive: false },
  ): Promise<TaskResponse[]> {
    const project = await this.projects.requireVisibleProject(user, projectId);
    if (!project.isActive) {
      throw new NotFoundException('Project not found');
    }

    const conditions = [
      eq(tasks.workspaceId, user.workspaceId),
      eq(tasks.projectId, project.id),
    ];

    if (!query.includeInactive) {
      conditions.push(eq(tasks.isActive, true));
    }

    const rows = await this.db
      .select(this.taskResponseSelection())
      .from(tasks)
      .leftJoin(
        taskExternalRefs,
        and(
          eq(taskExternalRefs.workspaceId, user.workspaceId),
          eq(taskExternalRefs.projectId, project.id),
          eq(taskExternalRefs.taskId, tasks.id),
          eq(taskExternalRefs.provider, 'github'),
          eq(taskExternalRefs.externalType, 'issue'),
        ),
      )
      .where(and(...conditions));

    return rows.map((row) => this.toResponse(row));
  }

  async createTask(
    user: AuthUser,
    projectId: string,
    input: CreateTaskInput,
  ): Promise<TaskResponse> {
    const project = await this.projects.requireVisibleProject(user, projectId);
    if (!project.isActive) {
      throw new UnprocessableEntityException('Project is inactive');
    }

    const [row] = await this.db
      .insert(tasks)
      .values({
        workspaceId: user.workspaceId,
        projectId: project.id,
        title: input.title,
        defaultBillableForTimeEntries:
          input.defaultBillableForTimeEntries ??
          project.defaultBillableForTasks,
      })
      .returning();
    if (!row) throw new Error('Failed to create task');
    return this.toResponse(row, null);
  }

  async getTask(user: AuthUser, taskId: string): Promise<TaskResponse> {
    const { task } = await this.requireVisibleTask(user, taskId);
    const githubIssueExternalKey = await this.findGitHubIssueExternalKey(
      user.workspaceId,
      task.id,
    );
    return this.toResponse(task, githubIssueExternalKey);
  }

  async updateTask(
    user: AuthUser,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<TaskResponse> {
    const { task, project } = await this.requireVisibleTask(user, taskId);
    if (!project.isActive) {
      throw new UnprocessableEntityException('Project is inactive');
    }

    const updatedAt = new Date();
    const updateValues = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.defaultBillableForTimeEntries !== undefined
        ? {
            defaultBillableForTimeEntries: input.defaultBillableForTimeEntries,
          }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      updatedAt,
    };
    const shouldHandleTaskClose = input.status === 'closed';

    if (shouldHandleTaskClose) {
      const row = await this.db.transaction(async (tx) => {
        const lockedTask = await this.requireTaskRowForUpdate(
          tx,
          user.workspaceId,
          task.id,
        );
        const [updated] = await tx
          .update(tasks)
          .set(updateValues)
          .where(eq(tasks.id, lockedTask.id))
          .returning();

        if (!updated) throw new NotFoundException('Task not found');

        if (lockedTask.status !== 'closed') {
          await this.stopRunningEntriesForTask(
            tx,
            user.workspaceId,
            lockedTask.id,
            updatedAt,
          );
        }
        return updated;
      });

      const githubIssueExternalKey = await this.findGitHubIssueExternalKey(
        user.workspaceId,
        row.id,
      );
      return this.toResponse(row, githubIssueExternalKey);
    }

    const [row] = await this.db
      .update(tasks)
      .set(updateValues)
      .where(eq(tasks.id, task.id))
      .returning();

    if (!row) throw new NotFoundException('Task not found');
    const githubIssueExternalKey = await this.findGitHubIssueExternalKey(
      user.workspaceId,
      row.id,
    );
    return this.toResponse(row, githubIssueExternalKey);
  }

  async backfillBillableDefault(
    user: AuthUser,
    taskId: string,
    input: BackfillTaskBillableDefaultInput,
  ): Promise<TaskBillableDefaultBackfillResponse> {
    void input;

    return this.db.transaction(async (tx) => {
      const { task, project } = await this.requireVisibleTask(user, taskId, tx);
      if (!project.isActive) {
        throw new UnprocessableEntityException('Project is inactive');
      }

      const updatedEntries = await tx
        .update(timeEntries)
        .set({
          isBillable: task.defaultBillableForTimeEntries,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(timeEntries.workspaceId, user.workspaceId),
            eq(timeEntries.taskId, task.id),
          ),
        )
        .returning({ id: timeEntries.id });

      return {
        timeEntriesUpdated: updatedEntries.length,
      };
    });
  }

  async deleteTask(user: AuthUser, taskId: string): Promise<void> {
    const { task } = await this.requireVisibleTask(user, taskId);
    const [entry] = await this.db
      .select({ id: timeEntries.id })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.workspaceId, user.workspaceId),
          eq(timeEntries.taskId, task.id),
        ),
      )
      .limit(1);

    if (entry) throw new ConflictException('Task has related time entries');

    try {
      const [deleted] = await this.db
        .delete(tasks)
        .where(
          and(eq(tasks.id, task.id), eq(tasks.workspaceId, user.workspaceId)),
        )
        .returning({ id: tasks.id });
      if (!deleted) throw new NotFoundException('Task not found');
    } catch (err) {
      this.handleTimeEntryReferenceConflict(err);
      throw err;
    }
  }

  async requireVisibleTask(
    user: AuthUser,
    taskId: string,
    db: Pick<DrizzleDB, 'select'> = this.db,
  ): Promise<{ task: TaskRow; project: ProjectRow }> {
    const [row] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, user.workspaceId)))
      .limit(1);
    if (!row) throw new NotFoundException('Task not found');

    const project = await this.projects.requireVisibleProject(
      user,
      row.projectId,
      db,
    );
    return { task: row, project };
  }

  async requireTrackableTask(
    user: AuthUser,
    taskId: string,
  ): Promise<{ task: TaskRow; project: ProjectRow }> {
    const result = await this.requireVisibleTask(user, taskId);
    this.assertTrackableTask(result.task, result.project);
    return result;
  }

  async requireTrackableTaskForUpdate(
    user: AuthUser,
    taskId: string,
    db: Pick<DrizzleDB, 'select'>,
  ): Promise<{ task: TaskRow; project: ProjectRow }> {
    const task = await this.requireTaskRowForUpdate(
      db,
      user.workspaceId,
      taskId,
    );
    const project = await this.projects.requireVisibleProject(
      user,
      task.projectId,
      db,
    );

    this.assertTrackableTask(task, project);
    return { task, project };
  }

  private taskResponseSelection() {
    return {
      id: tasks.id,
      workspaceId: tasks.workspaceId,
      projectId: tasks.projectId,
      title: tasks.title,
      status: tasks.status,
      defaultBillableForTimeEntries: tasks.defaultBillableForTimeEntries,
      isActive: tasks.isActive,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      githubIssueExternalKey: taskExternalRefs.externalKey,
    };
  }

  private toResponse(
    row: TaskRow | TaskResponseRow,
    githubIssueExternalKey: string | null = 'githubIssueExternalKey' in row
      ? row.githubIssueExternalKey
      : null,
  ): TaskResponse {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      projectId: row.projectId,
      title: row.title,
      status: row.status,
      defaultBillableForTimeEntries: row.defaultBillableForTimeEntries,
      isActive: row.isActive,
      githubIssue: parseGitHubIssueExternalKey(githubIssueExternalKey),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async findGitHubIssueExternalKey(
    workspaceId: string,
    taskId: string,
  ): Promise<string | null> {
    const [row] = await this.db
      .select({ externalKey: taskExternalRefs.externalKey })
      .from(taskExternalRefs)
      .where(
        and(
          eq(taskExternalRefs.workspaceId, workspaceId),
          eq(taskExternalRefs.taskId, taskId),
          eq(taskExternalRefs.provider, 'github'),
          eq(taskExternalRefs.externalType, 'issue'),
        ),
      )
      .limit(1);

    return row?.externalKey ?? null;
  }

  private async stopRunningEntriesForTask(
    db: QueryExecutor,
    workspaceId: string,
    taskId: string,
    closedAt: Date,
  ): Promise<void> {
    const endedAt = sql<Date>`CASE
      WHEN ${closedAt}::timestamptz > ${timeEntries.startedAt}
        THEN ${closedAt}::timestamptz
      ELSE ${timeEntries.startedAt} + interval '1 second'
    END`;

    await db
      .update(timeEntries)
      .set({
        durationSeconds: sql<number>`GREATEST(
          1,
          FLOOR(EXTRACT(EPOCH FROM (${endedAt} - ${timeEntries.startedAt})))::integer
        )`,
        endedAt,
        updatedAt: endedAt,
      })
      .where(
        and(
          eq(timeEntries.workspaceId, workspaceId),
          eq(timeEntries.taskId, taskId),
          isNull(timeEntries.endedAt),
        ),
      );
  }

  private async requireTaskRowForUpdate(
    db: Pick<DrizzleDB, 'select'>,
    workspaceId: string,
    taskId: string,
  ): Promise<TaskRow> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
      .limit(1)
      .for('update');
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private assertTrackableTask(task: TaskRow, project: ProjectRow): void {
    if (!project.isActive) {
      throw new UnprocessableEntityException('Project is inactive');
    }
    if (!task.isActive) {
      throw new UnprocessableEntityException('Task is inactive');
    }
    if (task.status === 'closed') {
      throw new UnprocessableEntityException('Task is closed');
    }
  }

  private handleTimeEntryReferenceConflict(error: unknown): void {
    const pgError = getPostgresError(error);
    if (
      pgError?.code === '23503' &&
      pgError.constraint === 'time_entries_task_id_tasks_id_fk'
    ) {
      throw new ConflictException('Task has related time entries');
    }
  }
}

function getPostgresError(error: unknown): {
  code?: unknown;
  constraint?: unknown;
} | null {
  if (typeof error !== 'object' || error === null) return null;
  const candidate = error as {
    code?: unknown;
    constraint?: unknown;
    cause?: unknown;
  };
  if (candidate.code !== undefined || candidate.constraint !== undefined) {
    return candidate;
  }
  return getPostgresError(candidate.cause);
}

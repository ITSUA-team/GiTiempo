import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type {
  CreateTaskInput,
  TaskResponse,
  UpdateTaskInput,
} from '@gitiempo/shared';
import { projectMemberSchema } from '@gitiempo/shared';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import type { AuthUser } from '../../auth/types/auth-user';
import { parseGitHubIssueExternalKey } from '../../github/github-issue-external-key';
import { workspaceMembers } from '../../members/schemas/workspace-members.schema';
import { projectAssignments } from '../../projects/schemas/project-assignments.schema';
import type { ProjectRow } from '../../projects/services/projects.service';
import { ProjectsService } from '../../projects/services/projects.service';
import { timeEntries } from '../../time-entries/schemas/time-entries.schema';
import { taskAssignees } from '../schemas/task-assignees.schema';
import { taskExternalRefs } from '../schemas/task-external-refs.schema';
import { tasks } from '../schemas/tasks.schema';

export type TaskRow = typeof tasks.$inferSelect;
type QueryExecutor = Pick<DrizzleDB, 'select' | 'update'>;
type SelectExecutor = Pick<DrizzleDB, 'select'>;
type TaskAssignmentMutationExecutor = Pick<
  DrizzleDB,
  'delete' | 'insert' | 'select'
>;
interface TaskResponseRow extends TaskRow {
  assignees: unknown;
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
  ): Promise<TaskResponse[]> {
    const project = await this.projects.requireVisibleProject(user, projectId);
    if (!project.isActive) {
      throw new NotFoundException('Project not found');
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
      .where(
        and(
          eq(tasks.workspaceId, user.workspaceId),
          eq(tasks.projectId, project.id),
          eq(tasks.isActive, true),
        ),
      );

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

    const row = await this.db.transaction(async (tx) => {
      const assigneeIds = input.assigneeIds ?? [];

      if (assigneeIds.length > 0) {
        await this.requireProjectAssignees(
          tx,
          user.workspaceId,
          project.id,
          assigneeIds,
        );
      }

      const [created] = await tx
        .insert(tasks)
        .values({
          workspaceId: user.workspaceId,
          projectId: project.id,
          title: input.title,
          description: input.description ?? null,
          priority: input.priority ?? 'medium',
          status: input.status ?? 'open',
        })
        .returning({ id: tasks.id });
      if (!created) throw new Error('Failed to create task');

      await this.insertTaskAssignees(
        tx,
        user.workspaceId,
        project.id,
        created.id,
        assigneeIds,
      );

      const response = await this.findTaskResponse(
        tx,
        user.workspaceId,
        created.id,
      );
      if (!response) throw new Error('Failed to load created task');
      return response;
    });
    return this.toResponse(row);
  }

  async getTask(user: AuthUser, taskId: string): Promise<TaskResponse> {
    const { task } = await this.requireVisibleTask(user, taskId);
    const row = await this.findTaskResponse(this.db, user.workspaceId, task.id);
    if (!row) throw new NotFoundException('Task not found');
    return this.toResponse(row);
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
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      updatedAt,
    };
    const shouldHandleTaskClose = input.status === 'closed';

    const row = await this.db.transaction(async (tx) => {
      if (input.assigneeIds !== undefined && input.assigneeIds.length > 0) {
        await this.requireProjectAssignees(
          tx,
          user.workspaceId,
          project.id,
          input.assigneeIds,
        );
      }

      const lockedTask = await this.requireTaskRowForUpdate(
        tx,
        user.workspaceId,
        task.id,
      );
      const [updated] = await tx
        .update(tasks)
        .set(updateValues)
        .where(eq(tasks.id, lockedTask.id))
        .returning({ id: tasks.id });

      if (!updated) throw new NotFoundException('Task not found');

      if (input.assigneeIds !== undefined) {
        await this.replaceTaskAssignees(
          tx,
          user.workspaceId,
          project.id,
          lockedTask.id,
          input.assigneeIds,
        );
      }

      if (shouldHandleTaskClose && lockedTask.status !== 'closed') {
        await this.stopRunningEntriesForTask(
          tx,
          user.workspaceId,
          lockedTask.id,
          updatedAt,
        );
      }

      const response = await this.findTaskResponse(
        tx,
        user.workspaceId,
        updated.id,
      );
      if (!response) throw new NotFoundException('Task not found');
      return response;
    });

    return this.toResponse(row);
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
  ): Promise<{ task: TaskRow; project: ProjectRow }> {
    const [row] = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, user.workspaceId)))
      .limit(1);
    if (!row) throw new NotFoundException('Task not found');

    const project = await this.projects.requireVisibleProject(
      user,
      row.projectId,
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
      description: tasks.description,
      priority: tasks.priority,
      status: tasks.status,
      assignees: sql<unknown>`COALESCE((
        SELECT json_agg(json_build_object(
          'userId', "task_assignees"."user_id",
          'displayName', "users"."display_name",
          'email', "users"."email",
          'avatarUrl', "users"."avatar_url",
          'role', "workspace_members"."role"
        ) ORDER BY COALESCE("users"."display_name", "users"."email"), "task_assignees"."user_id")
        FROM "task_assignees"
        INNER JOIN "project_assignments"
          ON "project_assignments"."workspace_id" = "task_assignees"."workspace_id"
          AND "project_assignments"."project_id" = "task_assignees"."project_id"
          AND "project_assignments"."user_id" = "task_assignees"."user_id"
        INNER JOIN "workspace_members"
          ON "workspace_members"."workspace_id" = "task_assignees"."workspace_id"
          AND "workspace_members"."user_id" = "task_assignees"."user_id"
        INNER JOIN "users"
          ON "users"."id" = "task_assignees"."user_id"
        WHERE "task_assignees"."task_id" = "tasks"."id"
      ), '[]'::json)`,
      isActive: tasks.isActive,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      githubIssueExternalKey: taskExternalRefs.externalKey,
    };
  }

  private async findTaskResponse(
    db: SelectExecutor,
    workspaceId: string,
    taskId: string,
  ): Promise<TaskResponseRow | null> {
    const [row] = await db
      .select(this.taskResponseSelection())
      .from(tasks)
      .leftJoin(
        taskExternalRefs,
        and(
          eq(taskExternalRefs.workspaceId, workspaceId),
          eq(taskExternalRefs.projectId, tasks.projectId),
          eq(taskExternalRefs.taskId, tasks.id),
          eq(taskExternalRefs.provider, 'github'),
          eq(taskExternalRefs.externalType, 'issue'),
        ),
      )
      .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
      .limit(1);
    return row ?? null;
  }

  private async requireProjectAssignees(
    db: SelectExecutor,
    workspaceId: string,
    projectId: string,
    userIds: string[],
  ): Promise<void> {
    const uniqueUserIds = [...new Set(userIds)];
    if (uniqueUserIds.length === 0) return;

    const rows = await db
      .select({ userId: projectAssignments.userId })
      .from(projectAssignments)
      .innerJoin(
        workspaceMembers,
        and(
          eq(workspaceMembers.workspaceId, projectAssignments.workspaceId),
          eq(workspaceMembers.userId, projectAssignments.userId),
        ),
      )
      .where(
        and(
          eq(projectAssignments.workspaceId, workspaceId),
          eq(projectAssignments.projectId, projectId),
          inArray(projectAssignments.userId, uniqueUserIds),
        ),
      );

    if (new Set(rows.map((row) => row.userId)).size !== uniqueUserIds.length) {
      throw new UnprocessableEntityException(
        'Assignees must be assigned to project',
      );
    }
  }

  private async replaceTaskAssignees(
    db: TaskAssignmentMutationExecutor,
    workspaceId: string,
    projectId: string,
    taskId: string,
    userIds: string[],
  ): Promise<void> {
    await db
      .delete(taskAssignees)
      .where(
        and(
          eq(taskAssignees.workspaceId, workspaceId),
          eq(taskAssignees.taskId, taskId),
        ),
      );

    await this.insertTaskAssignees(db, workspaceId, projectId, taskId, userIds);
  }

  private async insertTaskAssignees(
    db: Pick<DrizzleDB, 'insert'>,
    workspaceId: string,
    projectId: string,
    taskId: string,
    userIds: string[],
  ): Promise<void> {
    const uniqueUserIds = [...new Set(userIds)];
    if (uniqueUserIds.length === 0) return;

    await db.insert(taskAssignees).values(
      uniqueUserIds.map((userId) => ({
        workspaceId,
        projectId,
        taskId,
        userId,
      })),
    );
  }

  private toResponse(row: TaskResponseRow): TaskResponse {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      projectId: row.projectId,
      title: row.title,
      description: row.description,
      priority: row.priority,
      status: row.status,
      assignees: this.parseTaskAssignees(row.assignees),
      isActive: row.isActive,
      githubIssue: parseGitHubIssueExternalKey(row.githubIssueExternalKey),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private parseTaskAssignees(assignees: unknown) {
    return projectMemberSchema
      .array()
      .parse(Array.isArray(assignees) ? assignees : []);
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

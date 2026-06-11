import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type {
  CreateTaskInput,
  ProjectMember,
  TaskResponse,
  UpdateTaskInput,
} from '@gitiempo/shared';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import type { AuthUser } from '../../auth/types/auth-user';
import { workspaceMembers } from '../../members/schemas/workspace-members.schema';
import { projectAssignments } from '../../projects/schemas/project-assignments.schema';
import type { ProjectRow } from '../../projects/services/projects.service';
import { ProjectsService } from '../../projects/services/projects.service';
import { timeEntries } from '../../time-entries/schemas/time-entries.schema';
import { users } from '../../users/schemas/users.schema';
import { tasks } from '../schemas/tasks.schema';

export type TaskRow = typeof tasks.$inferSelect;
type QueryExecutor = Pick<DrizzleDB, 'select' | 'update'>;
type SelectExecutor = Pick<DrizzleDB, 'select'>;
type TaskResponseRow = TaskRow & {
  assigneeEmail: string | null;
  assigneeDisplayName: string | null;
  assigneeAvatarUrl: string | null;
  assigneeRole: ProjectMember['role'] | null;
};

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
        projectAssignments,
        and(
          eq(projectAssignments.workspaceId, tasks.workspaceId),
          eq(projectAssignments.projectId, tasks.projectId),
          eq(projectAssignments.userId, tasks.assigneeUserId),
        ),
      )
      .leftJoin(
        workspaceMembers,
        and(
          eq(workspaceMembers.workspaceId, projectAssignments.workspaceId),
          eq(workspaceMembers.userId, projectAssignments.userId),
        ),
      )
      .leftJoin(users, eq(users.id, projectAssignments.userId))
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
      if (input.assigneeId !== undefined && input.assigneeId !== null) {
        await this.requireProjectAssignee(
          tx,
          user.workspaceId,
          project.id,
          input.assigneeId,
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
          assigneeUserId: input.assigneeId ?? null,
        })
        .returning({ id: tasks.id });
      if (!created) throw new Error('Failed to create task');

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
      ...(input.assigneeId !== undefined
        ? { assigneeUserId: input.assigneeId }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      updatedAt,
    };
    const shouldHandleTaskClose = input.status === 'closed';

    const row = await this.db.transaction(async (tx) => {
      if (input.assigneeId !== undefined && input.assigneeId !== null) {
        await this.requireProjectAssignee(
          tx,
          user.workspaceId,
          project.id,
          input.assigneeId,
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
      assigneeUserId: tasks.assigneeUserId,
      assigneeEmail: users.email,
      assigneeDisplayName: users.displayName,
      assigneeAvatarUrl: users.avatarUrl,
      assigneeRole: workspaceMembers.role,
      isActive: tasks.isActive,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
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
        projectAssignments,
        and(
          eq(projectAssignments.workspaceId, tasks.workspaceId),
          eq(projectAssignments.projectId, tasks.projectId),
          eq(projectAssignments.userId, tasks.assigneeUserId),
        ),
      )
      .leftJoin(
        workspaceMembers,
        and(
          eq(workspaceMembers.workspaceId, projectAssignments.workspaceId),
          eq(workspaceMembers.userId, projectAssignments.userId),
        ),
      )
      .leftJoin(users, eq(users.id, projectAssignments.userId))
      .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
      .limit(1);
    return row ?? null;
  }

  private async requireProjectAssignee(
    db: SelectExecutor,
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<void> {
    const [row] = await db
      .select({ id: projectAssignments.id })
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
          eq(projectAssignments.userId, userId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new UnprocessableEntityException(
        'Assignee must be assigned to project',
      );
    }
  }

  private toResponse(row: TaskResponseRow): TaskResponse {
    const assignee =
      row.assigneeUserId !== null &&
      row.assigneeEmail !== null &&
      row.assigneeRole !== null
        ? {
            userId: row.assigneeUserId,
            displayName: row.assigneeDisplayName,
            email: row.assigneeEmail,
            avatarUrl: row.assigneeAvatarUrl,
            role: row.assigneeRole,
          }
        : null;

    return {
      id: row.id,
      workspaceId: row.workspaceId,
      projectId: row.projectId,
      title: row.title,
      description: row.description,
      priority: row.priority,
      status: row.status,
      assignee,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
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

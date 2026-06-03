import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import type {
  CreateTaskInput,
  TaskResponse,
  UpdateTaskInput,
} from '@gitiempo/shared';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import type { AuthUser } from '../../auth/types/auth-user';
import type { ProjectRow } from '../../projects/services/projects.service';
import { ProjectsService } from '../../projects/services/projects.service';
import { timeEntries } from '../../time-entries/schemas/time-entries.schema';
import { tasks } from '../schemas/tasks.schema';

export type TaskRow = typeof tasks.$inferSelect;
type QueryExecutor = Pick<DrizzleDB, 'select' | 'update'>;

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
      .select()
      .from(tasks)
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

    const [row] = await this.db
      .insert(tasks)
      .values({
        workspaceId: user.workspaceId,
        projectId: project.id,
        title: input.title,
      })
      .returning();
    if (!row) throw new Error('Failed to create task');
    return this.toResponse(row);
  }

  async getTask(user: AuthUser, taskId: string): Promise<TaskResponse> {
    const { task } = await this.requireVisibleTask(user, taskId);
    return this.toResponse(task);
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
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      updatedAt,
    };
    const shouldStopRunningEntries =
      input.status === 'closed' && task.status !== 'closed';

    if (shouldStopRunningEntries) {
      const row = await this.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(tasks)
          .set(updateValues)
          .where(eq(tasks.id, task.id))
          .returning();

        if (!updated) throw new NotFoundException('Task not found');

        await this.stopRunningEntriesForTask(
          tx,
          user.workspaceId,
          task.id,
          updatedAt,
        );
        return updated;
      });

      return this.toResponse(row);
    }

    const [row] = await this.db
      .update(tasks)
      .set(updateValues)
      .where(eq(tasks.id, task.id))
      .returning();

    if (!row) throw new NotFoundException('Task not found');
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
    if (!result.project.isActive) {
      throw new UnprocessableEntityException('Project is inactive');
    }
    if (!result.task.isActive) {
      throw new UnprocessableEntityException('Task is inactive');
    }
    if (result.task.status === 'closed') {
      throw new UnprocessableEntityException('Task is closed');
    }
    return result;
  }

  private toResponse(row: TaskRow): TaskResponse {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      projectId: row.projectId,
      title: row.title,
      status: row.status,
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
    const runningEntries = await db
      .select({ id: timeEntries.id, startedAt: timeEntries.startedAt })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.workspaceId, workspaceId),
          eq(timeEntries.taskId, taskId),
          isNull(timeEntries.endedAt),
        ),
      );

    for (const entry of runningEntries) {
      const endedAt = getTimerCloseTime(entry.startedAt, closedAt);

      await db
        .update(timeEntries)
        .set({
          endedAt,
          durationSeconds: calculateDurationSeconds(entry.startedAt, endedAt),
          updatedAt: endedAt,
        })
        .where(and(eq(timeEntries.id, entry.id), isNull(timeEntries.endedAt)));
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

function getTimerCloseTime(startedAt: Date, closedAt: Date): Date {
  return closedAt.getTime() > startedAt.getTime()
    ? closedAt
    : new Date(startedAt.getTime() + 1000);
}

function calculateDurationSeconds(startedAt: Date, endedAt: Date): number {
  return Math.max(
    1,
    Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000),
  );
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

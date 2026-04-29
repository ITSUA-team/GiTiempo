import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
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
import { tasks } from '../schemas/tasks.schema';

type TaskRow = typeof tasks.$inferSelect;

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
    const rows = await this.db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, user.workspaceId),
          eq(tasks.projectId, project.id),
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

    const [row] = await this.db
      .update(tasks)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, task.id))
      .returning();

    if (!row) throw new NotFoundException('Task not found');
    return this.toResponse(row);
  }

  private async requireVisibleTask(
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
}

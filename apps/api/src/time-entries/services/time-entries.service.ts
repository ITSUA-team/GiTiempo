import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  gte,
  isNull,
  lt,
  sql,
  type SQL,
} from 'drizzle-orm';
import type {
  CreateManualTimeEntryInput,
  CurrentTimeEntryResponse,
  StartTimerFromGitHubInput,
  StartTimerInput,
  TimeEntryListQuery,
  TimeEntryListResponse,
  TimeEntryResponse,
  TimeEntrySource,
  UpdateTimeEntryInput,
} from '@gitiempo/shared';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import {
  getPostgresError,
  POSTGRES_UNIQUE_VIOLATION,
} from '../../db/postgres-errors';
import type { AuthUser } from '../../auth/types/auth-user';
import { DomainError } from '../../commons/errors/domain-error';
import { normalizeGitHubRepoKey } from '../../github/github-repo-key';
import { parseGitHubIssueExternalKey } from '../../github/github-issue-external-key';
import { GithubTaskMaterializationService } from '../../github/services/github-task-materialization.service';
import { MembersService } from '../../members/services/members.service';
import { projectAssignments } from '../../projects/schemas/project-assignments.schema';
import { projects as projectsTable } from '../../projects/schemas/projects.schema';
import { ProjectsService } from '../../projects/services/projects.service';
import { taskExternalRefs } from '../../tasks/schemas/task-external-refs.schema';
import {
  taskRowSelection,
  tasks as tasksTable,
} from '../../tasks/schemas/tasks.schema';
import { TasksService } from '../../tasks/services/tasks.service';
import { users } from '../../users/schemas/users.schema';
import { UsersActivityService } from '../../users/services/users-activity.service';
import { calculateDurationSeconds } from '../time-entry-duration';
import {
  timeEntries,
  timeEntryRowSelection,
} from '../schemas/time-entries.schema';

type QueryExecutor = Pick<DrizzleDB, 'select' | 'insert' | 'update' | 'delete'>;
type TimeEntryRow = typeof timeEntries.$inferSelect;
type TaskRow = typeof tasksTable.$inferSelect;

interface TimeEntryResponseRow {
  id: string;
  workspaceId: string;
  taskId: string;
  projectId: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  description: string | null;
  isBillable: boolean;
  source: TimeEntrySource;
  createdAt: Date;
  updatedAt: Date;
  projectName: string;
  taskTitle: string;
  userEmail: string;
  userDisplayName: string | null;
  userAvatarUrl: string | null;
  githubIssueExternalKey: string | null;
}

@Injectable()
export class TimeEntriesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly members: MembersService,
    private readonly projects: ProjectsService,
    private readonly tasks: TasksService,
    private readonly usersActivity: UsersActivityService,
    private readonly githubTasks: GithubTaskMaterializationService,
  ) {}

  async listOwnEntries(
    user: AuthUser,
    query: TimeEntryListQuery,
  ): Promise<TimeEntryListResponse> {
    const conditions = this.buildListConditions(user.workspaceId, query);
    conditions.push(eq(timeEntries.userId, user.sub));

    return this.listEntries(this.db, conditions, query.page, query.limit);
  }

  async listProjectEntries(
    user: AuthUser,
    projectId: string,
    query: TimeEntryListQuery,
  ): Promise<TimeEntryListResponse> {
    const project = await this.projects.requireVisibleProject(user, projectId);
    const conditions = this.buildListConditions(user.workspaceId, query);
    conditions.push(eq(tasksTable.projectId, project.id));

    return this.listEntries(this.db, conditions, query.page, query.limit);
  }

  async createManualEntry(
    user: AuthUser,
    input: CreateManualTimeEntryInput,
  ): Promise<TimeEntryResponse> {
    const startedAt = new Date(input.startedAt);
    const endedAt = new Date(input.endedAt);
    const durationSeconds = calculateDurationSeconds(startedAt, endedAt);

    const entryId = await this.db.transaction(async (tx) => {
      const { task } = await this.tasks.requireTrackableTaskForUpdate(
        user,
        input.taskId,
        tx,
      );
      const [row] = await tx
        .insert(timeEntries)
        .values({
          workspaceId: user.workspaceId,
          taskId: task.id,
          userId: user.sub,
          startedAt,
          endedAt,
          durationSeconds,
          description: input.description ?? null,
          isBillable: input.isBillable ?? task.defaultBillableForTimeEntries,
          source: 'manual',
        })
        .returning({ id: timeEntries.id });
      if (!row) {
        throw DomainError.internal(
          'time_entry_create_failed',
          'Failed to create time entry',
        );
      }
      return row.id;
    });

    const result = await this.requireEntryResponse(this.db, entryId);
    void this.usersActivity.touchLastActive(user.sub);
    return result;
  }

  async getOwnEntry(
    user: AuthUser,
    entryId: string,
  ): Promise<TimeEntryResponse> {
    return this.requireEntryResponse(this.db, entryId, [
      eq(timeEntries.workspaceId, user.workspaceId),
      eq(timeEntries.userId, user.sub),
    ]);
  }

  async updateOwnEntry(
    user: AuthUser,
    entryId: string,
    input: UpdateTimeEntryInput,
  ): Promise<TimeEntryResponse> {
    const hasRunningOnlyConflict =
      input.startedAt !== undefined ||
      input.endedAt !== undefined ||
      input.isBillable !== undefined;

    const updatedId = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select(timeEntryRowSelection)
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.id, entryId),
            eq(timeEntries.workspaceId, user.workspaceId),
            eq(timeEntries.userId, user.sub),
          ),
        )
        .limit(1)
        .for('update');
      if (!row) throw new NotFoundException('Time entry not found');

      if (!row.endedAt) {
        if (hasRunningOnlyConflict) {
          throw new ConflictException(
            'Stop the timer before updating time or billable fields',
          );
        }

        const nextTaskId =
          input.taskId !== undefined && input.taskId !== row.taskId
            ? (
                await this.tasks.requireTrackableTaskForUpdate(
                  user,
                  input.taskId,
                  tx,
                )
              ).task.id
            : row.taskId;

        const [updated] = await tx
          .update(timeEntries)
          .set({
            ...(nextTaskId !== row.taskId ? { taskId: nextTaskId } : {}),
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
            updatedAt: new Date(),
          })
          .where(and(eq(timeEntries.id, row.id), isNull(timeEntries.endedAt)))
          .returning({ id: timeEntries.id });
        if (!updated) {
          throw DomainError.internal(
            'time_entry_update_failed',
            'Failed to update time entry',
          );
        }
        return updated.id;
      }

      const nextTaskId =
        input.taskId !== undefined && input.taskId !== row.taskId
          ? (
              await this.tasks.requireTrackableTaskForUpdate(
                user,
                input.taskId,
                tx,
              )
            ).task.id
          : row.taskId;
      const startedAt =
        input.startedAt !== undefined
          ? new Date(input.startedAt)
          : row.startedAt;
      const endedAt =
        input.endedAt !== undefined ? new Date(input.endedAt) : row.endedAt;
      const durationSeconds = calculateDurationSeconds(startedAt, endedAt);

      const [updated] = await tx
        .update(timeEntries)
        .set({
          ...(nextTaskId !== row.taskId ? { taskId: nextTaskId } : {}),
          ...(input.startedAt !== undefined ? { startedAt } : {}),
          ...(input.endedAt !== undefined ? { endedAt } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.isBillable !== undefined
            ? { isBillable: input.isBillable }
            : {}),
          durationSeconds,
          updatedAt: new Date(),
        })
        .where(eq(timeEntries.id, row.id))
        .returning({ id: timeEntries.id });
      if (!updated) {
        throw DomainError.internal(
          'time_entry_update_failed',
          'Failed to update time entry',
        );
      }
      return updated.id;
    });

    const result = await this.requireEntryResponse(this.db, updatedId);
    void this.usersActivity.touchLastActive(user.sub);
    return result;
  }

  async deleteOwnEntry(user: AuthUser, entryId: string): Promise<void> {
    const row = await this.requireOwnEntryRow(user, entryId);
    if (!row.endedAt) {
      throw new ConflictException('Stop the timer before deleting it');
    }

    await this.db.delete(timeEntries).where(eq(timeEntries.id, row.id));
    void this.usersActivity.touchLastActive(user.sub);
  }

  async getCurrentTimer(user: AuthUser): Promise<CurrentTimeEntryResponse> {
    const [row] = await this.db
      .select({ id: timeEntries.id })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.workspaceId, user.workspaceId),
          eq(timeEntries.userId, user.sub),
          isNull(timeEntries.endedAt),
        ),
      )
      .limit(1);

    if (!row) return { timeEntry: null };
    return { timeEntry: await this.requireEntryResponse(this.db, row.id) };
  }

  async startTimer(
    user: AuthUser,
    input: StartTimerInput,
  ): Promise<TimeEntryResponse> {
    const result = await this.createRunningEntry(
      user,
      input.taskId,
      'web',
      input.description ?? null,
    );
    void this.usersActivity.touchLastActive(user.sub);
    return result;
  }

  async startTimerFromGitHub(
    user: AuthUser,
    input: StartTimerFromGitHubInput,
  ): Promise<TimeEntryResponse> {
    const githubRepo = normalizeGitHubRepoKey(input.githubRepo);
    if (!githubRepo) {
      throw new UnprocessableEntityException('GitHub repository is invalid');
    }

    const membership = await this.members.requireActiveMembership(
      user.sub,
      user.workspaceId,
    );
    const issueKey = `${githubRepo}#${input.issueNumber}`;

    try {
      const entryId = await this.db.transaction(async (tx) => {
        const { project, created } = await this.githubTasks.findOrCreateProjectForRepo(
          tx,
          user,
          githubRepo,
        );
        if (!project.isActive) {
          throw new UnprocessableEntityException('Project is inactive');
        }

        if (membership.role !== 'admin') {
          if (!created) {
            await this.projects.requireVisibleProject(user, project.id);
          } else {
            await tx
              .insert(projectAssignments)
              .values({
                workspaceId: user.workspaceId,
                projectId: project.id,
                userId: user.sub,
                assignedBy: user.sub,
              })
              .onConflictDoNothing({
                target: [
                  projectAssignments.projectId,
                  projectAssignments.userId,
                ],
              });
          }
        }

        const task = await this.githubTasks.findOrCreateTaskForIssue(tx, {
          workspaceId: user.workspaceId,
          projectId: project.id,
          issueKey,
          issueTitle: input.issueTitle,
          defaultBillableForTimeEntries: project.defaultBillableForTasks,
        });
        const lockedTask = await this.requireTaskRowForUpdate(
          tx,
          user.workspaceId,
          project.id,
          task.id,
        );
        if (!lockedTask.isActive) {
          throw new UnprocessableEntityException('Task is inactive');
        }
        if (lockedTask.status === 'closed') {
          throw new UnprocessableEntityException('Task is closed');
        }

        const [entry] = await tx
          .insert(timeEntries)
          .values({
            workspaceId: user.workspaceId,
            taskId: lockedTask.id,
            userId: user.sub,
            isBillable: lockedTask.defaultBillableForTimeEntries,
            startedAt: new Date(),
            source: 'extension',
          })
          .returning({ id: timeEntries.id });
        if (!entry) {
          throw DomainError.internal(
            'timer_start_failed',
            'Failed to start timer',
          );
        }
        return entry.id;
      });

      const result = await this.requireEntryResponse(this.db, entryId);
      void this.usersActivity.touchLastActive(user.sub);
      return result;
    } catch (error) {
      this.handleRunningTimerConflict(error);
      throw error;
    }
  }

  async stopTimer(user: AuthUser): Promise<TimeEntryResponse> {
    const entryId = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select(timeEntryRowSelection)
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.workspaceId, user.workspaceId),
            eq(timeEntries.userId, user.sub),
            isNull(timeEntries.endedAt),
          ),
        )
        .limit(1)
        .for('update');
      if (!row) throw new NotFoundException('Running timer not found');

      const endedAt = new Date();
      const durationSeconds = calculateDurationSeconds(row.startedAt, endedAt);
      const [updated] = await tx
        .update(timeEntries)
        .set({
          endedAt,
          durationSeconds,
          updatedAt: endedAt,
        })
        .where(eq(timeEntries.id, row.id))
        .returning({ id: timeEntries.id });
      if (!updated) {
        throw DomainError.internal('timer_stop_failed', 'Failed to stop timer');
      }
      return updated.id;
    });

    const result = await this.requireEntryResponse(this.db, entryId);
    void this.usersActivity.touchLastActive(user.sub);
    return result;
  }

  private async createRunningEntry(
    user: AuthUser,
    taskId: string,
    source: TimeEntrySource,
    description: string | null = null,
  ): Promise<TimeEntryResponse> {
    try {
      const entryId = await this.db.transaction(async (tx) => {
        const { task } = await this.tasks.requireTrackableTaskForUpdate(
          user,
          taskId,
          tx,
        );
        const [row] = await tx
          .insert(timeEntries)
          .values({
            description,
            workspaceId: user.workspaceId,
            taskId: task.id,
            userId: user.sub,
            isBillable: task.defaultBillableForTimeEntries,
            startedAt: new Date(),
            source,
          })
          .returning({ id: timeEntries.id });
        if (!row) {
          throw DomainError.internal(
            'timer_start_failed',
            'Failed to start timer',
          );
        }
        return row.id;
      });

      return this.requireEntryResponse(this.db, entryId);
    } catch (error) {
      this.handleRunningTimerConflict(error);
      throw error;
    }
  }

  private buildListConditions(
    workspaceId: string,
    query: TimeEntryListQuery,
  ): SQL[] {
    const conditions: SQL[] = [eq(timeEntries.workspaceId, workspaceId)];
    if (query.dateFrom !== undefined) {
      conditions.push(gte(timeEntries.startedAt, new Date(query.dateFrom)));
    }
    if (query.dateTo !== undefined) {
      conditions.push(lt(timeEntries.startedAt, new Date(query.dateTo)));
    }
    if (query.projectId !== undefined) {
      conditions.push(eq(tasksTable.projectId, query.projectId));
    }
    if (query.taskId !== undefined) {
      conditions.push(eq(timeEntries.taskId, query.taskId));
    }
    if (query.search !== undefined) {
      const searchPattern = `%${escapeLikePattern(query.search)}%`;
      conditions.push(
        sql`${tasksTable.title} ILIKE ${searchPattern} ESCAPE '\'`,
      );
    }
    return conditions;
  }

  private async listEntries(
    db: QueryExecutor,
    conditions: SQL[],
    page: number,
    limit: number,
  ): Promise<TimeEntryListResponse> {
    const where = and(...conditions);
    const offset = (page - 1) * limit;

    const rows = await db
      .select(this.entrySelection())
      .from(timeEntries)
      .innerJoin(tasksTable, eq(tasksTable.id, timeEntries.taskId))
      .innerJoin(projectsTable, eq(projectsTable.id, tasksTable.projectId))
      .innerJoin(users, eq(users.id, timeEntries.userId))
      .leftJoin(
        taskExternalRefs,
        and(
          eq(taskExternalRefs.taskId, tasksTable.id),
          eq(taskExternalRefs.provider, 'github'),
          eq(taskExternalRefs.externalType, 'issue'),
        ),
      )
      .where(where)
      .orderBy(desc(timeEntries.startedAt), desc(timeEntries.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalRow] = await db
      .select({ value: count() })
      .from(timeEntries)
      .innerJoin(tasksTable, eq(tasksTable.id, timeEntries.taskId))
      .where(where);
    const total = totalRow?.value ?? 0;

    return {
      items: rows.map((row) => this.toResponse(row)),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  private async requireEntryResponse(
    db: QueryExecutor,
    entryId: string,
    extraConditions: SQL[] = [],
  ): Promise<TimeEntryResponse> {
    const row = await this.findEntryResponse(db, entryId, extraConditions);
    if (!row) throw new NotFoundException('Time entry not found');
    return row;
  }

  private async findEntryResponse(
    db: QueryExecutor,
    entryId: string,
    extraConditions: SQL[] = [],
  ): Promise<TimeEntryResponse | null> {
    const [row] = await db
      .select(this.entrySelection())
      .from(timeEntries)
      .innerJoin(tasksTable, eq(tasksTable.id, timeEntries.taskId))
      .innerJoin(projectsTable, eq(projectsTable.id, tasksTable.projectId))
      .innerJoin(users, eq(users.id, timeEntries.userId))
      .leftJoin(
        taskExternalRefs,
        and(
          eq(taskExternalRefs.taskId, tasksTable.id),
          eq(taskExternalRefs.provider, 'github'),
          eq(taskExternalRefs.externalType, 'issue'),
        ),
      )
      .where(and(eq(timeEntries.id, entryId), ...extraConditions))
      .limit(1);

    return row ? this.toResponse(row) : null;
  }

  private async requireOwnEntryRow(
    user: AuthUser,
    entryId: string,
  ): Promise<TimeEntryRow> {
    const [row] = await this.db
      .select(timeEntryRowSelection)
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.id, entryId),
          eq(timeEntries.workspaceId, user.workspaceId),
          eq(timeEntries.userId, user.sub),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Time entry not found');
    return row;
  }

  private entrySelection() {
    return {
      id: timeEntries.id,
      workspaceId: timeEntries.workspaceId,
      taskId: timeEntries.taskId,
      projectId: tasksTable.projectId,
      userId: timeEntries.userId,
      startedAt: timeEntries.startedAt,
      endedAt: timeEntries.endedAt,
      durationSeconds: timeEntries.durationSeconds,
      description: timeEntries.description,
      isBillable: timeEntries.isBillable,
      source: timeEntries.source,
      createdAt: timeEntries.createdAt,
      updatedAt: timeEntries.updatedAt,
      projectName: projectsTable.name,
      taskTitle: tasksTable.title,
      userEmail: users.email,
      userDisplayName: users.displayName,
      userAvatarUrl: users.avatarUrl,
      githubIssueExternalKey: taskExternalRefs.externalKey,
    };
  }

  private toResponse(row: TimeEntryResponseRow): TimeEntryResponse {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      taskId: row.taskId,
      projectId: row.projectId,
      userId: row.userId,
      startedAt: row.startedAt.toISOString(),
      endedAt: row.endedAt?.toISOString() ?? null,
      durationSeconds: row.durationSeconds,
      description: row.description,
      isBillable: row.isBillable,
      source: row.source,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      project: {
        id: row.projectId,
        name: row.projectName,
      },
      task: {
        id: row.taskId,
        title: row.taskTitle,
      },
      user: {
        id: row.userId,
        email: row.userEmail,
        displayName: row.userDisplayName,
        avatarUrl: row.userAvatarUrl,
      },
      githubIssue: parseGitHubIssueExternalKey(row.githubIssueExternalKey),
    };
  }

  private async requireTaskRowForUpdate(
    db: QueryExecutor,
    workspaceId: string,
    projectId: string,
    taskId: string,
  ): Promise<TaskRow> {
    const [task] = await db
      .select(taskRowSelection)
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.id, taskId),
          eq(tasksTable.workspaceId, workspaceId),
          eq(tasksTable.projectId, projectId),
        ),
      )
      .limit(1)
      .for('update');
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private handleRunningTimerConflict(error: unknown): void {
    const pgError = getPostgresError(error);
    if (
      pgError?.code === POSTGRES_UNIQUE_VIOLATION &&
      pgError.constraint === 'time_entries_running_unique'
    ) {
      throw new ConflictException('A timer is already running');
    }
  }
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

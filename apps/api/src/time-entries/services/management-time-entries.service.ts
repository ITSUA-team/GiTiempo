import {
  ForbiddenException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  eq,
  exists,
  gt,
  inArray,
  lt,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { AuthUser } from '../../auth/types/auth-user';
import { DomainError } from '../../commons/errors/domain-error';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import { workspaceMembers } from '../../members/schemas/workspace-members.schema';
import { projectAssignments } from '../../projects/schemas/project-assignments.schema';
import { projects } from '../../projects/schemas/projects.schema';
import { tasks } from '../../tasks/schemas/tasks.schema';
import { users } from '../../users/schemas/users.schema';
import { UsersActivityService } from '../../users/services/users-activity.service';
import type {
  CreateManagedTimeEntryDto,
  ManagementProjectsQueryDto,
  ManagementTimeEntriesQueryDto,
  ManagementTimeEntryMembersQueryDto,
  ManagementTimeEntryTasksQueryDto,
  UpdateManagedTimeEntryDto,
} from '../dto/management-time-entries.dto';
import { timeEntries } from '../schemas/time-entries.schema';
import { calculateDurationSeconds } from '../time-entry-duration';
import {
  allowsTrackingFromOwnTime,
  hasImplicitTrackingAccess,
  implicitTrackingMemberCondition,
  ownTaskTimeCondition,
  taskTrackingBlockReason,
  trackableTaskCondition,
  trackingAssignmentCondition,
} from '../tracking-access';
import { TimeEntriesService } from './time-entries.service';

type Transaction = Parameters<Parameters<DrizzleDB['transaction']>[0]>[0];
type Project = Pick<
  typeof projects.$inferSelect,
  'id' | 'workspaceId' | 'isActive' | 'visibility' | 'trackingMode'
>;
type Task = Pick<
  typeof tasks.$inferSelect,
  'id' | 'isActive' | 'status' | 'defaultBillableForTimeEntries'
>;
type Membership = Pick<typeof workspaceMembers.$inferSelect, 'role'>;
type Page = ManagementProjectsQueryDto;

const memberSelection = {
  id: users.id,
  displayName: users.displayName,
  email: users.email,
};

const taskSelection = {
  id: tasks.id,
  title: tasks.title,
  defaultBillableForTimeEntries: tasks.defaultBillableForTimeEntries,
};

const memberLabel = sql`lower(coalesce(nullif(${users.displayName}, ''), ${users.email}))`;

@Injectable()
export class ManagementTimeEntriesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly timeEntryQueries: TimeEntriesService,
    private readonly usersActivity: UsersActivityService,
  ) {}

  listProjects(actor: AuthUser, query: Page) {
    return this.db.transaction(async (tx) => {
      const role = await this.requireManager(tx, actor);
      const scope = and(
        eq(projects.workspaceId, actor.workspaceId),
        role === 'pm'
          ? exists(
              tx
                .select({ id: projectAssignments.id })
                .from(projectAssignments)
                .where(
                  and(
                    eq(projectAssignments.projectId, projects.id),
                    eq(projectAssignments.workspaceId, actor.workspaceId),
                    eq(projectAssignments.userId, actor.sub),
                  ),
                ),
            )
          : undefined,
      );

      return this.page(
        query,
        tx
          .select({
            id: projects.id,
            name: projects.name,
            isActive: projects.isActive,
          })
          .from(projects)
          .where(scope)
          .orderBy(asc(sql`lower(${projects.name})`), asc(projects.id))
          .limit(query.limit)
          .offset(this.offset(query)),
        tx.select({ total: count() }).from(projects).where(scope),
      );
    });
  }

  listMembers(
    actor: AuthUser,
    projectId: string,
    query: ManagementTimeEntryMembersQueryDto,
  ) {
    return this.db.transaction(async (tx) => {
      const project = await this.requireProject(tx, actor, projectId);
      const scope =
        query.purpose === 'filter'
          ? exists(
              tx
                .select({ id: timeEntries.id })
                .from(timeEntries)
                .where(
                  and(
                    eq(timeEntries.workspaceId, project.workspaceId),
                    eq(timeEntries.userId, users.id),
                    inArray(
                      timeEntries.taskId,
                      this.projectTaskIds(tx, project),
                    ),
                  ),
                ),
            )
          : exists(
              tx
                .select({ id: workspaceMembers.id })
                .from(workspaceMembers)
                .where(
                  and(
                    eq(workspaceMembers.workspaceId, project.workspaceId),
                    eq(workspaceMembers.userId, users.id),
                    exists(
                      tx
                        .select({ id: tasks.id })
                        .from(tasks)
                        .where(this.eligibleTaskCondition(tx, project)),
                    ),
                  ),
                ),
            );

      return this.page(
        query,
        tx
          .select(memberSelection)
          .from(users)
          .where(scope)
          .orderBy(memberLabel, asc(users.id))
          .limit(query.limit)
          .offset(this.offset(query)),
        tx.select({ total: count() }).from(users).where(scope),
      );
    });
  }

  listTasks(
    actor: AuthUser,
    projectId: string,
    query: ManagementTimeEntryTasksQueryDto,
  ) {
    return this.db.transaction(async (tx) => {
      const project = await this.requireProject(tx, actor, projectId);
      const scope = exists(
        tx
          .select({ id: workspaceMembers.id })
          .from(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.workspaceId, project.workspaceId),
              eq(workspaceMembers.userId, query.userId),
              this.eligibleTaskCondition(tx, project),
            ),
          ),
      );

      return this.page(
        query,
        tx
          .select(taskSelection)
          .from(tasks)
          .where(scope)
          .orderBy(asc(sql`lower(${tasks.title})`), asc(tasks.id))
          .limit(query.limit)
          .offset(this.offset(query)),
        tx.select({ total: count() }).from(tasks).where(scope),
      );
    });
  }

  listEntries(
    actor: AuthUser,
    projectId: string,
    query: ManagementTimeEntriesQueryDto,
  ) {
    return this.db.transaction(async (tx) => {
      await this.requireProject(tx, actor, projectId);
      return this.timeEntryQueries.listManagedProjectEntries(
        tx,
        actor.workspaceId,
        projectId,
        query,
      );
    });
  }

  async createEntry(
    actor: AuthUser,
    projectId: string,
    input: CreateManagedTimeEntryDto,
  ) {
    const result = await this.db.transaction(async (tx) => {
      const role = await this.requireManager(tx, actor);
      const owner = await this.lockMembership(
        tx,
        actor.workspaceId,
        input.userId,
      );
      const project = await this.lockManageableProject(
        tx,
        actor,
        projectId,
        role,
      );
      const task = await this.lockTask(tx, project, input.taskId);
      if (!task) throw new NotFoundException('Task not found');
      const access = await this.lockTrackingAccess(
        tx,
        project,
        input.userId,
        owner,
      );
      const hasOwnTime =
        access === 'own-time' &&
        (await this.lockOwnTime(
          tx,
          ownTaskTimeCondition(project.workspaceId, input.userId, task.id),
        ));
      this.assertEligibleOwner(
        project,
        task,
        owner,
        access === 'project' || hasOwnTime,
      );

      const startedAt = new Date(input.startedAt);
      const endedAt = new Date(input.endedAt);
      const [entry] = await tx
        .insert(timeEntries)
        .values({
          workspaceId: project.workspaceId,
          userId: input.userId,
          taskId: task.id,
          startedAt,
          endedAt,
          durationSeconds: calculateDurationSeconds(startedAt, endedAt),
          isBillable: input.isBillable ?? task.defaultBillableForTimeEntries,
          description: input.description ?? null,
          source: 'manual',
        })
        .returning({ id: timeEntries.id });
      if (!entry)
        throw DomainError.internal(
          'time_entry_create_failed',
          'Failed to create time entry',
        );

      return this.timeEntryQueries.getManagedEntryResponse(
        tx,
        project.workspaceId,
        projectId,
        entry.id,
      );
    });
    void this.usersActivity.touchLastActive(actor.sub);
    return result;
  }

  async updateEntry(
    actor: AuthUser,
    projectId: string,
    entryId: string,
    input: UpdateManagedTimeEntryDto,
  ) {
    const result = await this.db.transaction(async (tx) => {
      const role = await this.requireManager(tx, actor);
      // Timer starts lock membership before the project. The entry owner is fixed.
      const owner =
        input.taskId === undefined
          ? undefined
          : await this.lockEntryOwner(
              tx,
              actor.workspaceId,
              projectId,
              entryId,
            );
      const project = await this.lockManageableProject(
        tx,
        actor,
        projectId,
        role,
      );
      const access = owner
        ? await this.lockTrackingAccess(
            tx,
            project,
            owner.userId,
            owner.membership,
          )
        : undefined;
      const evidence =
        access === 'own-time' && owner && input.taskId !== undefined
          ? ownTaskTimeCondition(
              project.workspaceId,
              owner.userId,
              input.taskId,
            )
          : undefined;
      const { entry, hasOwnTime } = await this.requireEditableEntry(
        tx,
        project,
        entryId,
        input.taskId,
        evidence,
      );
      if (input.taskId !== undefined && input.taskId !== entry.taskId) {
        const destination = await this.lockTask(tx, project, input.taskId);
        if (!destination) throw new NotFoundException('Task not found');
        this.assertEligibleOwner(
          project,
          destination,
          owner?.membership,
          access === 'project' || hasOwnTime,
        );
      }

      const startedAt =
        input.startedAt === undefined
          ? entry.startedAt
          : new Date(input.startedAt);
      const endedAt =
        input.endedAt === undefined ? entry.endedAt : new Date(input.endedAt);
      await tx
        .update(timeEntries)
        .set({
          taskId: input.taskId === entry.taskId ? undefined : input.taskId,
          startedAt: input.startedAt === undefined ? undefined : startedAt,
          endedAt: input.endedAt === undefined ? undefined : endedAt,
          durationSeconds: calculateDurationSeconds(startedAt, endedAt),
          description: input.description,
          isBillable: input.isBillable,
          updatedAt: new Date(),
        })
        .where(eq(timeEntries.id, entry.id));

      return this.timeEntryQueries.getManagedEntryResponse(
        tx,
        project.workspaceId,
        projectId,
        entry.id,
      );
    });
    void this.usersActivity.touchLastActive(actor.sub);
    return result;
  }

  async deleteEntry(
    actor: AuthUser,
    projectId: string,
    entryId: string,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const project = await this.requireProject(tx, actor, projectId);
      const { entry } = await this.requireEditableEntry(tx, project, entryId);
      await tx.delete(timeEntries).where(eq(timeEntries.id, entry.id));
    });
    void this.usersActivity.touchLastActive(actor.sub);
  }

  private async requireManager(tx: Transaction, actor: AuthUser) {
    const membership = await this.lockMembership(
      tx,
      actor.workspaceId,
      actor.sub,
    );
    if (membership?.role !== 'admin' && membership?.role !== 'pm') {
      throw new ForbiddenException('Workspace role cannot manage time entries');
    }
    return membership.role;
  }

  private async requireProject(
    tx: Transaction,
    actor: AuthUser,
    projectId: string,
  ): Promise<Project> {
    const role = await this.requireManager(tx, actor);
    return this.lockManageableProject(tx, actor, projectId, role);
  }

  private async lockManageableProject(
    tx: Transaction,
    actor: AuthUser,
    projectId: string,
    role: 'admin' | 'pm',
  ): Promise<Project> {
    const [project] = await tx
      .select({
        id: projects.id,
        workspaceId: projects.workspaceId,
        isActive: projects.isActive,
        visibility: projects.visibility,
        trackingMode: projects.trackingMode,
      })
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, actor.workspaceId),
          eq(projects.id, projectId),
        ),
      )
      .for('share');
    if (
      !project ||
      (role === 'pm' && !(await this.lockAssignment(tx, project, actor.sub)))
    ) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  private async requireEditableEntry(
    tx: Transaction,
    project: Project,
    entryId: string,
    destinationTaskId?: string,
    evidence?: SQL,
  ) {
    const destinationScope =
      destinationTaskId === undefined
        ? undefined
        : exists(this.projectTaskIds(tx, project, destinationTaskId));
    const eligibleEvidence = evidence && and(evidence, destinationScope);
    // Lock proof before or after the edited row by ID, matching invoice writes.
    const earlierProof =
      Boolean(eligibleEvidence) &&
      (await this.lockOwnTime(
        tx,
        and(eligibleEvidence, lt(timeEntries.id, entryId)),
      ));
    const [entry] = await tx
      .select({
        id: timeEntries.id,
        taskId: timeEntries.taskId,
        startedAt: timeEntries.startedAt,
        endedAt: timeEntries.endedAt,
        invoiceId: timeEntries.invoiceId,
      })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.id, entryId),
          eq(timeEntries.workspaceId, project.workspaceId),
          inArray(timeEntries.taskId, this.projectTaskIds(tx, project)),
          destinationScope,
        ),
      )
      .for('update');
    if (!entry) throw new NotFoundException('Time entry not found');
    if (!entry.endedAt) {
      throw new DomainError(
        'time_entry_running',
        'Stop the timer before editing or deleting this entry',
        HttpStatus.CONFLICT,
      );
    }
    if (entry.invoiceId !== null) {
      throw new DomainError(
        'time_entry_invoiced',
        'This time entry is included in an invoice',
        HttpStatus.CONFLICT,
      );
    }
    return {
      entry: { ...entry, endedAt: entry.endedAt },
      hasOwnTime:
        earlierProof ||
        (Boolean(eligibleEvidence) &&
          destinationTaskId !== entry.taskId &&
          (await this.lockOwnTime(
            tx,
            and(eligibleEvidence, gt(timeEntries.id, entryId)),
          ))),
    };
  }

  private async lockOwnTime(tx: Transaction, condition: SQL | undefined) {
    const [entry] = await tx
      .select({ id: timeEntries.id })
      .from(timeEntries)
      .where(condition)
      .orderBy(asc(timeEntries.id))
      .limit(1)
      // Retasks explicitly lock FOR UPDATE. Closing a task may still stop its timer.
      .for('key share');
    return entry !== undefined;
  }

  private async lockTrackingAccess(
    tx: Transaction,
    project: Project,
    ownerId: string,
    owner: Membership | undefined,
  ) {
    if (!owner || !project.isActive) return undefined;
    if (
      hasImplicitTrackingAccess(owner.role, project.visibility) ||
      (await this.lockAssignment(tx, project, ownerId))
    )
      return 'project';
    return allowsTrackingFromOwnTime(project.trackingMode)
      ? 'own-time'
      : undefined;
  }

  private assertEligibleOwner(
    project: Project,
    task: Task,
    owner: Membership | undefined,
    canTrack: boolean,
  ) {
    if (!owner || !project.isActive || taskTrackingBlockReason(task)) {
      throw new UnprocessableEntityException(
        'Owner or work is ineligible for time tracking',
      );
    }
    if (!canTrack) {
      throw new UnprocessableEntityException(
        'Owner cannot track time on this task',
      );
    }
  }

  private eligibleTaskCondition(tx: Transaction, project: Project) {
    return and(
      eq(tasks.workspaceId, project.workspaceId),
      eq(tasks.projectId, project.id),
      trackableTaskCondition(),
      project.isActive ? undefined : sql`false`,
      hasImplicitTrackingAccess('member', project.visibility)
        ? undefined
        : or(
            implicitTrackingMemberCondition(),
            exists(
              tx
                .select({ id: projectAssignments.id })
                .from(projectAssignments)
                .where(
                  trackingAssignmentCondition(
                    project.workspaceId,
                    project.id,
                    workspaceMembers.userId,
                  ),
                ),
            ),
            allowsTrackingFromOwnTime(project.trackingMode)
              ? exists(
                  tx
                    .select({ id: timeEntries.id })
                    .from(timeEntries)
                    .where(
                      ownTaskTimeCondition(
                        project.workspaceId,
                        workspaceMembers.userId,
                        tasks.id,
                      ),
                    ),
                )
              : undefined,
          ),
    );
  }

  private async lockAssignment(
    tx: Transaction,
    project: Project,
    userId: string,
  ) {
    const [assignment] = await tx
      .select({ id: projectAssignments.id })
      .from(projectAssignments)
      .where(
        trackingAssignmentCondition(project.workspaceId, project.id, userId),
      )
      .for('share');
    return assignment;
  }

  private async lockMembership(
    tx: Transaction,
    workspaceId: string,
    userId: string,
  ) {
    const [membership] = await tx
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      )
      .for('share');
    return membership;
  }

  private async lockEntryOwner(
    tx: Transaction,
    workspaceId: string,
    projectId: string,
    entryId: string,
  ) {
    const [owner] = await tx
      .select({ userId: timeEntries.userId })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.workspaceId, workspaceId),
          eq(timeEntries.id, entryId),
          inArray(
            timeEntries.taskId,
            this.projectTaskIds(tx, { id: projectId, workspaceId }),
          ),
        ),
      );
    if (!owner) return undefined;
    return {
      userId: owner.userId,
      membership: await this.lockMembership(tx, workspaceId, owner.userId),
    };
  }

  private async lockTask(tx: Transaction, project: Project, taskId: string) {
    const [task] = await tx
      .select({
        ...taskSelection,
        isActive: tasks.isActive,
        status: tasks.status,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, project.workspaceId),
          eq(tasks.projectId, project.id),
          eq(tasks.id, taskId),
        ),
      )
      .for('share');
    return task;
  }

  private projectTaskIds(
    tx: Transaction,
    project: Pick<Project, 'id' | 'workspaceId'>,
    taskId?: string,
  ) {
    return tx
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, project.workspaceId),
          eq(tasks.projectId, project.id),
          taskId === undefined ? undefined : eq(tasks.id, taskId),
        ),
      );
  }

  private offset({ page, limit }: Page) {
    return (page - 1) * limit;
  }

  private async page<T>(
    query: Page,
    rows: PromiseLike<T[]>,
    counts: PromiseLike<{ total: number }[]>,
  ) {
    const items = await rows;
    const [result] = await counts;
    const total = result?.total ?? 0;
    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}

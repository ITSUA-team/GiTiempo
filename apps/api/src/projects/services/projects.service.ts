import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, eq, gte, isNotNull, lt, or, sql, type SQL } from 'drizzle-orm';
import type {
  CreateProjectAssignmentInput,
  CreateProjectInput,
  ManagementProjectSummaryResponse,
  MyProjectSummaryResponse,
  ProjectAssignedMembersSummary,
  ProjectAssignmentResponse,
  ProjectDetailResponse,
  ProjectMember,
  ProjectProviderSummary,
  ProjectResponse,
  ProjectSource,
  ProjectTrackedSummary,
  UpdateProjectInput,
} from '@gitiempo/shared';
import { projectMemberSchema } from '@gitiempo/shared';
import type { AuthUser } from '../../auth/types/auth-user';
import { startOfUtcIsoWeek, startOfUtcMonth } from '../../common/time';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import { MembersService } from '../../members/services/members.service';
import { workspaceMembers } from '../../members/schemas/workspace-members.schema';
import { tasks as tasksTable } from '../../tasks/schemas/tasks.schema';
import { timeEntries } from '../../time-entries/schemas/time-entries.schema';
import { users } from '../../users/schemas/users.schema';
import { projectAssignments } from '../schemas/project-assignments.schema';
import { projectExternalRefs } from '../schemas/project-external-refs.schema';
import { projects } from '../schemas/projects.schema';

export type ProjectRow = typeof projects.$inferSelect;
type ProjectResponseRow = ProjectRow & {
  source: ProjectSource;
  totalSeconds: number | string | null;
  members?: unknown;
};
type ProjectAssignmentRow = Omit<ProjectAssignmentResponse, 'assignedAt'> & {
  assignedAt: Date;
};

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly members: MembersService,
  ) {}

  async listProjects(user: AuthUser): Promise<ProjectResponse[]> {
    const membership = await this.members.requireActiveMembership(
      user.sub,
      user.workspaceId,
    );

    if (membership.role === 'admin') {
      const rows = await this.db
        .select(this.projectResponseSelection())
        .from(projects)
        .where(eq(projects.workspaceId, user.workspaceId));
      return rows.map((row) => this.toProjectResponse(row));
    }

    const rows = await this.db
      .select(this.projectResponseSelection())
      .from(projects)
      .leftJoin(
        projectAssignments,
        and(
          eq(projectAssignments.projectId, projects.id),
          eq(projectAssignments.userId, user.sub),
        ),
      )
      .where(
        and(
          eq(projects.workspaceId, user.workspaceId),
          eq(projects.isActive, true),
          or(
            eq(projects.visibility, 'public'),
            eq(projectAssignments.userId, user.sub),
          ),
        ),
      );

    return rows.map((row) => this.toProjectResponse(row));
  }

  async getManagementSummary(
    user: AuthUser,
  ): Promise<ManagementProjectSummaryResponse> {
    const membership = await this.members.requireRole(
      user.sub,
      user.workspaceId,
      ['admin', 'pm'],
    );

    const conditions: SQL[] = [
      eq(projects.workspaceId, user.workspaceId),
      eq(projects.isActive, true),
    ];
    if (membership.role !== 'admin') {
      conditions.push(this.visibleNonAdminProjectCondition(user.sub));
    }

    const [row] = await this.db
      .select({
        activeProjects: sql<number>`COUNT(DISTINCT ${projects.id})`,
        privateProjects: sql<number>`COUNT(DISTINCT ${projects.id}) FILTER (WHERE ${projects.visibility} = 'private')`,
        publicProjects: sql<number>`COUNT(DISTINCT ${projects.id}) FILTER (WHERE ${projects.visibility} = 'public')`,
      })
      .from(projects)
      .leftJoin(
        projectAssignments,
        and(
          eq(projectAssignments.projectId, projects.id),
          eq(projectAssignments.userId, user.sub),
        ),
      )
      .where(and(...conditions));

    return {
      activeProjects: toNumber(row?.activeProjects),
      privateProjects: toNumber(row?.privateProjects),
      publicProjects: toNumber(row?.publicProjects),
    };
  }

  async getMySummary(user: AuthUser): Promise<MyProjectSummaryResponse> {
    const membership = await this.members.requireActiveMembership(
      user.sub,
      user.workspaceId,
    );

    const visibleConditions: SQL[] = [
      eq(projects.workspaceId, user.workspaceId),
      eq(projects.isActive, true),
    ];
    if (membership.role !== 'admin') {
      visibleConditions.push(this.visibleNonAdminProjectCondition(user.sub));
    }

    const [visibleRow] = await this.db
      .select({ value: sql<number>`COUNT(DISTINCT ${projects.id})` })
      .from(projects)
      .leftJoin(
        projectAssignments,
        and(
          eq(projectAssignments.projectId, projects.id),
          eq(projectAssignments.userId, user.sub),
        ),
      )
      .where(and(...visibleConditions));

    const now = new Date();
    const weekStart = startOfUtcIsoWeek(now);
    const monthStart = startOfUtcMonth(now);
    const earliestStart =
      weekStart.getTime() < monthStart.getTime() ? weekStart : monthStart;
    const [hoursRow] = await this.db
      .select({
        trackedHoursWeek: sql<number>`COALESCE(SUM(CASE WHEN ${timeEntries.startedAt} >= ${weekStart} THEN ${timeEntries.durationSeconds} ELSE 0 END), 0)::double precision / 3600`,
        trackedHoursMonth: sql<number>`COALESCE(SUM(CASE WHEN ${timeEntries.startedAt} >= ${monthStart} THEN ${timeEntries.durationSeconds} ELSE 0 END), 0)::double precision / 3600`,
      })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.workspaceId, user.workspaceId),
          eq(timeEntries.userId, user.sub),
          isNotNull(timeEntries.durationSeconds),
          gte(timeEntries.startedAt, earliestStart),
          lt(timeEntries.startedAt, now),
        ),
      );

    return {
      visibleProjects: toNumber(visibleRow?.value),
      trackedHoursWeek: toNumber(hoursRow?.trackedHoursWeek),
      trackedHoursMonth: toNumber(hoursRow?.trackedHoursMonth),
    };
  }

  async createProject(
    user: AuthUser,
    input: CreateProjectInput,
  ): Promise<ProjectResponse> {
    const membership = await this.members.requireRole(
      user.sub,
      user.workspaceId,
      ['admin', 'pm'],
    );

    const createValues = {
      workspaceId: user.workspaceId,
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? null,
      visibility: input.visibility ?? 'private',
    };

    if (membership.role === 'admin') {
      const [row] = await this.db
        .insert(projects)
        .values(createValues)
        .returning();
      if (!row) throw new Error('Failed to create project');
      const response = await this.findProjectResponseInWorkspace(
        user.workspaceId,
        row.id,
      );
      if (!response) throw new Error('Failed to fetch created project');
      return this.toProjectResponse(response);
    }

    const row = await this.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(projects)
        .values(createValues)
        .returning();
      if (!inserted) throw new Error('Failed to create project');

      await tx.insert(projectAssignments).values({
        workspaceId: user.workspaceId,
        projectId: inserted.id,
        userId: user.sub,
        assignedBy: user.sub,
      });

      return inserted;
    });

    const response = await this.findProjectResponseInWorkspace(
      user.workspaceId,
      row.id,
    );
    if (!response) throw new Error('Failed to fetch created project');
    return this.toProjectResponse(response);
  }

  async getProject(
    user: AuthUser,
    projectId: string,
  ): Promise<ProjectDetailResponse> {
    const project = await this.requireVisibleProject(user, projectId);
    const row = await this.findProjectResponseInWorkspace(
      user.workspaceId,
      project.id,
    );
    if (!row) throw new NotFoundException('Project not found');
    const [providerSummary, trackedSummary] = await Promise.all([
      this.getProviderSummary(user.workspaceId, project.id, row.source),
      this.getTrackedSummary(user.workspaceId, project.id),
    ]);
    const members = this.parseProjectMembers(row.members);
    return {
      ...this.toProjectResponse(row, members),
      providerSummary,
      trackedSummary,
      assignedMembersSummary: this.toAssignedMembersSummary(members),
    };
  }

  async updateProject(
    user: AuthUser,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<ProjectResponse> {
    const membership = await this.members.requireRole(
      user.sub,
      user.workspaceId,
      ['admin', 'pm'],
    );

    if (membership.role === 'pm') {
      await this.requireVisibleProject(user, projectId);
      if (input.isActive !== undefined) {
        throw new ForbiddenException(
          'Only admins can change project active state',
        );
      }
    } else {
      await this.requireProjectInWorkspace(user.workspaceId, projectId);
    }

    const [row] = await this.db
      .update(projects)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.visibility !== undefined
          ? { visibility: input.visibility }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.workspaceId, user.workspaceId),
        ),
      )
      .returning();

    if (!row) throw new NotFoundException('Project not found');
    const response = await this.findProjectResponseInWorkspace(
      user.workspaceId,
      row.id,
    );
    if (!response) throw new NotFoundException('Project not found');
    return this.toProjectResponse(response);
  }

  async listAssignments(
    user: AuthUser,
    projectId: string,
  ): Promise<ProjectAssignmentResponse[]> {
    await this.members.requireAdmin(user.sub, user.workspaceId);
    await this.requireProjectInWorkspace(user.workspaceId, projectId);

    const rows = await this.db
      .select({
        id: projectAssignments.id,
        workspaceId: projectAssignments.workspaceId,
        projectId: projectAssignments.projectId,
        userId: projectAssignments.userId,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: workspaceMembers.role,
        assignedBy: projectAssignments.assignedBy,
        assignedAt: projectAssignments.assignedAt,
      })
      .from(projectAssignments)
      .innerJoin(users, eq(users.id, projectAssignments.userId))
      .innerJoin(
        workspaceMembers,
        and(
          eq(workspaceMembers.workspaceId, projectAssignments.workspaceId),
          eq(workspaceMembers.userId, projectAssignments.userId),
        ),
      )
      .where(
        and(
          eq(projectAssignments.workspaceId, user.workspaceId),
          eq(projectAssignments.projectId, projectId),
        ),
      );

    return rows.map((row) => this.toAssignmentResponse(row));
  }

  async createAssignment(
    user: AuthUser,
    projectId: string,
    input: CreateProjectAssignmentInput,
  ): Promise<ProjectAssignmentResponse> {
    await this.members.requireAdmin(user.sub, user.workspaceId);

    return this.db.transaction(async (tx) => {
      const project = await this.findProjectInWorkspace(
        user.workspaceId,
        projectId,
        tx,
      );
      if (!project) throw new NotFoundException('Project not found');

      const [membership] = await tx
        .select({ role: workspaceMembers.role })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, user.workspaceId),
            eq(workspaceMembers.userId, input.userId),
          ),
        )
        .limit(1);

      if (!membership) throw new NotFoundException('Member not found');
      if (membership.role === 'admin') {
        throw new UnprocessableEntityException(
          'Admins do not need project assignments',
        );
      }

      const [existing] = await tx
        .select({ id: projectAssignments.id })
        .from(projectAssignments)
        .where(
          and(
            eq(projectAssignments.projectId, project.id),
            eq(projectAssignments.userId, input.userId),
          ),
        )
        .limit(1);
      if (existing) throw new ConflictException('Project assignment exists');

      const [created] = await tx
        .insert(projectAssignments)
        .values({
          workspaceId: user.workspaceId,
          projectId: project.id,
          userId: input.userId,
          assignedBy: user.sub,
        })
        .returning();
      if (!created) throw new Error('Failed to create project assignment');

      const [row] = await tx
        .select({
          id: projectAssignments.id,
          workspaceId: projectAssignments.workspaceId,
          projectId: projectAssignments.projectId,
          userId: projectAssignments.userId,
          email: users.email,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          role: workspaceMembers.role,
          assignedBy: projectAssignments.assignedBy,
          assignedAt: projectAssignments.assignedAt,
        })
        .from(projectAssignments)
        .innerJoin(users, eq(users.id, projectAssignments.userId))
        .innerJoin(
          workspaceMembers,
          and(
            eq(workspaceMembers.workspaceId, projectAssignments.workspaceId),
            eq(workspaceMembers.userId, projectAssignments.userId),
          ),
        )
        .where(eq(projectAssignments.id, created.id))
        .limit(1);

      if (!row) throw new Error('Failed to load project assignment');
      return this.toAssignmentResponse(row);
    });
  }

  async removeAssignment(
    user: AuthUser,
    projectId: string,
    targetUserId: string,
  ): Promise<void> {
    await this.members.requireAdmin(user.sub, user.workspaceId);
    await this.requireProjectInWorkspace(user.workspaceId, projectId);

    const [row] = await this.db
      .delete(projectAssignments)
      .where(
        and(
          eq(projectAssignments.workspaceId, user.workspaceId),
          eq(projectAssignments.projectId, projectId),
          eq(projectAssignments.userId, targetUserId),
        ),
      )
      .returning({ id: projectAssignments.id });
    if (!row) throw new NotFoundException('Project assignment not found');
  }

  async requireVisibleProject(
    user: AuthUser,
    projectId: string,
  ): Promise<ProjectRow> {
    const membership = await this.members.requireActiveMembership(
      user.sub,
      user.workspaceId,
    );
    if (membership.role === 'admin') {
      return this.requireProjectInWorkspace(user.workspaceId, projectId);
    }

    const [row] = await this.db
      .select({ project: projects })
      .from(projects)
      .leftJoin(
        projectAssignments,
        and(
          eq(projectAssignments.projectId, projects.id),
          eq(projectAssignments.userId, user.sub),
        ),
      )
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.workspaceId, user.workspaceId),
          eq(projects.isActive, true),
          this.visibleNonAdminProjectCondition(user.sub),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Project not found');
    return row.project;
  }

  private async requireProjectInWorkspace(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectRow> {
    const row = await this.findProjectInWorkspace(
      workspaceId,
      projectId,
      this.db,
    );
    if (!row) throw new NotFoundException('Project not found');
    return row;
  }

  private async findProjectInWorkspace(
    workspaceId: string,
    projectId: string,
    db: Pick<DrizzleDB, 'select'>,
  ): Promise<ProjectRow | null> {
    const [row] = await db
      .select()
      .from(projects)
      .where(
        and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)),
      )
      .limit(1);
    return row ?? null;
  }

  private async findProjectResponseInWorkspace(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectResponseRow | null> {
    const [row] = await this.db
      .select(this.projectResponseSelection())
      .from(projects)
      .where(
        and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)),
      )
      .limit(1);
    return row ?? null;
  }

  private visibleNonAdminProjectCondition(userId: string): SQL {
    const condition = or(
      eq(projects.visibility, 'public'),
      eq(projectAssignments.userId, userId),
    );
    if (!condition) throw new Error('Failed to build project visibility scope');
    return condition;
  }

  private projectResponseSelection() {
    return {
      id: projects.id,
      workspaceId: projects.workspaceId,
      name: projects.name,
      description: projects.description,
      color: projects.color,
      visibility: projects.visibility,
      source: sql<ProjectSource>`CASE WHEN EXISTS (
        SELECT 1
        FROM "project_external_refs"
        WHERE "project_external_refs"."project_id" = "projects"."id"
          AND "project_external_refs"."provider" = 'github'
      ) THEN 'github' ELSE 'manual' END`,
      totalSeconds: sql<number>`COALESCE((
        SELECT SUM("time_entries"."duration_seconds")
        FROM "time_entries"
        INNER JOIN "tasks" ON "tasks"."id" = "time_entries"."task_id"
        WHERE "tasks"."project_id" = "projects"."id"
          AND "time_entries"."duration_seconds" IS NOT NULL
      ), 0)`,
      members: sql<unknown>`COALESCE((
        SELECT json_agg(json_build_object(
          'userId', "project_assignments"."user_id",
          'displayName', "users"."display_name",
          'email', "users"."email",
          'avatarUrl', "users"."avatar_url",
          'role', "workspace_members"."role"
        ))
        FROM "project_assignments"
        INNER JOIN "workspace_members"
          ON "workspace_members"."workspace_id" = "project_assignments"."workspace_id"
          AND "workspace_members"."user_id" = "project_assignments"."user_id"
        INNER JOIN "users"
          ON "users"."id" = "project_assignments"."user_id"
        WHERE "project_assignments"."project_id" = "projects"."id"
      ), '[]'::json)`,
      isActive: projects.isActive,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    };
  }

  private toProjectResponse(
    row: ProjectResponseRow,
    members = this.parseProjectMembers(row.members),
  ): ProjectResponse {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      name: row.name,
      description: row.description,
      color: row.color,
      visibility: row.visibility,
      source: row.source,
      totalSeconds: Math.trunc(toNumber(row.totalSeconds)),
      members,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async getProviderSummary(
    workspaceId: string,
    projectId: string,
    source: ProjectSource,
  ): Promise<ProjectProviderSummary> {
    if (source === 'manual') {
      return {
        source,
        externalType: null,
        externalKey: null,
        externalUrl: null,
      };
    }

    const [row] = await this.db
      .select({
        externalType: projectExternalRefs.externalType,
        externalKey: projectExternalRefs.externalKey,
        externalUrl: projectExternalRefs.externalUrl,
      })
      .from(projectExternalRefs)
      .where(
        and(
          eq(projectExternalRefs.workspaceId, workspaceId),
          eq(projectExternalRefs.projectId, projectId),
          eq(projectExternalRefs.provider, 'github'),
        ),
      )
      .orderBy(
        sql`CASE WHEN ${projectExternalRefs.externalType} = 'repository' THEN 0 ELSE 1 END`,
        projectExternalRefs.externalType,
        projectExternalRefs.externalKey,
      )
      .limit(1);

    return {
      source,
      externalType: row?.externalType ?? null,
      externalKey: row?.externalKey ?? null,
      externalUrl: row?.externalUrl ?? null,
    };
  }

  private async getTrackedSummary(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectTrackedSummary> {
    const [row] = await this.db
      .select({
        totalSeconds: sql<number>`COALESCE(SUM(${timeEntries.durationSeconds}), 0)`,
        billableSeconds: sql<number>`COALESCE(SUM(CASE WHEN ${timeEntries.isBillable} THEN ${timeEntries.durationSeconds} ELSE 0 END), 0)`,
        lastActivityAt: sql<
          Date | string | null
        >`MAX(${timeEntries.startedAt})`,
      })
      .from(timeEntries)
      .innerJoin(tasksTable, eq(tasksTable.id, timeEntries.taskId))
      .where(
        and(
          eq(timeEntries.workspaceId, workspaceId),
          eq(tasksTable.workspaceId, workspaceId),
          eq(tasksTable.projectId, projectId),
          isNotNull(timeEntries.durationSeconds),
        ),
      );

    const totalSeconds = Math.trunc(toNumber(row?.totalSeconds));
    const billableSeconds = Math.trunc(toNumber(row?.billableSeconds));
    return {
      totalSeconds,
      billableSeconds,
      billableShare: totalSeconds > 0 ? billableSeconds / totalSeconds : null,
      lastActivityAt: toIsoDateString(row?.lastActivityAt),
    };
  }

  private parseProjectMembers(members: unknown): ProjectMember[] {
    return projectMemberSchema
      .array()
      .parse(Array.isArray(members) ? members : []);
  }

  private toAssignedMembersSummary(
    members: ProjectMember[],
  ): ProjectAssignedMembersSummary {
    const sortedMembers = [...members].sort(compareProjectMembers);
    const previewMembers = sortedMembers.slice(0, 3);
    return {
      count: sortedMembers.length,
      previewMembers,
      remainingCount: Math.max(sortedMembers.length - previewMembers.length, 0),
    };
  }

  private toAssignmentResponse(
    row: ProjectAssignmentRow,
  ): ProjectAssignmentResponse {
    return { ...row, assignedAt: row.assignedAt.toISOString() };
  }
}

function toNumber(value: number | string | null | undefined): number {
  if (value === undefined || value === null) return 0;
  return typeof value === 'number' ? value : Number(value);
}

function toIsoDateString(
  value: Date | string | null | undefined,
): string | null {
  if (value === undefined || value === null) return null;
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function compareProjectMembers(a: ProjectMember, b: ProjectMember): number {
  return (
    roleRank(a.role) - roleRank(b.role) ||
    memberDisplayName(a).localeCompare(memberDisplayName(b)) ||
    a.userId.localeCompare(b.userId)
  );
}

function roleRank(role: ProjectMember['role']): number {
  if (role === 'pm') return 0;
  if (role === 'member') return 1;
  return 2;
}

function memberDisplayName(member: ProjectMember): string {
  return member.displayName ?? member.email;
}

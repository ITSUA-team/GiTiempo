import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type {
  CreateProjectAssignmentInput,
  CreateProjectInput,
  ProjectAssignmentResponse,
  ProjectResponse,
  UpdateProjectInput,
} from '@gitiempo/shared';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import type { AuthUser } from '../../auth/types/auth-user';
import { MembersService } from '../../members/services/members.service';
import { workspaceMembers } from '../../members/schemas/workspace-members.schema';
import { users } from '../../users/schemas/users.schema';
import { projectAssignments } from '../schemas/project-assignments.schema';
import { projects } from '../schemas/projects.schema';

export type ProjectRow = typeof projects.$inferSelect;
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
        .select()
        .from(projects)
        .where(eq(projects.workspaceId, user.workspaceId));
      return rows.map((row) => this.toProjectResponse(row));
    }

    const rows = await this.db
      .select({ project: projects })
      .from(projects)
      .innerJoin(
        projectAssignments,
        eq(projectAssignments.projectId, projects.id),
      )
      .where(
        and(
          eq(projects.workspaceId, user.workspaceId),
          eq(projects.isActive, true),
          eq(projectAssignments.userId, user.sub),
        ),
      );

    return rows.map((row) => this.toProjectResponse(row.project));
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
      color: input.color ?? null,
    };

    if (membership.role === 'admin') {
      const [row] = await this.db
        .insert(projects)
        .values(createValues)
        .returning();
      if (!row) throw new Error('Failed to create project');
      return this.toProjectResponse(row);
    }

    return this.db.transaction(async (tx) => {
      const [row] = await tx.insert(projects).values(createValues).returning();
      if (!row) throw new Error('Failed to create project');

      await tx.insert(projectAssignments).values({
        workspaceId: user.workspaceId,
        projectId: row.id,
        userId: user.sub,
        assignedBy: user.sub,
      });

      return this.toProjectResponse(row);
    });
  }

  async getProject(
    user: AuthUser,
    projectId: string,
  ): Promise<ProjectResponse> {
    const row = await this.requireVisibleProject(user, projectId);
    return this.toProjectResponse(row);
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
        ...(input.color !== undefined ? { color: input.color } : {}),
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
    return this.toProjectResponse(row);
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
      .innerJoin(
        projectAssignments,
        eq(projectAssignments.projectId, projects.id),
      )
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.workspaceId, user.workspaceId),
          eq(projects.isActive, true),
          eq(projectAssignments.userId, user.sub),
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

  private toProjectResponse(row: ProjectRow): ProjectResponse {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      name: row.name,
      color: row.color,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toAssignmentResponse(
    row: ProjectAssignmentRow,
  ): ProjectAssignmentResponse {
    return { ...row, assignedAt: row.assignedAt.toISOString() };
  }
}

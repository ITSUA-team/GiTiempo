import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { and, count, eq, sql } from 'drizzle-orm';
import type {
  UpdateWorkspaceMemberRoleInput,
  WorkspaceMemberResponse,
  WorkspaceRole,
} from '@gitiempo/shared';
import { DomainError } from '../../commons/errors/domain-error';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import { users } from '../../users/schemas/users.schema';
import { workspaceMembers } from '../schemas/workspace-members.schema';

export interface ActiveMembership {
  id: string;
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
}

@Injectable()
export class MembersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async resolveActiveMembershipForUser(
    userId: string,
  ): Promise<ActiveMembership | null> {
    const [row] = await this.db
      .select({
        id: workspaceMembers.id,
        userId: workspaceMembers.userId,
        workspaceId: workspaceMembers.workspaceId,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, userId))
      .limit(1);

    return row ?? null;
  }

  async resolveActiveMembership(
    userId: string,
    workspaceId: string,
  ): Promise<ActiveMembership | null> {
    const [row] = await this.db
      .select({
        id: workspaceMembers.id,
        userId: workspaceMembers.userId,
        workspaceId: workspaceMembers.workspaceId,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  async requireActiveMembershipForUser(
    userId: string,
  ): Promise<ActiveMembership> {
    const membership = await this.resolveActiveMembershipForUser(userId);
    if (!membership) throw new UnauthorizedException('Unauthorized');
    return membership;
  }

  async requireActiveMembership(
    userId: string,
    workspaceId: string,
  ): Promise<ActiveMembership> {
    const membership = await this.resolveActiveMembership(userId, workspaceId);
    if (!membership) throw new UnauthorizedException('Unauthorized');
    return membership;
  }

  async requireAdmin(userId: string, workspaceId: string): Promise<void> {
    await this.requireRole(userId, workspaceId, ['admin']);
  }

  async requireRole(
    userId: string,
    workspaceId: string,
    roles: readonly WorkspaceRole[],
  ): Promise<ActiveMembership> {
    const membership = await this.requireActiveMembership(userId, workspaceId);
    if (!roles.includes(membership.role)) {
      throw new ForbiddenException('Forbidden');
    }
    return membership;
  }

  async listMembers(workspaceId: string): Promise<WorkspaceMemberResponse[]> {
    const projectsAssignedCount = sql<number>`(
      SELECT COUNT(*)::int FROM project_assignments pa
      WHERE pa.user_id = ${workspaceMembers.userId}
        AND pa.workspace_id = ${workspaceMembers.workspaceId}
    )`.as('projects_assigned_count');

    const rows = await this.db
      .select({
        id: workspaceMembers.id,
        workspaceId: workspaceMembers.workspaceId,
        userId: workspaceMembers.userId,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: workspaceMembers.role,
        joinedAt: workspaceMembers.joinedAt,
        lastActiveAt: users.lastActiveAt,
        projectsAssignedCount: projectsAssignedCount,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, workspaceId));

    return rows.map((row) => ({
      ...row,
      joinedAt: row.joinedAt.toISOString(),
      lastActiveAt: row.lastActiveAt?.toISOString() ?? null,
      projectsAssignedCount: row.projectsAssignedCount ?? 0,
    }));
  }

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    input: UpdateWorkspaceMemberRoleInput,
  ): Promise<WorkspaceMemberResponse> {
    return this.db.transaction(async (tx) => {
      const [target] = await tx
        .select({ role: workspaceMembers.role })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.id, memberId),
            eq(workspaceMembers.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      if (!target) throw new NotFoundException('Member not found');
      await this.assertCanLoseAdminRole(
        tx,
        workspaceId,
        target.role,
        input.role,
      );

      const [updated] = await tx
        .update(workspaceMembers)
        .set({ role: input.role })
        .where(eq(workspaceMembers.id, memberId))
        .returning();
      if (!updated) {
        throw DomainError.internal(
          'member_role_update_failed',
          'Failed to update member role',
        );
      }

      const assignedCount = sql<number>`(
        SELECT COUNT(*)::int FROM project_assignments pa
        WHERE pa.user_id = ${updated.userId}
          AND pa.workspace_id = ${updated.workspaceId}
      )`.as('projects_assigned_count');

      const [row] = await tx
        .select({
          id: workspaceMembers.id,
          workspaceId: workspaceMembers.workspaceId,
          userId: workspaceMembers.userId,
          email: users.email,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          role: workspaceMembers.role,
          joinedAt: workspaceMembers.joinedAt,
          lastActiveAt: users.lastActiveAt,
          projectsAssignedCount: assignedCount,
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(users.id, workspaceMembers.userId))
        .where(eq(workspaceMembers.id, updated.id))
        .limit(1);

      if (!row) {
        throw DomainError.internal(
          'member_update_response_missing',
          'Failed to load updated member',
        );
      }
      return {
        ...row,
        joinedAt: row.joinedAt.toISOString(),
        lastActiveAt: row.lastActiveAt?.toISOString() ?? null,
        projectsAssignedCount: row.projectsAssignedCount ?? 0,
      };
    });
  }

  async removeMember(workspaceId: string, memberId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [target] = await tx
        .select({ role: workspaceMembers.role })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.id, memberId),
            eq(workspaceMembers.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      if (!target) throw new NotFoundException('Member not found');
      await this.assertCanLoseAdminRole(tx, workspaceId, target.role, null);

      await tx
        .delete(workspaceMembers)
        .where(eq(workspaceMembers.id, memberId));
    });
  }

  private async assertCanLoseAdminRole(
    db: Pick<DrizzleDB, 'select'>,
    workspaceId: string,
    currentRole: WorkspaceRole,
    nextRole: WorkspaceRole | null,
  ): Promise<void> {
    if (currentRole !== 'admin' || nextRole === 'admin') return;

    await db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.role, 'admin'),
        ),
      )
      .for('update');

    const [row] = await db
      .select({ value: count() })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.role, 'admin'),
        ),
      );

    if ((row?.value ?? 0) <= 1) {
      throw new ConflictException('Workspace must have at least one admin');
    }
  }
}

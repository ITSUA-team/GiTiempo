import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import type {
  CurrentUserWorkspaceMembershipListResponse,
  UserResponse,
  UpdateUserInput,
  WorkspaceRole,
} from '@gitiempo/shared';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import { MembersService } from '../../members/services/members.service';
import { workspaceMembers } from '../../members/schemas/workspace-members.schema';
import { userRowSelection, users } from '../schemas/users.schema';

type UserRow = typeof users.$inferSelect;

export interface UpsertFromFirebaseInput {
  firebaseUid: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

function firebaseDisplayNameFallback(displayName: string | null | undefined) {
  const nextDisplayName = displayName ?? null;

  return sql<string | null>`COALESCE(${users.displayName}, ${nextDisplayName})`;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly members: MembersService,
  ) {}

  /** Returns the public user view; missing subjects are treated as unauthorized. */
  async findById(id: string, workspaceId: string): Promise<UserResponse> {
    const [row] = await this.db
      .select({
        user: users,
        role: workspaceMembers.role,
      })
      .from(users)
      .innerJoin(workspaceMembers, eq(workspaceMembers.userId, users.id))
      .where(
        and(eq(users.id, id), eq(workspaceMembers.workspaceId, workspaceId)),
      )
      .limit(1);
    if (!row) throw new UnauthorizedException('Unauthorized');
    return this.toResponse(row.user, row.role);
  }

  /** Internal row lookup by local id. */
  async findRowById(id: string): Promise<UserRow | null> {
    const [row] = await this.db
      .select(userRowSelection)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row ?? null;
  }

  async findRowByFirebaseUid(firebaseUid: string): Promise<UserRow | null> {
    const [row] = await this.db
      .select(userRowSelection)
      .from(users)
      .where(eq(users.firebaseUid, firebaseUid))
      .limit(1);
    return row ?? null;
  }

  async updateById(
    id: string,
    workspaceId: string,
    input: UpdateUserInput,
  ): Promise<UserResponse> {
    const [updated] = await this.db
      .update(users)
      .set({
        ...(input.displayName !== undefined
          ? { displayName: input.displayName }
          : {}),
        ...(input.avatarUrl !== undefined
          ? { avatarUrl: input.avatarUrl }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    if (!updated) throw new UnauthorizedException('Unauthorized');
    this.logger.log(`Updated user ${updated.id}`);
    const role = await this.findRole(id, workspaceId);
    return this.toResponse(updated, role);
  }

  async listCurrentUserWorkspaces(
    userId: string,
    currentWorkspaceId: string,
  ): Promise<CurrentUserWorkspaceMembershipListResponse> {
    const memberships = await this.members.listMembershipsForUser(userId);
    const currentMembershipCount = memberships.filter(
      (membership) => membership.workspaceId === currentWorkspaceId,
    ).length;

    if (currentMembershipCount !== 1) {
      throw new UnauthorizedException('Unauthorized');
    }

    return {
      items: memberships.map((membership) => ({
        workspaceId: membership.workspaceId,
        workspaceName: membership.workspaceName,
        role: membership.role,
        isCurrent: membership.workspaceId === currentWorkspaceId,
      })),
    };
  }

  async updateFromFirebase(
    id: string,
    input: UpsertFromFirebaseInput,
  ): Promise<UserRow> {
    const [updated] = await this.db
      .update(users)
      .set({
        email: input.email,
        displayName: firebaseDisplayNameFallback(input.displayName),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    if (!updated) throw new UnauthorizedException('Unauthorized');
    return updated;
  }

  /** Upserts the local user keyed by `firebase_uid` while preserving local profile edits. */
  async upsertFromFirebase(input: UpsertFromFirebaseInput): Promise<UserRow> {
    const now = new Date();
    const row = (
      await this.db
        .insert(users)
        .values({
          firebaseUid: input.firebaseUid,
          email: input.email,
          displayName: input.displayName ?? null,
          avatarUrl: input.avatarUrl ?? null,
        })
        .onConflictDoUpdate({
          target: users.firebaseUid,
          set: {
            email: input.email,
            displayName: firebaseDisplayNameFallback(input.displayName),
            updatedAt: now,
          },
        })
        .returning()
    )[0]!;
    return row;
  }

  /** Maps a DB row to the public response shape. */
  private async findRole(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceRole> {
    const [row] = await this.db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (!row) throw new UnauthorizedException('Unauthorized');
    return row.role;
  }

  private toResponse(row: UserRow, role: WorkspaceRole): UserResponse {
    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      role,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

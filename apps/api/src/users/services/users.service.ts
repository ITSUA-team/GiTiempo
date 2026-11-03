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
import {
  userRowSelection,
  users,
  type UserAvatarSource,
} from '../schemas/users.schema';

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

function resolveProviderAvatarWrite(
  current: Pick<UserRow, 'avatarSource' | 'avatarUrl'>,
  avatarUrl: string | null | undefined,
): string | null {
  const nextAvatarUrl = avatarUrl?.trim();

  if (
    !nextAvatarUrl ||
    current.avatarSource !== 'provider' ||
    current.avatarUrl === nextAvatarUrl
  ) {
    return null;
  }

  return nextAvatarUrl;
}

function avatarOwnershipPatch(avatarUrl: string | null | undefined) {
  if (avatarUrl === undefined) {
    return {};
  }

  const avatarSource: UserAvatarSource =
    avatarUrl === null ? 'provider' : 'user';

  return { avatarUrl, avatarSource };
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
        canViewInvoices: workspaceMembers.canViewInvoices,
      })
      .from(users)
      .innerJoin(workspaceMembers, eq(workspaceMembers.userId, users.id))
      .where(
        and(eq(users.id, id), eq(workspaceMembers.workspaceId, workspaceId)),
      )
      .limit(1);
    if (!row) throw new UnauthorizedException('Unauthorized');
    return this.toResponse(row.user, row.role, row.canViewInvoices);
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
        ...avatarOwnershipPatch(input.avatarUrl),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    if (!updated) throw new UnauthorizedException('Unauthorized');
    this.logger.log(`Updated user ${updated.id}`);
    const { role, canViewInvoices } = await this.findMembershipInfo(
      id,
      workspaceId,
    );
    return this.toResponse(updated, role, canViewInvoices);
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
    const current = await this.findRowById(id);
    if (!current) throw new UnauthorizedException('Unauthorized');

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
    return this.applyProviderAvatar(updated, input.avatarUrl);
  }

  private async applyProviderAvatar(
    row: UserRow,
    avatarUrl: string | null | undefined,
  ): Promise<UserRow> {
    const nextAvatarUrl = resolveProviderAvatarWrite(row, avatarUrl);
    if (nextAvatarUrl === null) return row;

    const [updated] = await this.db
      .update(users)
      .set({ avatarUrl: nextAvatarUrl, updatedAt: new Date() })
      .where(and(eq(users.id, row.id), eq(users.avatarSource, 'provider')))
      .returning();
    return updated ?? row;
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
          avatarUrl: input.avatarUrl?.trim() || null,
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

    return this.applyProviderAvatar(row, input.avatarUrl);
  }

  /** Resolves the membership role and invoice permission for the user. */
  private async findMembershipInfo(
    userId: string,
    workspaceId: string,
  ): Promise<{ role: WorkspaceRole; canViewInvoices: boolean }> {
    const [row] = await this.db
      .select({
        role: workspaceMembers.role,
        canViewInvoices: workspaceMembers.canViewInvoices,
      })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (!row) throw new UnauthorizedException('Unauthorized');
    return { role: row.role, canViewInvoices: row.canViewInvoices };
  }

  private toResponse(
    row: UserRow,
    role: WorkspaceRole,
    canViewInvoices: boolean,
  ): UserResponse {
    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      role,
      canViewInvoices,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

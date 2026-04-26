import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type {
  UserResponse,
  UpdateUserInput,
  WorkspaceRole,
} from '@gitiempo/shared';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import { workspaceMembers } from '../../members/schemas/workspace-members.schema';
import { users } from '../schemas/users.schema';

type UserRow = typeof users.$inferSelect;

export interface UpsertFromFirebaseInput {
  firebaseUid: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Looks up a user by local id. Returns the public response shape.
   * Throws `UnauthorizedException` if the subject resolved from the
   * access token no longer exists (account was deleted) — this is a
   * re-auth signal, not a "not found" situation.
   */
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

  /** Same as `findById` but returns the raw row (internal use). */
  async findRowById(id: string): Promise<UserRow | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row ?? null;
  }

  /**
   * Patches mutable fields on the given user. Only fields present in
   * `input` are written; omitted keys are left untouched.
   */
  async findRowByFirebaseUid(firebaseUid: string): Promise<UserRow | null> {
    const [row] = await this.db
      .select()
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

  async updateFromFirebase(
    id: string,
    input: UpsertFromFirebaseInput,
  ): Promise<UserRow> {
    const [updated] = await this.db
      .update(users)
      .set({
        email: input.email,
        displayName: input.displayName ?? null,
        avatarUrl: input.avatarUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    if (!updated) throw new UnauthorizedException('Unauthorized');
    return updated;
  }

  /**
   * Upserts a local user keyed by `firebase_uid`. Called during login
   * after Firebase verification succeeds.
   *
   * On conflict we refresh `email`, `display_name`, `avatar_url`, and
   * `updated_at` so the local profile stays in sync with the Firebase
   * identity. `id` and `created_at` are immutable.
   */
  async upsertFromFirebase(input: UpsertFromFirebaseInput): Promise<UserRow> {
    const now = new Date();
    const [row] = await this.db
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
          displayName: input.displayName ?? null,
          avatarUrl: input.avatarUrl ?? null,
          updatedAt: now,
        },
      })
      .returning();
    if (!row) throw new Error('Failed to upsert user');
    return row;
  }

  /** Maps a DB row to the public response shape (drops `firebaseUid`). */
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

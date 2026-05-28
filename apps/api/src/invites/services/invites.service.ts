import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import type {
  AcceptWorkspaceInviteInput,
  CreateWorkspaceInviteInput,
  WorkspaceInviteResponse,
} from '@gitiempo/shared';
import {
  FIREBASE_ADMIN,
  type FirebaseAdminService,
} from '../../auth/services/firebase-admin.interface';
import { normalizeEmail } from '../../commons/utils/normalize-email';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import type { Env } from '../../config/env.validation';
import { workspaceMembers } from '../../members/schemas/workspace-members.schema';
import { UsersService } from '../../users/services/users.service';
import { workspaces } from '../../workspaces/schemas/workspaces.schema';
import { invites } from '../schemas/invites.schema';
import { InviteDeliveryService } from './invite-delivery.service';
import { buildInviteAcceptUrl } from './invite-url.helper';

type InviteRow = typeof invites.$inferSelect;
type InviteWorkspaceRow = Pick<InviteRow, 'email' | 'token'> & {
  workspaceName: string;
};

@Injectable()
export class InvitesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(FIREBASE_ADMIN) private readonly firebase: FirebaseAdminService,
    private readonly config: ConfigService<Env, true>,
    private readonly users: UsersService,
    private readonly delivery: InviteDeliveryService,
  ) {}

  async listInvites(workspaceId: string): Promise<WorkspaceInviteResponse[]> {
    const rows = await this.db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.workspaceId, workspaceId),
          eq(invites.status, 'pending'),
        ),
      );

    return rows.map((row) => this.toResponse(row));
  }

  async createInvite(
    workspaceId: string,
    invitedBy: string,
    input: CreateWorkspaceInviteInput,
  ): Promise<WorkspaceInviteResponse> {
    const email = normalizeEmail(input.email);
    const [existing] = await this.db
      .select({ id: invites.id })
      .from(invites)
      .where(
        and(
          eq(invites.workspaceId, workspaceId),
          eq(invites.email, email),
          eq(invites.status, 'pending'),
        ),
      )
      .limit(1);
    if (existing) throw new ConflictException('Pending invite already exists');

    const [workspace] = await this.db
      .select({ name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    if (!workspace) throw new UnauthorizedException('Unauthorized');

    const token = randomBytes(32).toString('base64url');
    const [row] = await this.db
      .insert(invites)
      .values({
        workspaceId,
        email,
        token,
        invitedBy,
        role: input.role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning();
    if (!row) throw new Error('Failed to create invite');

    try {
      await this.deliverInvite({
        email,
        token: row.token,
        workspaceName: workspace.name,
      });
    } catch (error) {
      await this.db
        .update(invites)
        .set({ status: 'expired' })
        .where(eq(invites.id, row.id));
      throw error;
    }

    return this.toResponse(row);
  }

  async resendInvite(
    workspaceId: string,
    inviteId: string,
  ): Promise<WorkspaceInviteResponse> {
    const invite = await this.findPendingInviteForWorkspace(
      workspaceId,
      inviteId,
    );
    this.assertInviteCanBeResent(invite);

    const [workspace] = await this.db
      .select({ name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    if (!workspace) throw new UnauthorizedException('Unauthorized');

    try {
      await this.deliverInvite({
        email: invite.email,
        token: invite.token,
        workspaceName: workspace.name,
      });
    } catch (error) {
      throw new ServiceUnavailableException(
        error instanceof Error ? error.message : 'Invite delivery failed',
      );
    }

    return this.toResponse(invite);
  }

  async cancelInvite(workspaceId: string, inviteId: string): Promise<void> {
    const [row] = await this.db
      .update(invites)
      .set({ status: 'expired' })
      .where(
        and(
          eq(invites.id, inviteId),
          eq(invites.workspaceId, workspaceId),
          eq(invites.status, 'pending'),
        ),
      )
      .returning();
    if (!row) throw new NotFoundException('Pending invite not found');
  }

  async acceptInvite(input: AcceptWorkspaceInviteInput): Promise<void> {
    const invite = await this.findInviteByToken(input.token);
    this.assertInviteCanBeAccepted(invite);

    const decoded = await this.firebase.verifyIdToken(input.firebaseIdToken);
    if (!decoded.email) throw new UnauthorizedException('Unauthorized');

    const email = normalizeEmail(decoded.email);
    if (email !== invite.email) {
      throw new ForbiddenException('Invite email does not match identity');
    }

    const userRow = await this.users.upsertFromFirebase({
      firebaseUid: decoded.uid,
      email,
      displayName: decoded.name ?? null,
      avatarUrl: decoded.picture ?? null,
    });

    await this.db.transaction(async (tx) => {
      const [currentInvite] = await tx
        .select()
        .from(invites)
        .where(eq(invites.id, invite.id))
        .limit(1);
      if (!currentInvite) throw new NotFoundException('Invite not found');
      this.assertInviteCanBeAccepted(currentInvite);

      const [existingMembership] = await tx
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, currentInvite.workspaceId),
            eq(workspaceMembers.userId, userRow.id),
          ),
        )
        .limit(1);
      if (existingMembership) {
        throw new ConflictException('User is already a workspace member');
      }

      await tx.insert(workspaceMembers).values({
        workspaceId: currentInvite.workspaceId,
        userId: userRow.id,
        role: currentInvite.role,
      });

      await tx
        .update(invites)
        .set({ status: 'accepted' })
        .where(eq(invites.id, currentInvite.id));
    });
  }

  private async findInviteByToken(token: string): Promise<InviteRow> {
    const [row] = await this.db
      .select()
      .from(invites)
      .where(eq(invites.token, token))
      .limit(1);
    if (!row) throw new NotFoundException('Invite not found');
    return row;
  }

  private async findPendingInviteForWorkspace(
    workspaceId: string,
    inviteId: string,
  ): Promise<InviteRow> {
    const [row] = await this.db
      .select()
      .from(invites)
      .where(
        and(eq(invites.id, inviteId), eq(invites.workspaceId, workspaceId)),
      )
      .limit(1);

    if (!row || row.status !== 'pending') {
      throw new NotFoundException('Pending invite not found');
    }

    return row;
  }

  private assertInviteCanBeAccepted(invite: InviteRow): void {
    if (invite.status !== 'pending') {
      throw new ConflictException('Invite cannot be accepted');
    }
    if (invite.expiresAt.getTime() <= Date.now()) {
      throw new GoneException('Invite has expired');
    }
  }

  private assertInviteCanBeResent(invite: InviteRow): void {
    if (invite.expiresAt.getTime() <= Date.now()) {
      throw new GoneException('Invite has expired');
    }
  }

  private async deliverInvite(input: InviteWorkspaceRow): Promise<void> {
    const inviteUrl = buildInviteAcceptUrl(this.config, input.token);
    await this.firebase.getOrCreateInvitedUserByEmail(input.email);
    const passwordSetupUrl = await this.firebase.generatePasswordSetupLink(
      input.email,
      inviteUrl,
    );

    await this.delivery.deliver({
      email: input.email,
      inviteUrl,
      passwordSetupUrl,
      workspaceName: input.workspaceName,
    });
  }

  private toResponse(row: InviteRow): WorkspaceInviteResponse {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      email: row.email,
      invitedBy: row.invitedBy,
      role: row.role,
      status: row.status,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  }
}

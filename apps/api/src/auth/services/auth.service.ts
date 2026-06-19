import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import type { RegisterRequest } from '@gitiempo/shared';
import type { Env } from '../../config/env.validation';
import { normalizeEmail } from '../../commons/utils/normalize-email';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import { MembersService } from '../../members/services/members.service';
import { workspaceMembers } from '../../members/schemas/workspace-members.schema';
import { UsersService } from '../../users/services/users.service';
import { userRowSelection, users } from '../../users/schemas/users.schema';
import { refreshTokens } from '../schemas/refresh-tokens.schema';
import { workspaceSettings } from '../../workspaces/schemas/workspace-settings.schema';
import { workspaces } from '../../workspaces/schemas/workspaces.schema';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import {
  FIREBASE_ADMIN,
  type DecodedFirebaseToken,
  FirebaseAdminAuthError,
  type FirebaseAdminService,
} from './firebase-admin.interface';
import { REGISTRATION_ERROR_MESSAGES } from '../registration-errors';
import { TokenService } from './token.service';
import type { AuthUser } from '../types/auth-user';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
}

const POSTGRES_UNIQUE_VIOLATION = '23505';
const USERS_EMAIL_LOOKUP_UNIQUE_INDEX = 'users_email_lookup_unique';
const WORKSPACES_NAME_LOOKUP_UNIQUE_INDEX = 'workspaces_name_lookup_unique';

function normalizeWorkspaceName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function normalizeWorkspaceLookupKey(name: string): string {
  return normalizeWorkspaceName(name).toLowerCase();
}

function createRegistrationBadRequest(
  code: 'invalid_workspace_name' | 'weak_password',
): BadRequestException {
  return new BadRequestException({
    code,
    error: 'BadRequest',
    message: REGISTRATION_ERROR_MESSAGES[code],
  });
}

function createRegistrationConflict(
  code: 'duplicate_email' | 'workspace_name_unavailable',
): ConflictException {
  return new ConflictException({
    code,
    error: 'Conflict',
    message: REGISTRATION_ERROR_MESSAGES[code],
  });
}

function createRegistrationUnavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    code: 'registration_service_unavailable',
    error: 'ServiceUnavailable',
    message: REGISTRATION_ERROR_MESSAGES.registration_service_unavailable,
  });
}

function isRegistrationHttpException(error: unknown): boolean {
  return (
    error instanceof BadRequestException ||
    error instanceof ConflictException ||
    error instanceof ServiceUnavailableException
  );
}

function getRegistrationConstraintCode(
  error: unknown,
): 'duplicate_email' | 'workspace_name_unavailable' | null {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('code' in error) ||
    !('constraint' in error)
  ) {
    return null;
  }

  const postgresCode = (error as { code?: unknown }).code;
  const constraint = (error as { constraint?: unknown }).constraint;
  if (
    postgresCode !== POSTGRES_UNIQUE_VIOLATION ||
    typeof constraint !== 'string'
  ) {
    return null;
  }

  if (constraint === USERS_EMAIL_LOOKUP_UNIQUE_INDEX) {
    return 'duplicate_email';
  }

  if (constraint === WORKSPACES_NAME_LOOKUP_UNIQUE_INDEX) {
    return 'workspace_name_unavailable';
  }

  return null;
}

/**
 * Parses a TTL string like `"15m"`, `"7d"`, `"3600s"`, or a bare number
 * of seconds, into milliseconds. Supports `s` / `m` / `h` / `d`.
 *
 * Kept local to this service because both the access-token `expiresIn`
 * (reported to the client) and the refresh-token `expires_at` (stored)
 * need a numeric duration, and `jsonwebtoken` itself only consumes the
 * string form for signing.
 */
function parseDurationMs(input: string): number {
  const trimmed = input.trim();
  const match = /^(\d+)\s*([smhd]?)$/i.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid duration: "${input}"`);
  }
  const value = Number.parseInt(match[1]!, 10);
  const unit = match[2]?.toLowerCase() || 's';
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * multipliers[unit]!;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTtlMs: number;
  private readonly accessTtlMs: number;

  constructor(
    config: ConfigService<Env, true>,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(FIREBASE_ADMIN)
    private readonly firebase: FirebaseAdminService,
    private readonly tokens: TokenService,
    private readonly refreshRepo: RefreshTokenRepository,
    private readonly users: UsersService,
    private readonly members: MembersService,
  ) {
    this.refreshTtlMs = parseDurationMs(
      config.get('JWT_REFRESH_TTL', { infer: true }),
    );
    this.accessTtlMs = parseDurationMs(
      config.get('JWT_ACCESS_TTL', { infer: true }),
    );
  }

  async login(firebaseIdToken: string): Promise<TokenPair> {
    let decoded: DecodedFirebaseToken;
    try {
      decoded = await this.firebase.verifyIdToken(firebaseIdToken);
    } catch (err) {
      this.logger.warn({
        event: 'auth.login.firebase_rejected',
        reason: (err as Error).message,
      });
      throw new UnauthorizedException('Unauthorized');
    }
    if (!decoded.email) {
      this.logger.warn({
        event: 'auth.login.firebase_rejected',
        reason: 'missing_email',
        firebaseUid: decoded.uid,
      });
      throw new UnauthorizedException('Unauthorized');
    }

    const existingUser = await this.users.findRowByFirebaseUid(decoded.uid);
    if (!existingUser) {
      throw new UnauthorizedException('Unauthorized');
    }

    const membership = await this.members.requireActiveMembershipForUser(
      existingUser.id,
    );
    const row = await this.users.updateFromFirebase(existingUser.id, {
      firebaseUid: decoded.uid,
      email: decoded.email,
      displayName: decoded.name ?? null,
      avatarUrl: decoded.picture ?? null,
    });

    const pair = await this.issueTokenPair(
      {
        sub: row.id,
        email: row.email,
        firebaseUid: row.firebaseUid,
        workspaceId: membership.workspaceId,
        role: membership.role,
      },
      randomUUID(),
    );
    this.logger.log({
      event: 'auth.login.success',
      userId: row.id,
    });
    return pair;
  }

  async register(input: RegisterRequest): Promise<TokenPair> {
    const email = normalizeEmail(input.email);
    const displayName = input.fullName.trim();
    const workspaceName = normalizeWorkspaceName(input.workspaceName);

    if (workspaceName.length === 0) {
      throw createRegistrationBadRequest('invalid_workspace_name');
    }

    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw createRegistrationConflict('duplicate_email');
    }

    let firebaseUser;
    try {
      firebaseUser = await this.firebase.createEmailPasswordUser({
        displayName,
        email,
        password: input.password,
      });
    } catch (error) {
      this.throwRegistrationFirebaseError(error);
    }

    try {
      const pair = await this.createRegisteredSession({
        displayName,
        email,
        firebaseUid: firebaseUser.uid,
        workspaceName,
      });
      this.logger.log({
        event: 'auth.register.success',
        email,
        firebaseUid: firebaseUser.uid,
      });
      return pair;
    } catch (error) {
      const cleanupSucceeded = await this.cleanupFailedRegistration(
        firebaseUser.uid,
        error,
      );
      if (!cleanupSucceeded) {
        throw createRegistrationUnavailable();
      }
      if (isRegistrationHttpException(error)) {
        throw error;
      }
      const registrationConstraintCode = getRegistrationConstraintCode(error);
      if (registrationConstraintCode === 'duplicate_email') {
        throw createRegistrationConflict('duplicate_email');
      }
      if (registrationConstraintCode === 'workspace_name_unavailable') {
        throw createRegistrationConflict('workspace_name_unavailable');
      }
      throw createRegistrationUnavailable();
    }
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const hash = this.tokens.hashRefreshToken(refreshToken);
    const row = await this.refreshRepo.findByHashIncludingRevoked(hash);
    if (!row) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (row.revokedAt !== null) {
      if (row.replacedBy) {
        const replacement = await this.refreshRepo.findById(row.replacedBy);

        if (replacement && replacement.revokedAt === null) {
          throw new UnauthorizedException('Unauthorized');
        }
      }

      await this.refreshRepo.deleteFamily(row.familyId);
      this.logger.warn({
        event: 'auth.refresh.reuse_detected',
        userId: row.userId,
        familyId: row.familyId,
      });
      throw new UnauthorizedException('Unauthorized');
    }

    if (row.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Unauthorized');
    }

    const user = await this.users.findRowById(row.userId);
    if (!user) {
      // Subject disappeared; clean up the family to be safe.
      await this.refreshRepo.deleteFamily(row.familyId);
      throw new UnauthorizedException('Unauthorized');
    }
    const membership = await this.members.requireActiveMembershipForUser(
      user.id,
    );

    const { token, hash: newHash } = this.tokens.generateRefreshToken();
    const expiresAt = new Date(Date.now() + this.refreshTtlMs);
    const rotated = await this.refreshRepo.rotateIfActive(row.id, {
      userId: user.id,
      familyId: row.familyId,
      tokenHash: newHash,
      expiresAt,
    });

    if (!rotated) {
      throw new UnauthorizedException('Unauthorized');
    }

    const accessToken = this.tokens.signAccess({
      sub: user.id,
      email: user.email,
      firebaseUid: user.firebaseUid,
      workspaceId: membership.workspaceId,
      role: membership.role,
    });
    this.logger.log({
      event: 'auth.refresh.rotated',
      userId: user.id,
      familyId: row.familyId,
    });
    return {
      accessToken,
      refreshToken: token,
      accessTokenExpiresIn: Math.floor(this.accessTtlMs / 1_000),
    };
  }

  async logout(refreshToken: string, subjectUserId: string): Promise<void> {
    const hash = this.tokens.hashRefreshToken(refreshToken);
    const row = await this.refreshRepo.findByHashIncludingRevoked(hash);
    if (row && row.userId === subjectUserId) {
      await this.refreshRepo.deleteById(row.id);
      this.logger.log({
        event: 'auth.logout',
        userId: subjectUserId,
        familyId: row.familyId,
      });
    } else {
      // Do not leak existence/ownership. Still emit a generic audit line.
      this.logger.log({ event: 'auth.logout', userId: subjectUserId });
    }
  }

  private async issueTokenPair(
    user: AuthUser,
    familyId: string,
  ): Promise<TokenPair> {
    const { token, hash } = this.tokens.generateRefreshToken();
    const expiresAt = new Date(Date.now() + this.refreshTtlMs);
    await this.refreshRepo.create({
      userId: user.sub,
      familyId,
      tokenHash: hash,
      expiresAt,
    });
    const accessToken = this.tokens.signAccess(user);
    return {
      accessToken,
      refreshToken: token,
      accessTokenExpiresIn: Math.floor(this.accessTtlMs / 1_000),
    };
  }

  private async createRegisteredSession(input: {
    displayName: string;
    email: string;
    firebaseUid: string;
    workspaceName: string;
  }): Promise<TokenPair> {
    const { token, hash } = this.tokens.generateRefreshToken();
    const familyId = randomUUID();
    const expiresAt = new Date(Date.now() + this.refreshTtlMs);
    const accessTokenExpiresIn = Math.floor(this.accessTtlMs / 1_000);

    return this.db.transaction(async (tx) => {
      await this.lockRegistrationKeys(tx, input.email, input.workspaceName);

      const existingUser = await this.findUserByEmail(input.email, tx);
      if (existingUser) {
        throw createRegistrationConflict('duplicate_email');
      }

      const existingWorkspace = await this.findWorkspaceByName(
        input.workspaceName,
        tx,
      );
      if (existingWorkspace) {
        throw createRegistrationConflict('workspace_name_unavailable');
      }

      const userRow = (
        await tx
          .insert(users)
          .values({
            avatarUrl: null,
            displayName: input.displayName,
            email: input.email,
            firebaseUid: input.firebaseUid,
          })
          .returning()
      )[0]!;

      const workspaceRow = (
        await tx
          .insert(workspaces)
          .values({
            name: input.workspaceName,
          })
          .returning()
      )[0]!;

      await tx.insert(workspaceSettings).values({
        workspaceId: workspaceRow.id,
      });

      await tx.insert(workspaceMembers).values({
        role: 'admin',
        userId: userRow.id,
        workspaceId: workspaceRow.id,
      });

      await tx.insert(refreshTokens).values({
        expiresAt,
        familyId,
        tokenHash: hash,
        userId: userRow.id,
      });

      return {
        accessToken: this.tokens.signAccess({
          email: userRow.email,
          firebaseUid: userRow.firebaseUid,
          role: 'admin',
          sub: userRow.id,
          workspaceId: workspaceRow.id,
        }),
        accessTokenExpiresIn,
        refreshToken: token,
      };
    });
  }

  private async lockRegistrationKeys(
    tx: Pick<DrizzleDB, 'execute'>,
    email: string,
    workspaceName: string,
  ): Promise<void> {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`register-email:${email}`}))`,
    );
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`register-workspace:${normalizeWorkspaceLookupKey(
        workspaceName,
      )}`}))`,
    );
  }

  private async findUserByEmail(
    email: string,
    db: Pick<DrizzleDB, 'select'> = this.db,
  ) {
    const [row] = await db
      .select(userRowSelection)
      .from(users)
      .where(sql`lower(btrim(${users.email})) = ${email}`)
      .limit(1);

    return row ?? null;
  }

  private async findWorkspaceByName(
    workspaceName: string,
    db: Pick<DrizzleDB, 'select'> = this.db,
  ) {
    const normalizedName = normalizeWorkspaceLookupKey(workspaceName);
    const [row] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(
        sql`lower(regexp_replace(btrim(${workspaces.name}), '[[:space:]]+', ' ', 'g')) = ${normalizedName}`,
      )
      .limit(1);

    return row ?? null;
  }

  private async cleanupFailedRegistration(
    firebaseUid: string,
    error: unknown,
  ): Promise<boolean> {
    try {
      await this.firebase.deleteUser(firebaseUid);
      return true;
    } catch (cleanupError) {
      this.logger.error({
        event: 'auth.register.cleanup_failed',
        firebaseUid,
        reason:
          cleanupError instanceof Error
            ? cleanupError.message
            : 'unknown_cleanup_error',
        sourceReason:
          error instanceof Error ? error.message : 'unknown_registration_error',
      });
      return false;
    }
  }

  private throwRegistrationFirebaseError(error: unknown): never {
    if (error instanceof FirebaseAdminAuthError) {
      if (error.code === 'auth/email-already-exists') {
        throw createRegistrationConflict('duplicate_email');
      }
      if (
        error.code === 'auth/invalid-password' ||
        error.code === 'auth/password-does-not-meet-requirements'
      ) {
        throw createRegistrationBadRequest('weak_password');
      }
    }

    this.logger.error({
      event: 'auth.register.firebase_failed',
      reason: error instanceof Error ? error.message : 'unknown_error',
    });
    throw createRegistrationUnavailable();
  }
}

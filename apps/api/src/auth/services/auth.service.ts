import { randomUUID } from 'node:crypto';
import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';
import { MembersService } from '../../members/services/members.service';
import { UsersService } from '../../users/services/users.service';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import {
  FIREBASE_ADMIN,
  type DecodedFirebaseToken,
  type FirebaseAdminService,
} from './firebase-admin.interface';
import { TokenService } from './token.service';
import type { AuthUser } from '../types/auth-user';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
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

  async refresh(refreshToken: string): Promise<TokenPair> {
    const hash = this.tokens.hashRefreshToken(refreshToken);
    const row = await this.refreshRepo.findByHashIncludingRevoked(hash);
    if (!row) {
      throw new UnauthorizedException('Unauthorized');
    }

    // Replay of an already-revoked token → destroy the whole family.
    if (row.revokedAt !== null) {
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
      await this.refreshRepo.deleteFamily(row.familyId);
      this.logger.warn({
        event: 'auth.refresh.reuse_detected',
        userId: row.userId,
        familyId: row.familyId,
      });
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
}

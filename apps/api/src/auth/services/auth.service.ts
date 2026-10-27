import { GithubAccountService } from '../../github/services/github-account.service';
import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { RegisterRequest } from '@gitiempo/shared';
import type { Env } from '../../config/env.validation';
import { normalizeEmail } from '../../commons/utils/normalize-email';
import { DomainError } from '../../commons/errors/domain-error';
import { DRIZZLE } from '../../db/db.constants';
import type { DbTransaction, DrizzleDB } from '../../db/db.types';
import {
  MembersService,
  type ActiveMembership,
} from '../../members/services/members.service';
import { workspaceMembers } from '../../members/schemas/workspace-members.schema';
import { UsersService } from '../../users/services/users.service';
import { userRowSelection, users } from '../../users/schemas/users.schema';
import { refreshTokens } from '../schemas/refresh-tokens.schema';
import {
  firebaseIdentityReservationRowSelection,
  firebaseIdentityReservations,
} from '../schemas/firebase-identity-reservations.schema';
import { firebaseSubjectBindings } from '../schemas/firebase-subject-bindings.schema';
import { workspaceSettings } from '../../workspaces/schemas/workspace-settings.schema';
import { workspaces } from '../../workspaces/schemas/workspaces.schema';
import {
  RefreshTokenRepository,
  type RefreshTokenRow,
} from '../repositories/refresh-token.repository';
import {
  FIREBASE_ADMIN,
  type DecodedFirebaseToken,
  FirebaseAdminAuthError,
  type FirebaseAdminService,
} from './firebase-admin.interface';
import { REGISTRATION_ERROR_MESSAGES } from '../registration-errors';
import { TokenService } from './token.service';
import { GoogleIdTokenVerifier } from './google-id-token-verifier.service';
import type { AuthUser } from '../types/auth-user';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
}

const POSTGRES_UNIQUE_VIOLATION = '23505';
const USERS_EMAIL_LOOKUP_UNIQUE_INDEX = 'users_email_lookup_unique';

export type SocialIdentityProvider = 'google' | 'github' | 'invitation';

export interface ResolvedSocialUser {
  id: string;
  email: string;
  firebaseUid: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface ProvisionSocialSessionInput {
  provider: SocialIdentityProvider;
  /** A linked GitHub owner is authoritative and must not fall back to email. */
  userId?: string;
  /** A verified email for a new or email-matched social identity. */
  email?: string;
  /** Every verified GitHub email accepted for an email-matched existing user. */
  verifiedEmails?: string[];
  /** An immutable OAuth ownership link bypasses email revalidation. */
  linked?: boolean;
  displayName?: string | null;
  avatarUrl?: string | null;
  /** Compatibility aliases used by the GitHub OAuth profile. */
  name?: string | null;
  picture?: string | null;
  /** Firebase subject received from a verified Google ID token. */
  firebaseUid?: string;
  googleSubject?: string;
}

export type SocialProvisionPersistence = (
  tx: DbTransaction,
  user: ResolvedSocialUser,
) => Promise<void>;

function normalizeWorkspaceName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
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
  code: 'duplicate_email',
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

function createIdentityProofRequired(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'identity_proof_required',
    error: 'Unauthorized',
    message: 'Authenticate with the identity already linked to this account.',
  });
}

function isKnownNonCreatingRegistrationError(
  error: FirebaseAdminAuthError,
): boolean {
  return [
    'auth/email-already-exists',
    'auth/invalid-email',
    'auth/invalid-password',
    'auth/password-does-not-meet-requirements',
    'auth/operation-not-allowed',
  ].includes(error.code);
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
): 'duplicate_email' | null {
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
    throw DomainError.internal(
      'invalid_duration_config',
      `Invalid duration: "${input}"`,
    );
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
  /** Mutable only for deterministic tests; deliberately not an environment setting. */
  private registrationFirebaseCreationTimeoutMs = 10_000;

  constructor(
    config: ConfigService<Env, true>,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(FIREBASE_ADMIN)
    private readonly firebase: FirebaseAdminService,
    private readonly tokens: TokenService,
    private readonly refreshRepo: RefreshTokenRepository,
    private readonly users: UsersService,
    private readonly members: MembersService,
    private readonly githubAccounts: GithubAccountService,
    private readonly googleIdTokens: GoogleIdTokenVerifier,
  ) {
    this.refreshTtlMs = parseDurationMs(
      config.get('JWT_REFRESH_TTL', { infer: true }),
    );
    this.accessTtlMs = parseDurationMs(
      config.get('JWT_ACCESS_TTL', { infer: true }),
    );
  }

  async login(
    firebaseIdToken: string,
    googleIdToken?: string,
  ): Promise<TokenPair> {
    const { decoded, googleSubject } = await this.verifyFirebaseIdentity(
      firebaseIdToken,
      googleIdToken,
    );
    if (!decoded.email) {
      this.logger.warn({
        event: 'auth.login.firebase_rejected',
        reason: 'missing_email',
        firebaseUid: decoded.uid,
      });
      throw new UnauthorizedException('Unauthorized');
    }

    const recoveredRegistration = await this.recoverPendingRegistration(
      decoded,
      googleSubject,
    );
    if (recoveredRegistration) return recoveredRegistration;

    if (decoded.signInProvider === 'google.com' && decoded.email_verified) {
      return this.provisionSocialSession({
        provider: 'google',
        email: decoded.email,
        name: decoded.name ?? null,
        picture: decoded.picture ?? null,
        firebaseUid: decoded.uid,
        googleSubject,
      });
    }

    const canonicalUser = await this.users.findRowByFirebaseUid(decoded.uid);
    const existingUser =
      canonicalUser ?? (await this.findAliasUserByFirebaseUid(decoded.uid));
    if (!existingUser) {
      throw new UnauthorizedException('Unauthorized');
    }
    const emailOwner = await this.findUserByEmail(
      normalizeEmail(decoded.email),
    );
    if (emailOwner && emailOwner.id !== existingUser.id) {
      throw new ConflictException({
        code: 'identity_conflict',
        error: 'Conflict',
        message: 'This identity is already linked to another account.',
      });
    }

    const membership = await this.members.requireActiveMembershipForUser(
      existingUser.id,
    );
    const row = await this.users.updateFromFirebase(existingUser.id, {
      firebaseUid: existingUser.firebaseUid,
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
      membership.id,
      randomUUID(),
    );
    this.logger.log({
      event: 'auth.login.success',
      userId: row.id,
    });
    return pair;
  }

  /** Verifies a Firebase session and, when required, its paired Google proof. */
  async verifyFirebaseIdentity(
    firebaseIdToken: string,
    googleIdToken?: string,
  ): Promise<{ decoded: DecodedFirebaseToken; googleSubject?: string }> {
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
    const firebaseEmail = decoded.email ? normalizeEmail(decoded.email) : null;
    if (
      decoded.signInProvider === 'google.com' &&
      (!firebaseEmail || !decoded.email_verified) &&
      googleIdToken
    ) {
      const proof = await this.googleIdTokens.verify(googleIdToken);
      if (
        (firebaseEmail && firebaseEmail !== proof.email) ||
        decoded.googleSubjects?.length !== 1 ||
        decoded.googleSubjects[0] !== proof.subject
      ) {
        throw new UnauthorizedException('Unauthorized');
      }
      return {
        decoded: { ...decoded, email: proof.email, email_verified: true },
        googleSubject: proof.subject,
      };
    }
    return { decoded };
  }

  /**
   * Issues an app session for an already externally-verified email (the
   * primary + verified GitHub email resolved by the backend GitHub OAuth flow).
   * Mirrors `login` but keyed on the email instead of a Firebase ID token, and
   * authenticates existing members only — it never provisions a user, so the
   * Firebase-UID identity model stays intact.
   */
  async resolveActiveMemberIdsByEmails(emails: string[]): Promise<string[]> {
    const normalized = [
      ...new Set(emails.map((email) => normalizeEmail(email))),
    ].filter((email) => email.length > 0);

    if (normalized.length === 0) {
      return [];
    }

    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(inArray(sql`lower(btrim(${users.email}))`, normalized));

    const memberIds: string[] = [];
    for (const row of rows) {
      const membership = await this.members.resolveActiveMembershipForUser(
        row.id,
      );

      if (membership) {
        memberIds.push(row.id);
      }
    }

    return memberIds;
  }

  /** Resolves all local users, including accounts that have no membership yet. */
  async resolveUserIdsByEmails(emails: string[]): Promise<string[]> {
    const normalized = [
      ...new Set(emails.map((email) => normalizeEmail(email))),
    ].filter((email) => email.length > 0);
    if (normalized.length === 0) return [];

    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(inArray(sql`lower(btrim(${users.email}))`, normalized));
    return rows.map((row) => row.id);
  }

  /**
   * Proves that an existing local account owns at least one of the supplied,
   * externally verified email addresses. Local email rows, invitations, and
   * reservations intentionally do not count as proof.
   */
  async assertVerifiedEmailOwnership(
    userId: string,
    verifiedEmails: readonly string[],
  ): Promise<void> {
    const emails = [...new Set(verifiedEmails.map(normalizeEmail))].filter(
      Boolean,
    );
    if (
      emails.length === 0 ||
      !(await this.hasVerifiedEmailOwnership(userId, emails))
    ) {
      throw createIdentityProofRequired();
    }
  }

  /** Reserves a deterministic Firebase subject before an invite sends setup mail. */
  async prepareInvitationIdentity(email: string): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    if (await this.findUserByEmail(normalizedEmail)) return;
    await this.reserveFirebaseIdentity(normalizedEmail, 'invitation');
  }

  /** Resolves an invitee's proved Firebase subject while the invite mutation is locked. */
  async acceptInviteIdentity(
    decoded: DecodedFirebaseToken,
    persist: (tx: DbTransaction, user: ResolvedSocialUser) => Promise<void>,
    googleSubject?: string,
  ): Promise<void> {
    if (!decoded.email) throw new UnauthorizedException('Unauthorized');
    const email = normalizeEmail(decoded.email);
    const existingSubject = await this.findUserByFirebaseSubject(decoded.uid);
    const existingEmail = await this.findUserByEmail(email);
    await this.db.transaction(async (tx) => {
      await this.lockIdentityKeys(tx, [
        `email:${email}`,
        `uid:${decoded.uid}`,
        ...(existingSubject ? [`uid:${existingSubject.firebaseUid}`] : []),
        ...(existingEmail ? [`uid:${existingEmail.firebaseUid}`] : []),
      ]);
      await this.rejectPendingRegistrationReservation(tx, email);
      await this.firebase.assertActiveUserByUid(
        decoded.uid,
        email,
        googleSubject,
      );
      const user = await this.resolveSocialUserInTransaction(tx, {
        provider:
          decoded.signInProvider === 'google.com' && decoded.email_verified
            ? 'google'
            : 'invitation',
        email,
        verifiedEmails: [email],
        firebaseUid: decoded.uid,
        displayName: decoded.name ?? null,
        avatarUrl: decoded.picture ?? null,
      });
      await persist(tx, user);
      await this.bindSocialIdentityReservation(tx, decoded.uid, user.id);
    });
  }

  /**
   * Resolves a verified social identity, ensures it has a membership and writes
   * the refresh session in the same transaction as any caller-supplied OAuth
   * persistence.
   */
  async provisionSocialSession(
    input: ProvisionSocialSessionInput,
    persist?: SocialProvisionPersistence,
  ): Promise<TokenPair> {
    const candidateEmail = input.email ? normalizeEmail(input.email) : null;
    const verifiedEmails = [
      ...new Set(
        (input.verifiedEmails ?? (candidateEmail ? [candidateEmail] : []))
          .map((email) => normalizeEmail(email))
          .filter(Boolean),
      ),
    ];
    if (!input.userId && verifiedEmails.length === 0) {
      throw new UnauthorizedException('Unauthorized');
    }

    let firebaseUid = input.firebaseUid;
    if (!firebaseUid) {
      if (input.userId) {
        const linked = await this.users.findRowById(input.userId);
        if (!linked) throw new UnauthorizedException('Unauthorized');
        firebaseUid = linked.firebaseUid;
      } else {
        const existing = await this.findUserByEmail(candidateEmail!);
        firebaseUid =
          existing?.firebaseUid ??
          (await this.reserveFirebaseIdentity(
            candidateEmail!,
            'github-signin',
          ));
      }
    }

    const token = this.tokens.generateRefreshToken();
    const familyId = randomUUID();
    const expiresAt = new Date(Date.now() + this.refreshTtlMs);
    const accessTokenExpiresIn = Math.floor(this.accessTtlMs / 1_000);
    const existingSubject = await this.findUserByFirebaseSubject(firebaseUid);
    const existingCandidate = input.userId
      ? await this.users.findRowById(input.userId)
      : await this.findUserByVerifiedEmails(verifiedEmails);

    return this.db.transaction(async (tx) => {
      await this.lockIdentityKeys(tx, [
        ...verifiedEmails.map((email) => `email:${email}`),
        `uid:${firebaseUid}`,
        ...(input.userId ? [`user:${input.userId}`] : []),
        ...(existingSubject ? [`uid:${existingSubject.firebaseUid}`] : []),
        ...(existingCandidate ? [`uid:${existingCandidate.firebaseUid}`] : []),
      ]);
      await this.rejectPendingRegistrationReservation(tx, candidateEmail);
      if (
        input.provider === 'google' ||
        (!input.userId && input.provider === 'github')
      ) {
        await this.firebase.assertActiveUserByUid(
          firebaseUid,
          candidateEmail!,
          input.googleSubject,
        );
      }

      const user = await this.resolveSocialUserInTransaction(tx, {
        ...input,
        firebaseUid,
        verifiedEmails,
      });
      const membership = await this.ensureSocialMembership(tx, user.id);

      if (persist) await persist(tx, user);

      await tx.insert(refreshTokens).values({
        expiresAt,
        familyId,
        tokenHash: token.hash,
        userId: user.id,
        workspaceMemberId: membership.id,
        workspaceId: membership.workspaceId,
      });
      await this.bindSocialIdentityReservation(tx, firebaseUid, user.id);

      return {
        accessToken: this.tokens.signAccess({
          sub: user.id,
          email: user.email,
          firebaseUid: user.firebaseUid,
          workspaceId: membership.workspaceId,
          role: membership.role,
        }),
        refreshToken: token.token,
        accessTokenExpiresIn,
      };
    });
  }

  async assertActiveMember(memberId: string): Promise<void> {
    const user = await this.users.findRowById(memberId);
    const membership = user
      ? await this.members.resolveActiveMembershipForUser(memberId)
      : null;
    if (!user || !membership) throw new UnauthorizedException('Unauthorized');
  }

  async createSessionForMember(
    memberId: string,
    executor?: Pick<DrizzleDB, 'insert'>,
  ): Promise<TokenPair> {
    const existingUser = await this.users.findRowById(memberId);
    if (!existingUser) {
      this.logger.warn({
        event: 'auth.github_login.no_user',
      });
      throw new UnauthorizedException('Unauthorized');
    }

    const membership = await this.members.resolveActiveMembershipForUser(
      existingUser.id,
    );
    if (!membership) {
      this.logger.warn({
        event: 'auth.github_login.no_membership',
        userId: existingUser.id,
      });
      throw new UnauthorizedException('Unauthorized');
    }

    const pair = await this.issueTokenPair(
      {
        sub: existingUser.id,
        email: existingUser.email,
        firebaseUid: existingUser.firebaseUid,
        workspaceId: membership.workspaceId,
        role: membership.role,
      },
      membership.id,
      randomUUID(),
      executor,
    );
    this.logger.log({
      event: 'auth.github_login.success',
      userId: existingUser.id,
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

    const reservation = await this.reserveRegistrationIdentity({
      displayName,
      email,
      ownerAcknowledgement: input.ownerAcknowledgement,
      workspaceName,
    });

    let firebaseUid: string | null = null;
    try {
      return await this.db.transaction(async (tx) => {
        await this.lockIdentityKeys(tx, [
          `email:${email}`,
          `uid:${reservation.firebaseUid}`,
        ]);
        const currentReservation = await this.findReservationByUid(
          reservation.firebaseUid,
          tx,
        );
        if (
          !currentReservation ||
          currentReservation.id !== reservation.id ||
          currentReservation.purpose !== 'registration' ||
          currentReservation.state !== 'reserved'
        ) {
          throw createRegistrationUnavailable();
        }

        const creation = this.firebase.createEmailPasswordUser({
          displayName,
          email,
          password: input.password,
          uid: reservation.firebaseUid,
        });
        const firebaseUser =
          await this.waitForRegistrationFirebaseCreation(creation);
        if (!firebaseUser) {
          this.trackLateRegistrationFirebaseOutcome(reservation.id, creation);
          throw createRegistrationUnavailable();
        }
        if (firebaseUser.uid !== reservation.firebaseUid) {
          this.logger.warn({
            event: 'auth.register.firebase_uid_mismatch',
            uidValuesRedacted: true,
          });
          throw createRegistrationUnavailable();
        }
        firebaseUid = firebaseUser.uid;
        await this.confirmIdentityReservationInTransaction(tx, reservation.id);
        const pair = await this.createRegisteredSessionInTransaction(tx, {
          displayName,
          email,
          firebaseUid,
          workspaceName,
        });
        this.logger.log({ event: 'auth.register.success', email, firebaseUid });
        return pair;
      });
    } catch (error) {
      if (firebaseUid) {
        try {
          const compensated = await this.compensateKnownRegistrationFailure(
            reservation,
            firebaseUid,
          );
          if (!compensated) throw createRegistrationUnavailable();
        } catch {
          throw createRegistrationUnavailable();
        }
      } else if (error instanceof FirebaseAdminAuthError) {
        if (isKnownNonCreatingRegistrationError(error)) {
          await this.deleteUnboundRegistrationReservation(reservation);
        }
        this.throwRegistrationFirebaseError(error);
      }
      if (isRegistrationHttpException(error)) throw error;
      if (getRegistrationConstraintCode(error) === 'duplicate_email') {
        throw createRegistrationConflict('duplicate_email');
      }
      throw createRegistrationUnavailable();
    }
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const row = await this.requireRotatableRefreshToken(refreshToken);

    const user = await this.users.findRowById(row.userId);
    if (!user) {
      // Subject disappeared; clean up the family to be safe.
      await this.refreshRepo.deleteFamily(row.familyId);
      throw new UnauthorizedException('Unauthorized');
    }
    const membership = await this.members.requireActiveMembershipById(
      user.id,
      row.workspaceMemberId,
    );

    const pair = await this.rotateRefreshSession(row, user, membership);
    this.logger.log({
      event: 'auth.refresh.rotated',
      userId: user.id,
      familyId: row.familyId,
    });
    return pair;
  }

  async switchWorkspace(
    subjectUser: AuthUser,
    workspaceId: string,
    refreshToken: string,
  ): Promise<TokenPair> {
    const user = await this.users.findRowById(subjectUser.sub);
    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    const membership = await this.members.resolveActiveMembership(
      user.id,
      workspaceId,
    );
    if (!membership) {
      throw new ForbiddenException('Forbidden');
    }

    const row = await this.requireRotatableRefreshToken(refreshToken);
    if (row.userId !== user.id) {
      throw new UnauthorizedException('Unauthorized');
    }
    if (row.workspaceId !== subjectUser.workspaceId) {
      throw new UnauthorizedException('Unauthorized');
    }
    await this.members.requireActiveMembershipById(
      user.id,
      row.workspaceMemberId,
    );

    return this.rotateRefreshSession(row, user, membership);
  }

  async logout(refreshToken: string, subjectUserId: string): Promise<void> {
    const hash = this.tokens.hashRefreshToken(refreshToken);
    const row = await this.refreshRepo.findByHashIncludingRevoked(hash);
    await this.githubAccounts.invalidatePendingAuthorizations(subjectUserId);
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
    membershipId: string,
    familyId: string,
    executor?: Pick<DrizzleDB, 'insert'>,
  ): Promise<TokenPair> {
    const { token, hash } = this.tokens.generateRefreshToken();
    const expiresAt = new Date(Date.now() + this.refreshTtlMs);
    await this.refreshRepo.create(
      {
        userId: user.sub,
        workspaceMemberId: membershipId,
        workspaceId: user.workspaceId,
        familyId,
        tokenHash: hash,
        expiresAt,
      },
      executor,
    );
    const accessToken = this.tokens.signAccess(user);
    return {
      accessToken,
      refreshToken: token,
      accessTokenExpiresIn: Math.floor(this.accessTtlMs / 1_000),
    };
  }

  private async requireRotatableRefreshToken(
    refreshToken: string,
  ): Promise<RefreshTokenRow> {
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

    return row;
  }

  private async rotateRefreshSession(
    row: RefreshTokenRow,
    user: { id: string; email: string; firebaseUid: string },
    membership: ActiveMembership,
  ): Promise<TokenPair> {
    const { token, hash: newHash } = this.tokens.generateRefreshToken();
    const expiresAt = new Date(Date.now() + this.refreshTtlMs);
    const rotated = await this.refreshRepo.rotateIfActive(row.id, {
      userId: user.id,
      workspaceMemberId: membership.id,
      workspaceId: membership.workspaceId,
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
    return this.db.transaction((tx) =>
      this.createRegisteredSessionInTransaction(tx, input),
    );
  }

  private async recoverPendingRegistration(
    decoded: DecodedFirebaseToken,
    googleSubject?: string,
  ): Promise<TokenPair | null> {
    const reservation = await this.findReservationByUid(decoded.uid);
    if (
      !reservation ||
      reservation.purpose !== 'registration' ||
      reservation.state === 'bound'
    ) {
      return null;
    }
    const email = normalizeEmail(decoded.email!);
    if (email !== reservation.normalizedEmail) {
      throw new UnauthorizedException('Unauthorized');
    }
    try {
      await this.firebase.assertActiveUserByUid(
        decoded.uid,
        email,
        googleSubject,
      );
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.db.transaction(async (tx) => {
      await this.lockIdentityKeys(tx, [`email:${email}`, `uid:${decoded.uid}`]);
      const current = await this.findReservationByUid(decoded.uid, tx);
      if (
        !current ||
        current.id !== reservation.id ||
        current.purpose !== 'registration' ||
        current.normalizedEmail !== email
      ) {
        throw new UnauthorizedException('Unauthorized');
      }
      try {
        await this.firebase.assertActiveUserByUid(
          decoded.uid,
          email,
          googleSubject,
        );
      } catch {
        throw new UnauthorizedException('Unauthorized');
      }
      if (current.state === 'bound') {
        const boundUser = await this.findUserByFirebaseSubject(decoded.uid, tx);
        if (!boundUser || normalizeEmail(boundUser.email) !== email) {
          throw new UnauthorizedException('Unauthorized');
        }
        return this.issueRegisteredSessionForExistingUser(
          tx,
          boundUser,
          current.registrationWorkspaceName ?? 'Workspace',
          false,
        );
      }
      if (
        !current.registrationDisplayName ||
        !current.registrationWorkspaceName ||
        current.registrationOwnerAcknowledgement !== true
      ) {
        throw new UnauthorizedException('Unauthorized');
      }
      await this.confirmIdentityReservationInTransaction(tx, current.id);
      const existingUser = await this.findUserByEmail(email, tx);
      if (existingUser) {
        if (existingUser.firebaseUid !== decoded.uid) {
          throw new UnauthorizedException('Unauthorized');
        }
        const pair = await this.issueRegisteredSessionForExistingUser(
          tx,
          existingUser,
          current.registrationWorkspaceName,
        );
        await tx
          .update(firebaseIdentityReservations)
          .set({
            state: 'bound',
            userId: existingUser.id,
            updatedAt: new Date(),
          })
          .where(eq(firebaseIdentityReservations.id, current.id));
        return pair;
      }
      return this.createRegisteredSessionInTransaction(tx, {
        displayName: current.registrationDisplayName,
        email,
        firebaseUid: decoded.uid,
        workspaceName: current.registrationWorkspaceName,
      });
    });
  }

  private async createRegisteredSessionInTransaction(
    tx: DbTransaction,
    input: {
      displayName: string;
      email: string;
      firebaseUid: string;
      workspaceName: string;
    },
  ): Promise<TokenPair> {
    const { token, hash } = this.tokens.generateRefreshToken();
    const familyId = randomUUID();
    const expiresAt = new Date(Date.now() + this.refreshTtlMs);
    const accessTokenExpiresIn = Math.floor(this.accessTtlMs / 1_000);

    const existingUser = await this.findUserByEmail(input.email, tx);
    if (existingUser) {
      throw createRegistrationConflict('duplicate_email');
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

    const membershipRow = await this.createWorkspaceMembershipInTransaction(
      tx,
      userRow.id,
      'admin',
      input.workspaceName,
    );

    await tx.insert(refreshTokens).values({
      expiresAt,
      familyId,
      tokenHash: hash,
      userId: userRow.id,
      workspaceMemberId: membershipRow.id,
      workspaceId: membershipRow.workspaceId,
    });
    await tx
      .update(firebaseIdentityReservations)
      .set({ state: 'bound', userId: userRow.id, updatedAt: new Date() })
      .where(eq(firebaseIdentityReservations.firebaseUid, input.firebaseUid));

    return {
      accessToken: this.tokens.signAccess({
        email: userRow.email,
        firebaseUid: userRow.firebaseUid,
        role: 'admin',
        sub: userRow.id,
        workspaceId: membershipRow.workspaceId,
      }),
      accessTokenExpiresIn,
      refreshToken: token,
    };
  }

  private async issueRegisteredSessionForExistingUser(
    tx: DbTransaction,
    user: { id: string; email: string; firebaseUid: string },
    workspaceName: string,
    createMembershipIfMissing = true,
  ): Promise<TokenPair> {
    const [membership] = await tx
      .select({
        id: workspaceMembers.id,
        workspaceId: workspaceMembers.workspaceId,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, user.id))
      .orderBy(
        asc(workspaceMembers.joinedAt),
        asc(workspaceMembers.workspaceId),
      )
      .limit(1);
    if (!membership && !createMembershipIfMissing) {
      throw new UnauthorizedException('Unauthorized');
    }
    const activeMembership =
      membership ??
      (await this.createWorkspaceMembershipInTransaction(
        tx,
        user.id,
        'admin',
        workspaceName,
      ));
    return this.issueTokenPair(
      {
        sub: user.id,
        email: user.email,
        firebaseUid: user.firebaseUid,
        workspaceId: activeMembership.workspaceId,
        role: activeMembership.role,
      },
      activeMembership.id,
      randomUUID(),
      tx,
    );
  }

  private async reserveFirebaseIdentity(
    email: string,
    purpose: 'github-signin' | 'invitation',
  ): Promise<string> {
    const reservation = await this.reserveIdentity(email, purpose);

    if (reservation.state !== 'bound') {
      try {
        await this.firebase.createUnclaimedUser({
          uid: reservation.firebaseUid,
          email: reservation.normalizedEmail,
        });
      } catch (error) {
        if (
          error instanceof FirebaseAdminAuthError &&
          error.code === 'auth/email-already-exists'
        ) {
          throw new UnauthorizedException({
            code: 'identity_proof_required',
            error: 'Unauthorized',
            message:
              'Authenticate with the identity already linked to this account.',
          });
        }
        throw createRegistrationUnavailable();
      }
      if (reservation.state === 'reserved') {
        await this.confirmIdentityReservation(reservation.id);
      }
    }
    return reservation.firebaseUid;
  }

  private async reserveRegistrationIdentity(input: {
    email: string;
    displayName: string;
    workspaceName: string;
    ownerAcknowledgement: true;
  }) {
    return this.db.transaction(async (tx) => {
      await this.lockIdentityKeys(tx, [`email:${input.email}`]);
      if (await this.findUserByEmail(input.email, tx)) {
        throw createRegistrationConflict('duplicate_email');
      }
      const existing = await this.findReservationByEmail(input.email, tx);
      if (existing) {
        if (existing.purpose === 'registration') {
          throw createRegistrationUnavailable();
        }
        throw createRegistrationConflict('duplicate_email');
      }
      return (
        await tx
          .insert(firebaseIdentityReservations)
          .values({
            normalizedEmail: input.email,
            firebaseUid: randomUUID(),
            purpose: 'registration',
            registrationDisplayName: input.displayName,
            registrationWorkspaceName: input.workspaceName,
            registrationOwnerAcknowledgement: input.ownerAcknowledgement,
          })
          .returning(firebaseIdentityReservationRowSelection)
      )[0]!;
    });
  }

  private async waitForRegistrationFirebaseCreation<T>(
    creation: Promise<T>,
  ): Promise<T | null> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<null>((resolve) => {
      timeout = setTimeout(
        () => resolve(null),
        this.registrationFirebaseCreationTimeoutMs,
      );
    });
    try {
      return await Promise.race([creation, timedOut]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private trackLateRegistrationFirebaseOutcome(
    reservationId: string,
    creation: Promise<{ uid: string }>,
  ): void {
    void creation
      .then(async (firebaseUser) => {
        await this.db.transaction(async (tx) => {
          await this.lockIdentityKeys(tx, [`uid:${firebaseUser.uid}`]);
          const reservation = await this.findReservationByUid(
            firebaseUser.uid,
            tx,
          );
          if (
            reservation?.id === reservationId &&
            reservation.state === 'reserved' &&
            reservation.purpose === 'registration'
          ) {
            await this.confirmIdentityReservationInTransaction(
              tx,
              reservationId,
            );
          }
        });
      })
      .catch((error: unknown) => {
        this.logger.warn({
          event: 'auth.register.firebase_late_failure',
          reason: error instanceof Error ? error.message : 'unknown_error',
        });
      });
  }

  private async deleteUnboundRegistrationReservation(reservation: {
    id: string;
    firebaseUid: string;
    normalizedEmail: string;
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.lockIdentityKeys(tx, [
        `email:${reservation.normalizedEmail}`,
        `uid:${reservation.firebaseUid}`,
      ]);
      await tx
        .delete(firebaseIdentityReservations)
        .where(
          and(
            eq(firebaseIdentityReservations.id, reservation.id),
            eq(firebaseIdentityReservations.state, 'reserved'),
          ),
        );
    });
  }

  /**
   * A provider call succeeded but the SQL foundation did not. The Firebase
   * subject may only be deleted while the exact reservation remains unbound
   * and no local canonical or additional binding has adopted it.
   */
  private async compensateKnownRegistrationFailure(
    reservation: {
      id: string;
      firebaseUid: string;
      normalizedEmail: string;
    },
    firebaseUid: string,
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      await this.lockIdentityKeys(tx, [
        `email:${reservation.normalizedEmail}`,
        `uid:${firebaseUid}`,
      ]);
      const current = await this.findReservationByUid(firebaseUid, tx);
      if (
        !current ||
        current.id !== reservation.id ||
        current.purpose !== 'registration' ||
        current.state !== 'reserved'
      ) {
        return false;
      }
      if (await this.findUserByFirebaseSubject(firebaseUid, tx)) {
        return false;
      }
      await this.firebase.deleteUser(firebaseUid);
      await tx
        .delete(firebaseIdentityReservations)
        .where(
          and(
            eq(firebaseIdentityReservations.id, reservation.id),
            eq(firebaseIdentityReservations.state, 'reserved'),
          ),
        );
      return true;
    });
  }

  private async reserveIdentity(
    email: string,
    purpose: 'github-signin' | 'invitation' | 'registration',
  ) {
    return this.db.transaction(async (tx) => {
      await this.lockIdentityKeys(tx, [`email:${email}`]);
      return this.reserveIdentityInTransaction(tx, email, purpose);
    });
  }

  private async reserveIdentityInTransaction(
    tx: DbTransaction,
    email: string,
    purpose: 'github-signin' | 'invitation' | 'registration',
  ) {
    const [existing] = await tx
      .select(firebaseIdentityReservationRowSelection)
      .from(firebaseIdentityReservations)
      .where(
        sql`lower(btrim(${firebaseIdentityReservations.normalizedEmail})) = ${email}`,
      )
      .limit(1);
    if (existing) {
      if (
        existing.purpose === 'registration' &&
        existing.state !== 'bound' &&
        purpose !== 'registration'
      ) {
        throw createIdentityProofRequired();
      }
      return existing;
    }

    const firebaseUid = randomUUID();
    return (
      await tx
        .insert(firebaseIdentityReservations)
        .values({ normalizedEmail: email, firebaseUid, purpose })
        .returning()
    )[0]!;
  }

  private async findReservationByEmail(
    email: string,
    db: Pick<DrizzleDB, 'select'> = this.db,
  ) {
    const [reservation] = await db
      .select(firebaseIdentityReservationRowSelection)
      .from(firebaseIdentityReservations)
      .where(
        sql`lower(btrim(${firebaseIdentityReservations.normalizedEmail})) = ${email}`,
      )
      .limit(1);
    return reservation ?? null;
  }

  private async findReservationByUid(
    firebaseUid: string,
    db: Pick<DrizzleDB, 'select'> = this.db,
  ) {
    const [reservation] = await db
      .select(firebaseIdentityReservationRowSelection)
      .from(firebaseIdentityReservations)
      .where(eq(firebaseIdentityReservations.firebaseUid, firebaseUid))
      .limit(1);
    return reservation ?? null;
  }

  private async confirmIdentityReservation(
    reservationId: string,
  ): Promise<void> {
    await this.db.transaction((tx) =>
      this.confirmIdentityReservationInTransaction(tx, reservationId),
    );
  }

  private async confirmIdentityReservationInTransaction(
    tx: Pick<DrizzleDB, 'update'>,
    reservationId: string,
  ): Promise<void> {
    await tx
      .update(firebaseIdentityReservations)
      .set({ state: 'confirmed', updatedAt: new Date() })
      .where(
        and(
          eq(firebaseIdentityReservations.id, reservationId),
          eq(firebaseIdentityReservations.state, 'reserved'),
        ),
      );
  }

  /** A social flow must not adopt an unfinished manual-registration foundation. */
  private async rejectPendingRegistrationReservation(
    tx: DbTransaction,
    email: string | null,
  ): Promise<void> {
    if (!email) return;
    const reservation = await this.findReservationByEmail(email, tx);
    if (
      reservation?.purpose === 'registration' &&
      reservation.state !== 'bound'
    ) {
      throw createIdentityProofRequired();
    }
  }

  /** Only reservations created for social provisioning may become social bindings. */
  private async bindSocialIdentityReservation(
    tx: Pick<DrizzleDB, 'update'>,
    firebaseUid: string,
    userId: string,
  ): Promise<void> {
    await tx
      .update(firebaseIdentityReservations)
      .set({ state: 'bound', userId, updatedAt: new Date() })
      .where(
        and(
          eq(firebaseIdentityReservations.firebaseUid, firebaseUid),
          inArray(firebaseIdentityReservations.purpose, [
            'github-signin',
            'invitation',
          ]),
        ),
      );
  }

  private async resolveSocialUserInTransaction(
    tx: DbTransaction,
    input: ProvisionSocialSessionInput & {
      firebaseUid: string;
      verifiedEmails: string[];
    },
  ): Promise<ResolvedSocialUser> {
    const byId = input.userId
      ? await this.findUserById(input.userId, tx)
      : null;
    if (input.userId && !byId) throw new UnauthorizedException('Unauthorized');

    const byUid = await this.findUserByFirebaseSubject(input.firebaseUid, tx);
    const byEmail =
      input.linked || input.userId
        ? null
        : await this.findUserByVerifiedEmails(input.verifiedEmails, tx);
    const distinct = new Set(
      [byId, byUid, byEmail].filter(Boolean).map((row) => row!.id),
    );
    if (distinct.size > 1) {
      throw new ConflictException({
        code: 'identity_conflict',
        error: 'Conflict',
        message: 'This identity is already linked to another account.',
      });
    }

    let row = byId ?? byUid ?? byEmail;
    if (
      byEmail &&
      !(await this.hasVerifiedEmailOwnership(
        byEmail.id,
        input.verifiedEmails,
        tx,
      ))
    ) {
      throw createIdentityProofRequired();
    }
    if (
      byId &&
      !input.linked &&
      (!(await this.hasVerifiedEmailOwnership(
        byId.id,
        input.verifiedEmails,
        tx,
      )) ||
        !input.verifiedEmails.includes(normalizeEmail(byId.email)))
    ) {
      throw createIdentityProofRequired();
    }
    if (!row) {
      const email = input.verifiedEmails[0];
      if (!email) throw new UnauthorizedException('Unauthorized');
      row = (
        await tx
          .insert(users)
          .values({
            email,
            firebaseUid: input.firebaseUid,
            displayName: input.displayName ?? input.name ?? null,
            avatarUrl: input.avatarUrl ?? input.picture ?? null,
          })
          .returning(userRowSelection)
      )[0]!;
    } else if (!input.linked && input.verifiedEmails.length > 0) {
      const email = input.verifiedEmails[0]!;
      const [updated] = await tx
        .update(users)
        .set({
          email,
          displayName: input.displayName ?? input.name ?? row.displayName,
          avatarUrl:
            row.avatarSource === 'provider'
              ? (input.avatarUrl ?? input.picture ?? row.avatarUrl)
              : row.avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, row.id))
        .returning(userRowSelection);
      row = updated!;
    }

    const verifiedEmail = input.verifiedEmails[0];
    if (
      verifiedEmail &&
      (input.provider === 'google' || input.provider === 'github')
    ) {
      await tx
        .insert(firebaseSubjectBindings)
        .values({
          firebaseUid: input.firebaseUid,
          userId: row.id,
          providerId: input.provider,
          verifiedEmail,
        })
        .onConflictDoNothing();
    }
    if (row.firebaseUid !== input.firebaseUid) {
      const [binding] = await tx
        .select({ userId: firebaseSubjectBindings.userId })
        .from(firebaseSubjectBindings)
        .where(eq(firebaseSubjectBindings.firebaseUid, input.firebaseUid))
        .limit(1);
      if (binding?.userId !== row.id) {
        throw new ConflictException({
          code: 'identity_conflict',
          error: 'Conflict',
          message: 'This identity is already linked to another account.',
        });
      }
    }
    return row;
  }

  private async ensureSocialMembership(tx: DbTransaction, userId: string) {
    const [existing] = await tx
      .select({
        id: workspaceMembers.id,
        workspaceId: workspaceMembers.workspaceId,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, userId))
      .orderBy(
        asc(workspaceMembers.joinedAt),
        asc(workspaceMembers.workspaceId),
      )
      .limit(1);
    if (existing) return existing;

    return this.createWorkspaceMembershipInTransaction(
      tx,
      userId,
      'admin',
      'Workspace',
    );
  }

  private async createWorkspaceMembershipInTransaction(
    tx: DbTransaction,
    userId: string,
    role: 'admin',
    name: string,
  ) {
    const workspace = (
      await tx.insert(workspaces).values({ name }).returning()
    )[0]!;
    await tx.insert(workspaceSettings).values({ workspaceId: workspace.id });
    return (
      await tx
        .insert(workspaceMembers)
        .values({ workspaceId: workspace.id, userId, role })
        .returning({
          id: workspaceMembers.id,
          workspaceId: workspaceMembers.workspaceId,
          role: workspaceMembers.role,
        })
    )[0]!;
  }

  private async lockIdentityKeys(
    tx: Pick<DrizzleDB, 'execute'>,
    keys: string[],
  ): Promise<void> {
    for (const key of [...new Set(keys)].sort()) {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${`identity:${key}`}))`,
      );
    }
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

  private async findUserById(
    id: string,
    db: Pick<DrizzleDB, 'select'> = this.db,
  ) {
    const [row] = await db
      .select(userRowSelection)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row ?? null;
  }

  private async findUserByVerifiedEmails(
    emails: string[],
    db: Pick<DrizzleDB, 'select'> = this.db,
  ) {
    if (emails.length === 0) return null;
    const [row] = await db
      .select(userRowSelection)
      .from(users)
      .where(inArray(sql`lower(btrim(${users.email}))`, emails))
      .limit(1);
    return row ?? null;
  }

  private async findUserByFirebaseSubject(
    firebaseUid: string,
    db: Pick<DrizzleDB, 'select'> = this.db,
  ) {
    const [canonical] = await db
      .select(userRowSelection)
      .from(users)
      .where(eq(users.firebaseUid, firebaseUid))
      .limit(1);
    if (canonical) return canonical;
    return this.findAliasUserByFirebaseUid(firebaseUid, db);
  }

  private async findAliasUserByFirebaseUid(
    firebaseUid: string,
    db: Pick<DrizzleDB, 'select'> = this.db,
  ) {
    const [binding] = await db
      .select({ user: userRowSelection })
      .from(firebaseSubjectBindings)
      .innerJoin(users, eq(firebaseSubjectBindings.userId, users.id))
      .where(eq(firebaseSubjectBindings.firebaseUid, firebaseUid))
      .limit(1);
    return binding?.user ?? null;
  }

  private async hasVerifiedEmailOwnership(
    userId: string,
    verifiedEmails: readonly string[],
    db: Pick<DrizzleDB, 'select'> = this.db,
  ): Promise<boolean> {
    const emails = [...new Set(verifiedEmails.map(normalizeEmail))].filter(
      Boolean,
    );
    if (emails.length === 0) return false;

    const [durableProof] = await db
      .select({ id: firebaseSubjectBindings.id })
      .from(firebaseSubjectBindings)
      .where(
        and(
          eq(firebaseSubjectBindings.userId, userId),
          inArray(firebaseSubjectBindings.providerId, ['google', 'github']),
          inArray(
            sql`lower(btrim(${firebaseSubjectBindings.verifiedEmail}))`,
            emails,
          ),
        ),
      )
      .limit(1);
    if (durableProof) return true;

    const user = await this.findUserById(userId, db);
    if (!user) return false;
    try {
      const firebaseUser = await this.firebase.getUserByUid(user.firebaseUid);
      return Boolean(
        firebaseUser &&
        !firebaseUser.disabled &&
        firebaseUser.emailVerified &&
        firebaseUser.email &&
        emails.includes(normalizeEmail(firebaseUser.email)),
      );
    } catch {
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

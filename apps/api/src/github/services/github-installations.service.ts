import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  githubTrackingErrorMessages,
  githubTrackingErrorStatuses,
} from '@gitiempo/shared';
import type {
  GitHubInstallationCompleteRequest,
  GitHubInstallationSetupRequest,
  GitHubInstallationSetupResponse,
  GitHubIssue,
  GitHubRepository,
  WorkspaceGitHubInstallation,
  WorkspaceGitHubInstallationList,
  GitHubTrackingErrorCode,
} from '@gitiempo/shared';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import type { AuthUser } from '../../auth/types/auth-user';
import { DomainError } from '../../commons/errors/domain-error';
import type { Env } from '../../config/env.validation';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import { workspaceMembers } from '../../members/schemas/workspace-members.schema';
import { workspaceGitHubOrganizations } from '../schemas/workspace-github-organizations.schema';
import {
  githubInstallationSetupStates,
  githubInstallationWebhookDeliveries,
  workspaceGitHubInstallations,
  workspaceGitHubInstallationRowSelection,
  type WorkspaceGithubInstallationRow,
} from '../schemas/workspace-github-installations.schema';
import { normalizeGitHubLogin } from '../github-repo-key';
import {
  GithubApiClientService,
  GithubInstallationAuthenticationError,
  GithubInstallationPermissionError,
} from './github-api-client.service';
import { GithubConnectionsService } from './github-connections.service';
import {
  GithubInstallationTokenPermissionError,
  GithubInstallationTokenProviderService,
} from './github-installation-token-provider.service';

const SETUP_TTL_MS = 10 * 60_000;
const API_URL = 'https://api.github.com';
const OWNER_AUTHORITY_REQUIRED =
  'GitHub organization owner authority is required';

type InstallationRest = {
  id?: number | string;
  app_id?: number | string;
  target_type?: string;
  account?: { id?: number | string; login?: string };
  suspended_at?: string | null;
  permissions?: Record<string, string>;
};
type UserInstallation = { id?: number | string };
type Membership = {
  state?: string;
  role?: string;
  organization?: { id?: number | string; login?: string };
};

export interface VerifiedInstallationIssue {
  associationId: string;
  authorizationVersion: number;
  organizationLogin: string;
  repository: GitHubRepository;
  issue: GitHubIssue;
}

export interface InstallationContext {
  associationId: string;
  authorizationVersion: number;
  organizationLogin: string;
  repository: Pick<GitHubRepository, 'id' | 'name' | 'owner'>;
  issue: Pick<GitHubIssue, 'id' | 'number'>;
}

@Injectable()
export class GithubInstallationsService {
  private readonly logger = new Logger(GithubInstallationsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly config: ConfigService<Env, true>,
    private readonly connections: GithubConnectionsService,
    private readonly tokenProvider: GithubInstallationTokenProviderService,
    private readonly api: GithubApiClientService,
  ) {}

  async list(workspaceId: string): Promise<WorkspaceGitHubInstallationList> {
    const rows = await this.db
      .select(workspaceGitHubInstallationRowSelection)
      .from(workspaceGitHubInstallations)
      .where(eq(workspaceGitHubInstallations.workspaceId, workspaceId));
    return { items: rows.map((row) => this.toResponse(row)) };
  }

  async setup(
    user: AuthUser,
    input: GitHubInstallationSetupRequest,
  ): Promise<GitHubInstallationSetupResponse> {
    await this.requireAdmin(user);
    const organization = await this.allowedOrganization(
      user.workspaceId,
      input.organizationLogin,
    );
    const organizationId = await this.resolveSetupOrganizationId(
      user,
      organization.organizationLogin,
    );
    const appSlug = this.config.get('GITHUB_APP_SLUG', { infer: true });
    if (!appSlug)
      throw new ServiceUnavailableException(
        'GitHub App integration is not configured',
      );
    const existingInstallationId =
      await this.findExistingInstallationForOrganization(
        organization.organizationLogin,
        organizationId,
      );
    const state = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SETUP_TTL_MS);
    await this.db.insert(githubInstallationSetupStates).values({
      state,
      userId: user.sub,
      workspaceId: user.workspaceId,
      organizationId,
      organizationLogin: organization.organizationLogin,
      expiresAt,
    });
    return {
      state,
      installationUrl: `https://github.com/apps/${encodeURIComponent(appSlug)}/installations/new?state=${encodeURIComponent(state)}`,
      expiresAt: expiresAt.toISOString(),
      ...(existingInstallationId ? { existingInstallationId } : {}),
    };
  }

  async complete(
    user: AuthUser,
    input: GitHubInstallationCompleteRequest,
  ): Promise<WorkspaceGitHubInstallation> {
    await this.requireAdmin(user);
    const [state] = await this.db
      .update(githubInstallationSetupStates)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(githubInstallationSetupStates.state, input.state),
          eq(githubInstallationSetupStates.userId, user.sub),
          eq(githubInstallationSetupStates.workspaceId, user.workspaceId),
          isNull(githubInstallationSetupStates.consumedAt),
          gt(githubInstallationSetupStates.expiresAt, new Date()),
        ),
      )
      .returning();
    if (!state)
      throw new BadRequestException(
        'GitHub installation setup has expired or was already used',
      );
    // Membership can change after state issuance.
    await this.requireAdmin(user);
    const verified = await this.verifySetupAuthority(
      user,
      state.organizationId,
      state.organizationLogin,
      input.installationId,
    );
    return this.saveVerifiedWithCurrentAuthority(user, verified);
  }

  async reverify(
    user: AuthUser,
    associationId: string,
  ): Promise<WorkspaceGitHubInstallation> {
    await this.requireAdmin(user);
    const row = await this.findAssociation(user.workspaceId, associationId);
    const verified = await this.verifySetupAuthority(
      user,
      row.organizationId,
      row.organizationLogin,
      row.installationId,
    );
    return this.saveVerifiedWithCurrentAuthority(user, verified);
  }

  async disconnect(user: AuthUser, associationId: string): Promise<void> {
    await this.requireAdmin(user);
    const [row] = await this.db
      .update(workspaceGitHubInstallations)
      .set({
        status: 'disconnected',
        disconnectedAt: new Date(),
        recoveryReason: 'Disconnected by workspace administrator',
        authorizationVersion: sql`${workspaceGitHubInstallations.authorizationVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workspaceGitHubInstallations.id, associationId),
          eq(workspaceGitHubInstallations.workspaceId, user.workspaceId),
        ),
      )
      .returning();
    if (row) this.tokenProvider.invalidate(row.installationId);
  }

  async prepareIssue(
    user: AuthUser,
    owner: string,
    repo: string,
    issueNumber: number,
  ): Promise<VerifiedInstallationIssue> {
    try {
      const association = await this.activeAssociationForOwner(
        user.workspaceId,
        owner,
      );
      await this.assertLiveInstallation(association);
      const result = await this.withInstallationTokenRetry(
        association,
        [repo],
        { issues: 'read', metadata: 'read' },
        async (token) => {
          await this.assertLiveOrganization(token, association);
          const repository = await this.api.getRepository({
            accessToken: token,
            owner,
            repo,
            installationAuth: true,
          });
          const issue = await this.api.getRepositoryIssue({
            accessToken: token,
            owner,
            repo,
            issueNumber,
            installationAuth: true,
          });
          return { repository, issue };
        },
      );
      if (
        normalizeGitHubLogin(result.repository.owner) !==
        normalizeGitHubLogin(association.organizationLogin)
      )
        throw this.error('github_resource_unavailable');
      return {
        associationId: association.id,
        authorizationVersion: association.authorizationVersion,
        organizationLogin: association.organizationLogin,
        ...result,
      };
    } catch (error) {
      this.throwResourceError(error);
    }
  }

  async verifyBoard(
    context: InstallationContext,
    githubProjectId: string,
  ): Promise<boolean> {
    const association = await this.findAssociationById(context.associationId);
    if (
      !association ||
      association.status !== 'verified' ||
      association.authorizationVersion !== context.authorizationVersion
    )
      return false;
    try {
      return await this.withInstallationTokenRetry(
        association,
        [context.repository.name],
        {
          issues: 'read',
          metadata: 'read',
          organization_projects: 'read',
        },
        async (token) => {
          const project = await this.api.getProject({
            accessToken: token,
            projectId: githubProjectId,
            installationAuth: true,
          });
          if (
            !project.found ||
            project.owner.type !== 'organization' ||
            normalizeGitHubLogin(project.owner.login ?? '') !==
              normalizeGitHubLogin(association.organizationLogin)
          )
            return false;
          let pageToken: string | undefined;
          do {
            const page = await this.api.listProjectIssues({
              accessToken: token,
              projectId: githubProjectId,
              state: 'all',
              limit: 100,
              pageToken,
              installationAuth: true,
            });
            if (
              page.items.some(
                (item) =>
                  item.issue.id === context.issue.id &&
                  item.issue.repository.fullName ===
                    `${context.repository.owner}/${context.repository.name}`,
              )
            )
              return true;
            pageToken = page.pagination.nextPageToken ?? undefined;
          } while (pageToken);
          return false;
        },
      );
    } catch (error) {
      // A board mapping is only a candidate. A deleted or inaccessible board
      // cannot establish a mapping, but must not prevent another candidate
      // from being verified with the same installation.
      if (error instanceof NotFoundException) return false;
      this.throwResourceError(error);
    }
  }

  async assertCurrent(
    tx: DrizzleDB,
    user: AuthUser,
    context: InstallationContext,
  ): Promise<void> {
    // The caller locks membership first. Keep the remaining lock order aligned
    // with setup/reverification: membership, policy, then installation.
    const [policy] = await tx
      .select({ id: workspaceGitHubOrganizations.id })
      .from(workspaceGitHubOrganizations)
      .where(
        and(
          eq(workspaceGitHubOrganizations.workspaceId, user.workspaceId),
          eq(
            workspaceGitHubOrganizations.normalizedLogin,
            normalizeGitHubLogin(context.organizationLogin),
          ),
        ),
      )
      .for('update');
    if (!policy) throw this.error('github_organization_not_allowed');
    const [association] = await tx
      .select(workspaceGitHubInstallationRowSelection)
      .from(workspaceGitHubInstallations)
      .where(
        and(
          eq(workspaceGitHubInstallations.id, context.associationId),
          eq(workspaceGitHubInstallations.workspaceId, user.workspaceId),
        ),
      )
      .for('update');
    if (!association) throw this.error('github_installation_required');
    if (
      association.status !== 'verified' ||
      association.authorizationVersion !== context.authorizationVersion
    )
      throw this.error('github_installation_unavailable');
  }

  async handleWebhook(
    headers: { signature?: string; deliveryId?: string; event?: string },
    rawBody: Buffer,
  ): Promise<void> {
    if (!this.validSignature(headers.signature, rawBody))
      throw new ForbiddenException('Invalid GitHub webhook signature');
    if (!headers.deliveryId || !headers.event)
      throw new BadRequestException('Invalid GitHub webhook delivery');
    let payload: {
      installation?: { id?: number | string; suspended_at?: string | null };
      action?: string;
    };
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as typeof payload;
    } catch {
      throw new BadRequestException('Invalid GitHub webhook payload');
    }
    const installationId = payload.installation?.id?.toString();
    if (!installationId) return;
    const action = payload.action ?? '';
    const isInstallationLifecycle =
      headers.event === 'installation' &&
      ['suspend', 'deleted', 'new_permissions_accepted'].includes(action);
    const isRepositorySelection = headers.event === 'installation_repositories';
    if (!isInstallationLifecycle && !isRepositorySelection) return;
    // GitHub can redeliver delayed lifecycle events. Reconcile with the App's
    // current installation snapshot before changing an association so a stale
    // suspension cannot undo a completed re-verification.
    const isInstallationActive =
      isInstallationLifecycle &&
      (await this.isInstallationCurrentlyActive(installationId));
    const requiresReverification =
      isInstallationLifecycle && !isInstallationActive;
    const invalidate = await this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(githubInstallationWebhookDeliveries)
        .values({ deliveryId: headers.deliveryId!, event: headers.event! })
        .onConflictDoNothing()
        .returning();
      if (!inserted[0]) return false;
      if (
        isRepositorySelection ||
        (action === 'new_permissions_accepted' && isInstallationActive)
      ) {
        // Repository selection and permission updates can revoke cached
        // repository-scoped credentials. Keep the lifecycle status unchanged,
        // including a prior disconnect, while making every in-flight context stale.
        await tx
          .update(workspaceGitHubInstallations)
          .set({
            authorizationVersion: sql`${workspaceGitHubInstallations.authorizationVersion} + 1`,
            updatedAt: new Date(),
          })
          .where(
            eq(workspaceGitHubInstallations.installationId, installationId),
          );
        return true;
      }
      if (!requiresReverification) return false;
      await tx
        .update(workspaceGitHubInstallations)
        .set({
          status: 'suspended',
          recoveryReason: 'GitHub installation requires re-verification',
          authorizationVersion: sql`${workspaceGitHubInstallations.authorizationVersion} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(workspaceGitHubInstallations.installationId, installationId),
            eq(workspaceGitHubInstallations.status, 'verified'),
          ),
        );
      return true;
    });
    if (invalidate) this.tokenProvider.invalidate(installationId);
  }

  private async verifySetupAuthority(
    user: AuthUser,
    organizationId: string,
    organizationLogin: string,
    installationId: string,
  ): Promise<
    Pick<
      WorkspaceGithubInstallationRow,
      | 'workspaceId'
      | 'organizationId'
      | 'organizationLogin'
      | 'normalizedOrganizationLogin'
      | 'installationId'
      | 'appId'
    >
  > {
    let userToken: string;
    try {
      userToken = await this.connections.getValidAccessToken(user.sub);
    } catch {
      throw new ConflictException(
        'Connect GitHub to verify installation ownership',
      );
    }
    const [accessible, membership, installation] = await Promise.all([
      this.userCanAccessInstallation(userToken, installationId),
      this.fetchOrganizationMembership(organizationLogin, userToken),
      this.fetchGitHub<InstallationRest>(
        `/app/installations/${encodeURIComponent(installationId)}`,
        await this.tokenProvider.appToken(),
      ),
    ]);
    if (!accessible) {
      throw new ConflictException(
        'Reconnect GitHub, then retry installation verification',
      );
    }
    const resolvedOrganizationId = this.assertOwnerMembership(
      membership,
      organizationLogin,
      organizationId,
    );
    if (
      String(installation.id) !== installationId ||
      String(installation.app_id) !== this.requireAppId() ||
      installation.target_type !== 'Organization' ||
      installation.suspended_at
    )
      throw new BadRequestException('GitHub installation cannot be verified');
    if (String(installation.account?.id) !== resolvedOrganizationId)
      throw new ForbiddenException(OWNER_AUTHORITY_REQUIRED);
    if (
      !this.hasReadPermission(installation.permissions?.issues) ||
      !this.hasReadPermission(installation.permissions?.members)
    ) {
      throw new ForbiddenException(
        'GitHub installation requires Issues and Members read permissions',
      );
    }
    // A restricted token request proves the App can mint a credential before we replace a working association.
    try {
      await this.tokenProvider.getToken({
        installationId,
        authorizationVersion: 0,
        permissions: { issues: 'read', metadata: 'read', members: 'read' },
      });
    } catch (error) {
      if (error instanceof GithubInstallationTokenPermissionError) {
        throw new ForbiddenException(
          'GitHub installation requires the requested read permissions',
        );
      }
      throw error;
    }
    return {
      workspaceId: user.workspaceId,
      organizationId: resolvedOrganizationId,
      organizationLogin: installation.account?.login ?? organizationLogin,
      normalizedOrganizationLogin: normalizeGitHubLogin(
        installation.account?.login ?? organizationLogin,
      ),
      installationId,
      appId: this.requireAppId(),
    };
  }

  private async saveVerifiedWithCurrentAuthority(
    user: AuthUser,
    verified: Pick<
      WorkspaceGithubInstallationRow,
      | 'workspaceId'
      | 'organizationId'
      | 'organizationLogin'
      | 'normalizedOrganizationLogin'
      | 'installationId'
      | 'appId'
    >,
  ): Promise<WorkspaceGitHubInstallation> {
    return this.db.transaction(async (tx) => {
      const [membership] = await tx
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, user.workspaceId),
            eq(workspaceMembers.userId, user.sub),
            eq(workspaceMembers.role, 'admin'),
          ),
        )
        .for('update');
      const [policy] = await tx
        .select({ id: workspaceGitHubOrganizations.id })
        .from(workspaceGitHubOrganizations)
        .where(
          and(
            eq(workspaceGitHubOrganizations.workspaceId, user.workspaceId),
            eq(
              workspaceGitHubOrganizations.normalizedLogin,
              verified.normalizedOrganizationLogin,
            ),
          ),
        )
        .for('update');
      if (!membership) throw new ForbiddenException('Admin role required');
      if (!policy) throw this.error('github_organization_not_allowed');
      return this.saveVerified(user, verified, tx);
    });
  }

  private async withInstallationTokenRetry<T>(
    association: WorkspaceGithubInstallationRow,
    repositories: string[],
    permissions: Parameters<
      GithubInstallationTokenProviderService['getToken']
    >[0]['permissions'],
    operation: (token: string) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const token = await this.tokenFor(association, repositories, permissions);
      try {
        return await operation(token);
      } catch (error) {
        if (
          error instanceof GithubInstallationAuthenticationError &&
          attempt === 0
        ) {
          this.tokenProvider.invalidate(association.installationId);
          continue;
        }
        throw error;
      }
    }
    throw this.error('github_installation_unavailable');
  }

  private throwResourceError(error: unknown): never {
    if (error instanceof DomainError) throw error;
    if (error instanceof NotFoundException)
      throw this.error('github_resource_unavailable');
    if (
      error instanceof GithubInstallationPermissionError ||
      error instanceof GithubInstallationTokenPermissionError
    )
      throw this.error('github_installation_permissions_required');
    if (error instanceof ServiceUnavailableException)
      throw this.error('github_provider_unavailable');
    throw this.error('github_installation_unavailable');
  }

  private async saveVerified(
    user: AuthUser,
    verified: Pick<
      WorkspaceGithubInstallationRow,
      | 'workspaceId'
      | 'organizationId'
      | 'organizationLogin'
      | 'normalizedOrganizationLogin'
      | 'installationId'
      | 'appId'
    >,
    executor: Pick<DrizzleDB, 'insert' | 'select'> = this.db,
  ): Promise<WorkspaceGitHubInstallation> {
    const [previous] = await executor
      .select({ installationId: workspaceGitHubInstallations.installationId })
      .from(workspaceGitHubInstallations)
      .where(
        and(
          eq(workspaceGitHubInstallations.workspaceId, verified.workspaceId),
          eq(
            workspaceGitHubInstallations.organizationId,
            verified.organizationId,
          ),
        ),
      )
      .limit(1);
    const now = new Date();
    const [row] = await executor
      .insert(workspaceGitHubInstallations)
      .values({
        ...verified,
        status: 'verified',
        verifiedAt: now,
        verifiedByUserId: user.sub,
        recoveryReason: null,
      })
      .onConflictDoUpdate({
        target: [
          workspaceGitHubInstallations.workspaceId,
          workspaceGitHubInstallations.organizationId,
        ],
        set: {
          organizationLogin: verified.organizationLogin,
          normalizedOrganizationLogin: verified.normalizedOrganizationLogin,
          installationId: verified.installationId,
          appId: verified.appId,
          status: 'verified',
          verifiedAt: now,
          verifiedByUserId: user.sub,
          disconnectedAt: null,
          recoveryReason: null,
          authorizationVersion: sql`${workspaceGitHubInstallations.authorizationVersion} + 1`,
          updatedAt: now,
        },
      })
      .returning();
    if (!row)
      throw new ServiceUnavailableException(
        'GitHub installation could not be saved',
      );
    if (previous && previous.installationId !== row.installationId) {
      this.tokenProvider.invalidate(previous.installationId);
    }
    this.tokenProvider.invalidate(row.installationId);
    return this.toResponse(row);
  }

  private async allowedOrganization(
    workspaceId: string,
    login: string,
  ): Promise<{ organizationLogin: string }> {
    const [row] = await this.db
      .select({
        id: workspaceGitHubOrganizations.id,
        organizationLogin: workspaceGitHubOrganizations.organizationLogin,
        normalizedLogin: workspaceGitHubOrganizations.normalizedLogin,
      })
      .from(workspaceGitHubOrganizations)
      .where(
        and(
          eq(workspaceGitHubOrganizations.workspaceId, workspaceId),
          eq(
            workspaceGitHubOrganizations.normalizedLogin,
            normalizeGitHubLogin(login),
          ),
        ),
      )
      .limit(1);
    if (!row)
      throw new DomainError(
        'github_organization_not_allowed',
        'GitHub organization is not allowed',
        403,
      );
    return { organizationLogin: row.organizationLogin };
  }

  private async findExistingInstallationForOrganization(
    organizationLogin: string,
    organizationId: string,
  ): Promise<string | undefined> {
    const response = await this.githubFetch(
      `/orgs/${encodeURIComponent(organizationLogin)}/installation`,
      await this.tokenProvider.appToken(),
    );
    // Absence is the only expected fallback: GitHub must be reachable to
    // determine whether the configured App can be reused safely.
    if (response.status === 404) return undefined;
    if (!response.ok) {
      this.logger.warn({
        event: 'github.installation.existing_lookup_failed',
        status: response.status,
      });
      throw new ServiceUnavailableException(
        'GitHub installation discovery is unavailable',
      );
    }
    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      throw new ServiceUnavailableException(
        'GitHub installation discovery is unavailable',
      );
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new ServiceUnavailableException(
        'GitHub installation discovery is unavailable',
      );
    }
    const installation = parsed as InstallationRest;
    const installationId = String(installation.id ?? '');
    if (
      !/^[1-9]\d{0,29}$/.test(installationId) ||
      String(installation.app_id) !== this.requireAppId() ||
      installation.target_type !== 'Organization' ||
      String(installation.account?.id) !== organizationId
    ) {
      throw new ServiceUnavailableException(
        'GitHub installation discovery is unavailable',
      );
    }
    return installationId;
  }

  private async resolveSetupOrganizationId(
    user: AuthUser,
    organizationLogin: string,
  ): Promise<string> {
    let token: string;
    try {
      token = await this.connections.getValidAccessToken(user.sub);
    } catch {
      throw new ConflictException(
        'Connect GitHub to verify installation ownership',
      );
    }
    const membership = await this.fetchOrganizationMembership(
      organizationLogin,
      token,
    );
    return this.assertOwnerMembership(membership, organizationLogin);
  }

  private assertOwnerMembership(
    membership: Membership | null,
    organizationLogin: string,
    expectedOrganizationId?: string,
  ): string {
    const organizationId = String(membership?.organization?.id ?? '');
    if (
      membership?.state !== 'active' ||
      membership?.role !== 'admin' ||
      !organizationId ||
      (expectedOrganizationId !== undefined &&
        organizationId !== expectedOrganizationId) ||
      normalizeGitHubLogin(membership.organization?.login ?? '') !==
        normalizeGitHubLogin(organizationLogin)
    ) {
      throw new ForbiddenException(OWNER_AUTHORITY_REQUIRED);
    }
    return organizationId;
  }

  private async fetchOrganizationMembership(
    organizationLogin: string,
    token: string,
  ): Promise<Membership | null> {
    const path = `/user/memberships/orgs/${encodeURIComponent(organizationLogin)}`;
    const response = await this.githubFetch(path, token);
    if (response.status === 404) return null;
    if (!response.ok) {
      this.logger.warn({
        event: 'github.installation.verify_failed',
        status: response.status,
        path,
      });
      throw new ServiceUnavailableException(
        'GitHub installation verification is unavailable',
      );
    }
    return response.json() as Promise<Membership>;
  }

  private async userCanAccessInstallation(
    token: string,
    installationId: string,
  ): Promise<boolean> {
    let page = 1;
    while (true) {
      const response = await this.githubFetch(
        `/user/installations?per_page=100&page=${page}`,
        token,
      );
      if (!response.ok)
        throw new ServiceUnavailableException(
          'GitHub installation verification is unavailable',
        );
      const body = (await response.json()) as {
        installations?: UserInstallation[];
      };
      if (
        (body.installations ?? []).some(
          (item) => String(item.id) === installationId,
        )
      )
        return true;
      if (!response.headers.get('link')?.includes('rel="next"')) return false;
      page += 1;
    }
  }

  private async activeAssociationForOwner(
    workspaceId: string,
    owner: string,
  ): Promise<WorkspaceGithubInstallationRow> {
    const normalized = normalizeGitHubLogin(owner);
    const [policy] = await this.db
      .select({ id: workspaceGitHubOrganizations.id })
      .from(workspaceGitHubOrganizations)
      .where(
        and(
          eq(workspaceGitHubOrganizations.workspaceId, workspaceId),
          eq(workspaceGitHubOrganizations.normalizedLogin, normalized),
        ),
      )
      .limit(1);
    if (!policy) throw this.error('github_organization_not_allowed');
    const [row] = await this.db
      .select(workspaceGitHubInstallationRowSelection)
      .from(workspaceGitHubInstallations)
      .where(
        and(
          eq(workspaceGitHubInstallations.workspaceId, workspaceId),
          eq(
            workspaceGitHubInstallations.normalizedOrganizationLogin,
            normalized,
          ),
        ),
      )
      .limit(1);
    if (!row) throw this.error('github_installation_required');
    if (row.status !== 'verified')
      throw this.error('github_installation_unavailable');
    return row;
  }

  private async tokenFor(
    row: WorkspaceGithubInstallationRow,
    repositories?: string[],
    permissions?: Parameters<
      GithubInstallationTokenProviderService['getToken']
    >[0]['permissions'],
  ): Promise<string> {
    return this.tokenProvider.getToken({
      installationId: row.installationId,
      authorizationVersion: row.authorizationVersion,
      repositories,
      permissions,
    });
  }
  private async assertLiveOrganization(
    token: string,
    association: WorkspaceGithubInstallationRow,
  ): Promise<void> {
    const organization = await this.fetchGitHub<{
      id?: number | string;
      login?: string;
    }>(`/orgs/${encodeURIComponent(association.organizationLogin)}`, token);
    if (
      String(organization.id) !== association.organizationId ||
      normalizeGitHubLogin(organization.login ?? '') !==
        association.normalizedOrganizationLogin
    ) {
      throw this.error('github_resource_unavailable');
    }
  }
  private async isInstallationCurrentlyActive(
    installationId: string,
  ): Promise<boolean> {
    try {
      const installation = await this.fetchGitHub<InstallationRest>(
        `/app/installations/${encodeURIComponent(installationId)}`,
        await this.tokenProvider.appToken(),
      );
      return (
        String(installation.id) === installationId &&
        String(installation.app_id) === this.requireAppId() &&
        installation.target_type === 'Organization' &&
        !installation.suspended_at &&
        this.hasReadPermission(installation.permissions?.issues) &&
        this.hasReadPermission(installation.permissions?.members)
      );
    } catch {
      // A failed reconciliation must not leave a possibly revoked credential
      // usable; the lifecycle event therefore fails closed.
      return false;
    }
  }

  private async assertLiveInstallation(
    association: WorkspaceGithubInstallationRow,
  ): Promise<void> {
    const path = `/app/installations/${encodeURIComponent(association.installationId)}`;
    const response = await this.githubFetch(
      path,
      await this.tokenProvider.appToken(),
    );
    if (response.status === 404) {
      await this.markInstallationUnavailable(association);
      throw this.error('github_installation_unavailable');
    }
    if (!response.ok) {
      this.logger.warn({
        event: 'github.installation.verify_failed',
        status: response.status,
        path,
      });
      throw new ServiceUnavailableException(
        'GitHub installation verification is unavailable',
      );
    }
    const installation = (await response.json()) as InstallationRest;
    if (
      String(installation.id) !== association.installationId ||
      String(installation.app_id) !== association.appId ||
      installation.target_type !== 'Organization' ||
      String(installation.account?.id) !== association.organizationId ||
      installation.suspended_at
    ) {
      throw this.error('github_installation_unavailable');
    }
  }
  private async markInstallationUnavailable(
    association: WorkspaceGithubInstallationRow,
  ): Promise<void> {
    await this.db
      .update(workspaceGitHubInstallations)
      .set({
        status: 'unavailable',
        recoveryReason: 'GitHub App installation is no longer available',
        authorizationVersion: sql`${workspaceGitHubInstallations.authorizationVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workspaceGitHubInstallations.id, association.id),
          eq(workspaceGitHubInstallations.status, 'verified'),
        ),
      );
    this.tokenProvider.invalidate(association.installationId);
  }
  private async findAssociation(
    workspaceId: string,
    associationId: string,
  ): Promise<WorkspaceGithubInstallationRow> {
    const row = await this.findAssociationById(associationId);
    if (!row || row.workspaceId !== workspaceId)
      throw new NotFoundException('GitHub installation not found');
    return row;
  }
  private async findAssociationById(
    id: string,
  ): Promise<WorkspaceGithubInstallationRow | null> {
    const [row] = await this.db
      .select(workspaceGitHubInstallationRowSelection)
      .from(workspaceGitHubInstallations)
      .where(eq(workspaceGitHubInstallations.id, id))
      .limit(1);
    return row ?? null;
  }
  private async requireAdmin(user: AuthUser): Promise<void> {
    const [membership] = await this.db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, user.workspaceId),
          eq(workspaceMembers.userId, user.sub),
          eq(workspaceMembers.role, 'admin'),
        ),
      )
      .limit(1);
    if (!membership) throw new ForbiddenException('Admin role required');
  }
  private requireAppId(): string {
    const id = this.config.get('GITHUB_APP_ID', { infer: true });
    if (!id)
      throw new ServiceUnavailableException(
        'GitHub App integration is not configured',
      );
    return id;
  }
  private async fetchGitHub<T>(path: string, token: string): Promise<T> {
    const response = await this.githubFetch(path, token);
    if (!response.ok) {
      this.logger.warn({
        event: 'github.installation.verify_failed',
        status: response.status,
        path,
      });
      throw new ServiceUnavailableException(
        'GitHub installation verification is unavailable',
      );
    }
    return response.json() as Promise<T>;
  }
  private async githubFetch(path: string, token: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      return await fetch(`${API_URL}${path}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'gitiempo-api',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: controller.signal,
      });
    } catch {
      throw new ServiceUnavailableException(
        'GitHub installation verification is unavailable',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private validSignature(signature: string | undefined, body: Buffer): boolean {
    const secret = this.config.get('GITHUB_APP_WEBHOOK_SECRET', {
      infer: true,
    });
    if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature))
      return false;
    const expected = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
    return (
      expected.length === signature.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    );
  }
  private hasReadPermission(value: string | undefined): boolean {
    return value === 'read' || value === 'write';
  }
  private toResponse(
    row: WorkspaceGithubInstallationRow,
  ): WorkspaceGitHubInstallation {
    return {
      id: row.id,
      organizationId: row.organizationId,
      organizationLogin: row.organizationLogin,
      installationId: row.installationId,
      status: row.status,
      verifiedAt: row.verifiedAt?.toISOString() ?? null,
      recoveryReason: row.recoveryReason,
    };
  }
  private error(code: GitHubTrackingErrorCode): DomainError {
    return new DomainError(
      code,
      githubTrackingErrorMessages[code],
      githubTrackingErrorStatuses[code],
    );
  }
}

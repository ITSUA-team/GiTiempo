import {
  BadRequestException,
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import type {
  AddWorkspaceGitHubOrganizationInput,
  WorkspaceGitHubOrganizationRecoveryPayload,
  WorkspaceGitHubOrganizationRecoveryReason,
  WorkspaceGitHubOrganizationListResponse,
  WorkspaceGitHubOrganizationResponse,
} from '@gitiempo/shared';
import type { AuthUser } from '../../auth/types/auth-user';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import { projectExternalRefs } from '../../projects/schemas/project-external-refs.schema';
import { taskExternalRefs } from '../../tasks/schemas/task-external-refs.schema';
import {
  normalizeGitHubIssueExternalKey,
  normalizeGitHubLogin,
  normalizeGitHubRepoKey,
  rewriteGitHubIssueOwner,
  rewriteGitHubRepoOwner,
} from '../github-repo-key';
import { workspaceGitHubOrganizations } from '../schemas/workspace-github-organizations.schema';
import { GithubApiClientService } from './github-api-client.service';
import { GithubConnectionsService } from './github-connections.service';

type WorkspaceGitHubOrganizationRow =
  typeof workspaceGitHubOrganizations.$inferSelect;
type QueryExecutor = Pick<DrizzleDB, 'select' | 'insert'>;
type ProjectExternalRefRow = typeof projectExternalRefs.$inferSelect;
type TaskExternalRefRow = typeof taskExternalRefs.$inferSelect;

function buildRecoveryPayload(
  organizationLogin: string,
  reason: WorkspaceGitHubOrganizationRecoveryReason,
): WorkspaceGitHubOrganizationRecoveryPayload {
  switch (reason) {
    case 'workspace_github_organization_connection_required':
      return {
        organizationLogin,
        reason,
        steps: [
          { id: 'install', status: 'unknown' },
          { id: 'approve', status: 'action_required' },
          { id: 'reconnect', status: 'disconnected' },
          { id: 'retry', status: 'blocked' },
        ],
      };
    case 'workspace_github_organization_app_access_blocked':
      return {
        organizationLogin,
        reason,
        steps: [
          { id: 'install', status: 'complete' },
          { id: 'approve', status: 'blocked' },
          { id: 'reconnect', status: 'action_required' },
          { id: 'retry', status: 'blocked' },
        ],
      };
    case 'workspace_github_organization_provider_retryable':
      return {
        organizationLogin,
        reason,
        steps: [
          { id: 'install', status: 'unknown' },
          { id: 'approve', status: 'action_required' },
          { id: 'reconnect', status: 'complete' },
          { id: 'retry', status: 'ready' },
        ],
      };
    case 'workspace_github_organization_not_visible':
    default:
      return {
        organizationLogin,
        reason,
        steps: [
          { id: 'install', status: 'action_required' },
          { id: 'approve', status: 'action_required' },
          { id: 'reconnect', status: 'complete' },
          { id: 'retry', status: 'blocked' },
        ],
      };
  }
}

function createGitHubOrganizationBadRequest(
  code: WorkspaceGitHubOrganizationRecoveryReason,
  message: string,
  organizationLogin: string,
): BadRequestException {
  return new BadRequestException({
    code,
    error: 'BadRequest',
    message,
    recovery: buildRecoveryPayload(organizationLogin, code),
  });
}

function createGitHubOrganizationRetryableFailure(
  organizationLogin: string,
  message = 'GitHub organization validation is temporarily unavailable. Try again.',
): ServiceUnavailableException {
  const code = 'workspace_github_organization_provider_retryable';

  return new ServiceUnavailableException({
    code,
    error: 'ServiceUnavailable',
    message,
    recovery: buildRecoveryPayload(organizationLogin, code),
  });
}

function getExceptionCode(error: unknown): string | null {
  if (!(error instanceof HttpException)) {
    return null;
  }

  const response = error.getResponse();
  if (
    typeof response === 'object' &&
    response !== null &&
    'code' in response &&
    typeof response.code === 'string'
  ) {
    return response.code;
  }

  return null;
}

@Injectable()
export class WorkspaceGitHubOrganizationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly connections: GithubConnectionsService,
    private readonly apiClient: GithubApiClientService,
  ) {}

  async list(
    workspaceId: string,
  ): Promise<WorkspaceGitHubOrganizationListResponse> {
    const rows = await this.db
      .select()
      .from(workspaceGitHubOrganizations)
      .where(eq(workspaceGitHubOrganizations.workspaceId, workspaceId))
      .orderBy(asc(workspaceGitHubOrganizations.organizationLogin));

    return {
      items: rows.map((row) => this.toResponse(row)),
    };
  }

  async add(
    user: AuthUser,
    input: AddWorkspaceGitHubOrganizationInput,
  ): Promise<WorkspaceGitHubOrganizationResponse> {
    const normalizedLogin = normalizeGitHubLogin(input.organizationLogin);
    const existing = await this.findByNormalizedLogin(
      user.workspaceId,
      normalizedLogin,
    );

    if (existing) {
      return this.toResponse(existing);
    }

    const organizationLogin = await this.validateVisibleOrganization(
      user,
      input,
    );

    const row = await this.db.transaction(async (tx) => {
      const [createdRow] = await tx
        .insert(workspaceGitHubOrganizations)
        .values({
          workspaceId: user.workspaceId,
          organizationLogin,
          normalizedLogin,
          createdByUserId: user.sub,
        })
        .returning();

      if (!createdRow) {
        throw new BadRequestException(
          'GitHub organization could not be saved for this workspace',
        );
      }

      await this.reconcileExistingGitHubRefs(
        tx,
        user.workspaceId,
        organizationLogin,
      );

      return createdRow;
    });

    return this.toResponse(row);
  }

  async remove(workspaceId: string, organizationId: string): Promise<void> {
    await this.db
      .delete(workspaceGitHubOrganizations)
      .where(
        and(
          eq(workspaceGitHubOrganizations.workspaceId, workspaceId),
          eq(workspaceGitHubOrganizations.id, organizationId),
        ),
      );
  }

  async listAllowedOrganizationLogins(workspaceId: string): Promise<string[]> {
    const rows = await this.db
      .select({
        organizationLogin: workspaceGitHubOrganizations.organizationLogin,
      })
      .from(workspaceGitHubOrganizations)
      .where(eq(workspaceGitHubOrganizations.workspaceId, workspaceId))
      .orderBy(asc(workspaceGitHubOrganizations.organizationLogin));

    return rows.map((row) => row.organizationLogin);
  }

  async isOrganizationAllowed(
    workspaceId: string,
    organizationLogin: string,
  ): Promise<boolean> {
    const row = await this.findByNormalizedLogin(
      workspaceId,
      normalizeGitHubLogin(organizationLogin),
    );
    return row !== undefined;
  }

  async assertOrganizationAllowed(
    workspaceId: string,
    organizationLogin: string,
  ): Promise<void> {
    const allowed = await this.isOrganizationAllowed(
      workspaceId,
      organizationLogin,
    );
    if (!allowed) {
      throw new NotFoundException(
        'GitHub organization is not allowed in this workspace',
      );
    }
  }

  private async findByNormalizedLogin(
    workspaceId: string,
    normalizedLogin: string,
  ): Promise<WorkspaceGitHubOrganizationRow | undefined> {
    const [row] = await this.db
      .select()
      .from(workspaceGitHubOrganizations)
      .where(
        and(
          eq(workspaceGitHubOrganizations.workspaceId, workspaceId),
          eq(workspaceGitHubOrganizations.normalizedLogin, normalizedLogin),
        ),
      )
      .limit(1);

    return row;
  }

  private async reconcileExistingGitHubRefs(
    db: QueryExecutor,
    workspaceId: string,
    organizationLogin: string,
  ): Promise<void> {
    await this.reconcileProjectRefs(db, workspaceId, organizationLogin);
    await this.reconcileTaskRefs(db, workspaceId, organizationLogin);
  }

  private async reconcileProjectRefs(
    db: QueryExecutor,
    workspaceId: string,
    organizationLogin: string,
  ): Promise<void> {
    const rows = await db
      .select()
      .from(projectExternalRefs)
      .where(
        and(
          eq(projectExternalRefs.workspaceId, workspaceId),
          eq(projectExternalRefs.provider, 'github'),
          eq(projectExternalRefs.externalType, 'repository'),
          sql`lower(split_part(${projectExternalRefs.externalKey}, '/', 1)) = ${normalizeGitHubLogin(organizationLogin)}`,
        ),
      );

    const existingKeys = new Map(
      rows.map((row) => [row.externalKey, row.projectId] as const),
    );
    const normalizedTargets = new Map<string, string>();
    const inserts: Array<typeof projectExternalRefs.$inferInsert> = [];

    for (const row of rows) {
      const normalizedKey = normalizeGitHubRepoKey(row.externalKey);
      if (!normalizedKey) {
        continue;
      }

      const currentProjectId = normalizedTargets.get(normalizedKey);
      if (currentProjectId && currentProjectId !== row.projectId) {
        throw new ConflictException(
          'Existing GitHub repository mappings for this organization are inconsistent',
        );
      }
      normalizedTargets.set(normalizedKey, row.projectId);

      const canonicalKey = rewriteGitHubRepoOwner(
        row.externalKey,
        organizationLogin,
      );
      if (!canonicalKey) {
        continue;
      }

      const existingProjectId = existingKeys.get(canonicalKey);
      if (existingProjectId) {
        if (existingProjectId !== row.projectId) {
          throw new ConflictException(
            'Existing GitHub repository mappings for this organization are inconsistent',
          );
        }
        continue;
      }

      existingKeys.set(canonicalKey, row.projectId);
      inserts.push(this.toProjectRefAlias(row, canonicalKey));
    }

    if (inserts.length > 0) {
      await db.insert(projectExternalRefs).values(inserts);
    }
  }

  private async reconcileTaskRefs(
    db: QueryExecutor,
    workspaceId: string,
    organizationLogin: string,
  ): Promise<void> {
    const rows = await db
      .select()
      .from(taskExternalRefs)
      .where(
        and(
          eq(taskExternalRefs.workspaceId, workspaceId),
          eq(taskExternalRefs.provider, 'github'),
          eq(taskExternalRefs.externalType, 'issue'),
          sql`lower(split_part(split_part(${taskExternalRefs.externalKey}, '#', 1), '/', 1)) = ${normalizeGitHubLogin(organizationLogin)}`,
        ),
      );

    const existingKeys = new Map(
      rows.map((row) => [row.externalKey, row.taskId] as const),
    );
    const normalizedTargets = new Map<string, string>();
    const inserts: Array<typeof taskExternalRefs.$inferInsert> = [];

    for (const row of rows) {
      const normalizedKey = normalizeGitHubIssueExternalKey(row.externalKey);
      if (!normalizedKey) {
        continue;
      }

      const currentTaskId = normalizedTargets.get(normalizedKey);
      if (currentTaskId && currentTaskId !== row.taskId) {
        throw new ConflictException(
          'Existing GitHub issue mappings for this organization are inconsistent',
        );
      }
      normalizedTargets.set(normalizedKey, row.taskId);

      const canonicalKey = rewriteGitHubIssueOwner(
        row.externalKey,
        organizationLogin,
      );
      if (!canonicalKey) {
        continue;
      }

      const existingTaskId = existingKeys.get(canonicalKey);
      if (existingTaskId) {
        if (existingTaskId !== row.taskId) {
          throw new ConflictException(
            'Existing GitHub issue mappings for this organization are inconsistent',
          );
        }
        continue;
      }

      existingKeys.set(canonicalKey, row.taskId);
      inserts.push(this.toTaskRefAlias(row, canonicalKey));
    }

    if (inserts.length > 0) {
      await db.insert(taskExternalRefs).values(inserts);
    }
  }

  private toProjectRefAlias(
    row: ProjectExternalRefRow,
    canonicalKey: string,
  ): typeof projectExternalRefs.$inferInsert {
    return {
      workspaceId: row.workspaceId,
      projectId: row.projectId,
      provider: row.provider,
      externalType: row.externalType,
      externalId: row.externalId,
      externalKey: canonicalKey,
      externalUrl: `https://github.com/${canonicalKey}`,
      metadata: {
        ...row.metadata,
        githubRepo: canonicalKey,
      },
      syncedAt: row.syncedAt,
    };
  }

  private toTaskRefAlias(
    row: TaskExternalRefRow,
    canonicalKey: string,
  ): typeof taskExternalRefs.$inferInsert {
    const separatorIndex = canonicalKey.lastIndexOf('#');
    const githubRepo = canonicalKey.slice(0, separatorIndex);
    const issueNumber = Number(canonicalKey.slice(separatorIndex + 1));

    return {
      workspaceId: row.workspaceId,
      projectId: row.projectId,
      taskId: row.taskId,
      provider: row.provider,
      externalType: row.externalType,
      externalId: row.externalId,
      externalKey: canonicalKey,
      externalUrl: `https://github.com/${githubRepo}/issues/${issueNumber}`,
      metadata: {
        ...row.metadata,
        githubRepo,
        issueNumber,
      },
      syncedAt: row.syncedAt,
    };
  }

  private async validateVisibleOrganization(
    user: AuthUser,
    input: AddWorkspaceGitHubOrganizationInput,
  ): Promise<string> {
    const status = await this.connections.status(user.sub);
    if (status.status !== 'connected') {
      throw createGitHubOrganizationBadRequest(
        'workspace_github_organization_connection_required',
        'Connect GitHub before adding an allowed organization',
        input.organizationLogin,
      );
    }

    const accessToken = await this.connections.getValidAccessToken(user.sub);
    let owners;
    try {
      owners = await this.apiClient.listOwners(
        accessToken,
        {
          login: status.account.login,
          avatarUrl: status.account.avatarUrl,
        },
        'organization',
      );
    } catch (error) {
      throw this.toValidationFailure(error, input.organizationLogin);
    }
    const normalizedLogin = normalizeGitHubLogin(input.organizationLogin);
    const matchedOwner = owners.items.find(
      (owner) => normalizeGitHubLogin(owner.login) === normalizedLogin,
    );

    if (matchedOwner) {
      return matchedOwner.login;
    }

    let membership;
    try {
      membership =
        await this.apiClient.getAuthenticatedUserOrganizationMembership(
          accessToken,
          input.organizationLogin,
        );
    } catch (error) {
      throw this.toValidationFailure(error, input.organizationLogin);
    }
    if (
      membership &&
      membership.state === 'active' &&
      normalizeGitHubLogin(membership.login) === normalizedLogin
    ) {
      return membership.login;
    }

    let memberships;
    try {
      memberships =
        await this.apiClient.listActiveOrganizationMemberships(accessToken);
    } catch (error) {
      throw this.toValidationFailure(error, input.organizationLogin);
    }
    const matchedMembership = memberships.items.find(
      (owner) => normalizeGitHubLogin(owner.login) === normalizedLogin,
    );

    if (!matchedMembership) {
      throw createGitHubOrganizationBadRequest(
        'workspace_github_organization_not_visible',
        'GitHub organization is not visible to your connected account',
        input.organizationLogin,
      );
    }

    return matchedMembership.login;
  }

  private toValidationFailure(
    error: unknown,
    organizationLogin: string,
  ): BadRequestException | ServiceUnavailableException {
    const code = getExceptionCode(error);
    if (code === 'github_app_access_blocked') {
      return createGitHubOrganizationBadRequest(
        'workspace_github_organization_app_access_blocked',
        'GitHub organization blocks this GitHub App',
        organizationLogin,
      );
    }

    if (error instanceof ServiceUnavailableException) {
      return createGitHubOrganizationRetryableFailure(organizationLogin);
    }

    if (error instanceof BadRequestException) {
      return createGitHubOrganizationRetryableFailure(organizationLogin);
    }

    return createGitHubOrganizationRetryableFailure(organizationLogin);
  }

  private toResponse(
    row: WorkspaceGitHubOrganizationRow,
  ): WorkspaceGitHubOrganizationResponse {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      organizationLogin: row.organizationLogin,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

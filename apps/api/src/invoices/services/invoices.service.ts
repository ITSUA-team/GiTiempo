import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type {
  CreateInvoiceInput,
  InvoiceListQuery,
  InvoiceListResponse,
  InvoiceResponse,
  InvoiceStatus,
  UpdateInvoiceInput,
} from '@gitiempo/shared';
import type { AuthUser } from '../../auth/types/auth-user';
import { DomainError } from '../../commons/errors/domain-error';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import { MembersService } from '../../members/services/members.service';
import { projectAssignments } from '../../projects/schemas/project-assignments.schema';
import { projects } from '../../projects/schemas/projects.schema';
import { tasks } from '../../tasks/schemas/tasks.schema';
import { timeEntries } from '../../time-entries/schemas/time-entries.schema';
import { users } from '../../users/schemas/users.schema';
import { workspaceSettings } from '../../workspaces/schemas/workspace-settings.schema';
import { invoices } from '../schemas/invoices.schema';

/**
 * A type that works for both the top-level DrizzleDB and a transaction
 * callback parameter — both support the query methods we need.
 */
type PgExecutor = Pick<DrizzleDB, 'select' | 'insert' | 'update' | 'delete'>;

interface InvoiceDetailRow {
  invoice: typeof invoices.$inferSelect;
  projectName: string | null;
  projectId: string | null;
  creatorEmail: string;
  creatorDisplayName: string | null;
  creatorAvatarUrl: string | null;
  entryCount: number;
}

const VALID_STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['sent'],
  sent: ['paid'],
  paid: [],
};

/**
 * Rounds to 2 decimal places using "round half up" — matching PostgreSQL
 * `round(numeric, 2)` semantics for positive values.
 */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly members: MembersService,
  ) {}

  // ---------------------------------------------------------------------------
  // List
  // ---------------------------------------------------------------------------

  async listInvoices(
    user: AuthUser,
    query: InvoiceListQuery,
  ): Promise<InvoiceListResponse> {
    const membership = await this.members.requireRole(
      user.sub,
      user.workspaceId,
      ['admin', 'pm'],
    );
    if (membership.role !== 'admin' && membership.role !== 'pm') {
      throw new ForbiddenException('Forbidden');
    }

    const isPM = membership.role === 'pm';
    const conditions: SQL[] = [eq(invoices.workspaceId, user.workspaceId)];

    if (isPM) {
      // PMs see invoices for public or assigned projects, plus their own
      // project-less invoices (created without a projectId from entries in
      // their accessible projects).
      conditions.push(
        or(
          and(
            isNotNull(invoices.projectId),
            or(
              eq(projects.visibility, 'public'),
              eq(projectAssignments.userId, user.sub),
            ),
          ),
          and(isNull(invoices.projectId), eq(invoices.createdBy, user.sub)),
        )!,
      );
    }

    if (query.projectId !== undefined) {
      conditions.push(eq(invoices.projectId, query.projectId));
    }
    if (query.status !== undefined) {
      conditions.push(eq(invoices.status, query.status));
    }

    const where = and(...conditions);
    const offset = (query.page - 1) * query.limit;

    const rows = await this.db
      .select({
        invoice: invoices,
        projectName: projects.name,
        projectId: projects.id,
        creatorEmail: users.email,
        creatorDisplayName: users.displayName,
        creatorAvatarUrl: users.avatarUrl,
        entryCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${timeEntries} te
          WHERE te.invoice_id = ${invoices.id}
        )`.as('entry_count'),
      })
      .from(invoices)
      .leftJoin(projects, eq(projects.id, invoices.projectId))
      .innerJoin(users, eq(users.id, invoices.createdBy))
      .leftJoin(
        projectAssignments,
        and(
          eq(projectAssignments.projectId, invoices.projectId),
          eq(projectAssignments.userId, user.sub),
        ),
      )
      .where(where)
      .orderBy(desc(invoices.createdAt), desc(invoices.id))
      .limit(query.limit)
      .offset(offset);

    const [totalRow] = await this.db
      .select({ value: count() })
      .from(invoices)
      .leftJoin(projects, eq(projects.id, invoices.projectId))
      .leftJoin(
        projectAssignments,
        and(
          eq(projectAssignments.projectId, invoices.projectId),
          eq(projectAssignments.userId, user.sub),
        ),
      )
      .where(where);

    const total = totalRow?.value ?? 0;

    return {
      items: rows.map((row) => this.toResponse(row)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  async createInvoice(
    user: AuthUser,
    input: CreateInvoiceInput,
  ): Promise<InvoiceResponse> {
    const membership = await this.members.requireRole(
      user.sub,
      user.workspaceId,
      ['admin', 'pm'],
    );
    if (membership.role !== 'admin' && membership.role !== 'pm') {
      throw new ForbiddenException('Forbidden');
    }

    // Resolve hourly rate and currency snapshot from workspace settings.
    const [settings] = await this.db
      .select({
        currency: workspaceSettings.currency,
        defaultHourlyRate: workspaceSettings.defaultHourlyRate,
      })
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, user.workspaceId))
      .limit(1);
    if (!settings) {
      throw new DomainError(
        'workspace_settings_missing',
        'Workspace settings not found',
      );
    }

    const hourlyRate = input.hourlyRate ?? settings.defaultHourlyRate;
    if (hourlyRate === null || hourlyRate === undefined || hourlyRate <= 0) {
      throw new BadRequestException(
        'hourlyRate is required — set a default in workspace settings or provide it in the request',
      );
    }
    const currency = settings.currency;
    const discountPercent = input.discountPercent ?? 0;

    // For PMs: if a project is specified, verify they have access (assigned or
    // public). Admins can invoice any project in the workspace.
    if (input.projectId !== undefined) {
      await this.requireProjectAccess(user, input.projectId, membership.role);
    }

    // Date range for selecting eligible time entries. The invoice stores DATE
    // columns; we compare against started_at using a half-open [dateFrom, dateTo+1)
    // interval so entries on the dateTo day are included.
    const dateFrom = new Date(input.dateFrom + 'T00:00:00.000Z');
    const dateToExclusive = new Date(input.dateTo + 'T00:00:00.000Z');
    dateToExclusive.setUTCDate(dateToExclusive.getUTCDate() + 1);

    return this.db.transaction(async (tx) => {
      // Lock eligible time entries for update so concurrent invoice creation
      // cannot claim the same entries.
      const eligibleConditions = [
        eq(timeEntries.workspaceId, user.workspaceId),
        isNotNull(timeEntries.endedAt),
        isNotNull(timeEntries.durationSeconds),
        eq(timeEntries.isBillable, true),
        isNull(timeEntries.invoiceId),
        gte(timeEntries.startedAt, dateFrom),
        lt(timeEntries.startedAt, dateToExclusive),
      ];

      // Join to tasks/projects for project scoping and PM visibility.
      const baseQuery = (extraConditions: SQL[]) =>
        tx
          .select({
            id: timeEntries.id,
            durationSeconds: timeEntries.durationSeconds,
            projectId: tasks.projectId,
          })
          .from(timeEntries)
          .innerJoin(tasks, eq(tasks.id, timeEntries.taskId))
          .innerJoin(projects, eq(projects.id, tasks.projectId))
          .where(and(...eligibleConditions, ...extraConditions))
          .for('update');

      let scopingConditions: SQL[];
      if (input.projectId !== undefined) {
        scopingConditions = [eq(tasks.projectId, input.projectId)];
      } else if (membership.role === 'pm') {
        // PM without a specific project: include active public + assigned projects.
        scopingConditions = [
          eq(projects.isActive, true),
          or(
            eq(projects.visibility, 'public'),
            inArray(
              tasks.projectId,
              tx
                .select({ id: projectAssignments.projectId })
                .from(projectAssignments)
                .where(eq(projectAssignments.userId, user.sub)),
            ),
          )!,
        ];
      } else {
        scopingConditions = [];
      }

      const eligibleEntries = await baseQuery(scopingConditions);

      if (eligibleEntries.length === 0) {
        throw new UnprocessableEntityException(
          'No eligible billable time entries found for the given criteria',
        );
      }

      const totalSeconds = eligibleEntries.reduce(
        (sum, e) => sum + (e.durationSeconds ?? 0),
        0,
      );
      const totalHours = round2(totalSeconds / 3600);
      const grossAmount = totalHours * hourlyRate;
      const discountAmount = grossAmount * (discountPercent / 100);
      const totalAmount = round2(grossAmount - discountAmount);

      const [invoice] = await tx
        .insert(invoices)
        .values({
          workspaceId: user.workspaceId,
          projectId: input.projectId ?? null,
          title: input.title,
          status: 'draft',
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
          hourlyRate,
          currency,
          discountPercent,
          totalHours,
          totalAmount,
          notes: input.notes ?? null,
          createdBy: user.sub,
        })
        .returning();

      if (!invoice) {
        throw DomainError.internal(
          'invoice_create_failed',
          'Failed to create invoice',
        );
      }

      // Link all eligible entries to the new invoice within the same transaction.
      const entryIds = eligibleEntries.map((e) => e.id);
      await tx
        .update(timeEntries)
        .set({ invoiceId: invoice.id, updatedAt: new Date() })
        .where(inArray(timeEntries.id, entryIds));

      // Re-fetch the invoice with joined data for the response.
      return this.fetchInvoiceResponse(tx, invoice.id, user);
    });
  }

  // ---------------------------------------------------------------------------
  // Get details
  // ---------------------------------------------------------------------------

  async getInvoice(
    user: AuthUser,
    invoiceId: string,
  ): Promise<InvoiceResponse> {
    const membership = await this.members.requireRole(
      user.sub,
      user.workspaceId,
      ['admin', 'pm'],
    );
    if (membership.role !== 'admin' && membership.role !== 'pm') {
      throw new ForbiddenException('Forbidden');
    }

    const row = await this.fetchInvoiceDetailRow(
      this.db,
      invoiceId,
      user.workspaceId,
    );
    if (!row) throw new NotFoundException('Invoice not found');

    // PM visibility: must have access to the invoice's project (public or
    // assigned), or be the creator of a project-less invoice.
    if (membership.role === 'pm') {
      if (row.invoice.projectId !== null) {
        await this.requireProjectAccess(
          user,
          row.invoice.projectId,
          membership.role,
        );
      } else if (row.invoice.createdBy !== user.sub) {
        throw new ForbiddenException('Forbidden');
      }
    }

    return this.toResponse(row);
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  async updateInvoice(
    user: AuthUser,
    invoiceId: string,
    input: UpdateInvoiceInput,
  ): Promise<InvoiceResponse> {
    const membership = await this.members.requireRole(
      user.sub,
      user.workspaceId,
      ['admin', 'pm'],
    );
    if (membership.role !== 'admin' && membership.role !== 'pm') {
      throw new ForbiddenException('Forbidden');
    }

    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select({
          id: invoices.id,
          projectId: invoices.projectId,
          createdBy: invoices.createdBy,
          status: invoices.status,
          hourlyRate: invoices.hourlyRate,
          discountPercent: invoices.discountPercent,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.id, invoiceId),
            eq(invoices.workspaceId, user.workspaceId),
          ),
        )
        .for('update')
        .limit(1);

      if (!row) throw new NotFoundException('Invoice not found');

      // PM visibility: must have access to the invoice's project (public or
      // assigned), or be the creator of a project-less invoice.
      if (membership.role === 'pm') {
        if (row.projectId !== null) {
          await this.requireProjectAccessTx(
            tx,
            user,
            row.projectId,
            membership.role,
          );
        } else if (row.createdBy !== user.sub) {
          throw new ForbiddenException('Forbidden');
        }
      }

      const currentStatus = row.status as InvoiceStatus;

      // Status transition validation.
      if (input.status !== undefined && input.status !== currentStatus) {
        const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
        if (!allowed.includes(input.status)) {
          throw new ConflictException(
            `Cannot transition invoice from '${currentStatus}' to '${input.status}'`,
          );
        }
      }

      // Rate / discount / currency changes are only allowed on draft invoices.
      const rateFieldsChanged =
        input.hourlyRate !== undefined ||
        input.discountPercent !== undefined ||
        input.currency !== undefined;

      if (rateFieldsChanged && currentStatus !== 'draft') {
        throw new ConflictException(
          'Rate, discount, and currency can only be changed on draft invoices',
        );
      }

      // Title changes are only allowed on draft invoices.
      if (input.title !== undefined && currentStatus !== 'draft') {
        throw new ConflictException(
          'Title can only be changed on draft invoices',
        );
      }

      const updateData: Partial<typeof invoices.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.currency !== undefined) updateData.currency = input.currency;
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.hourlyRate !== undefined)
        updateData.hourlyRate = input.hourlyRate;
      if (input.discountPercent !== undefined)
        updateData.discountPercent = input.discountPercent;

      // If rate or discount changed on a draft, recalculate totals from linked
      // time entries.
      if (rateFieldsChanged) {
        const effectiveRate = input.hourlyRate ?? row.hourlyRate;
        const effectiveDiscount = input.discountPercent ?? row.discountPercent;

        const linkedEntries = await tx
          .select({ durationSeconds: timeEntries.durationSeconds })
          .from(timeEntries)
          .where(eq(timeEntries.invoiceId, invoiceId));

        const totalSeconds = linkedEntries.reduce(
          (sum, e) => sum + (e.durationSeconds ?? 0),
          0,
        );
        const totalHours = round2(totalSeconds / 3600);
        const grossAmount = totalHours * effectiveRate;
        const discountAmount = grossAmount * (effectiveDiscount / 100);
        const totalAmount = round2(grossAmount - discountAmount);

        updateData.totalHours = totalHours;
        updateData.totalAmount = totalAmount;
      }

      const [updated] = await tx
        .update(invoices)
        .set(updateData)
        .where(eq(invoices.id, invoiceId))
        .returning();

      if (!updated) {
        throw DomainError.internal(
          'invoice_update_failed',
          'Failed to update invoice',
        );
      }

      // Fetch full response with joins.
      const detailRow = await this.fetchInvoiceDetailRow(
        tx,
        invoiceId,
        user.workspaceId,
      );
      if (!detailRow) {
        throw DomainError.internal(
          'invoice_response_missing',
          'Failed to load updated invoice',
        );
      }
      return this.toResponse(detailRow);
    });
  }

  // ---------------------------------------------------------------------------
  // Delete (admin-only)
  // ---------------------------------------------------------------------------

  async deleteInvoice(user: AuthUser, invoiceId: string): Promise<void> {
    await this.members.requireAdmin(user.sub, user.workspaceId);

    const [row] = await this.db
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.workspaceId, user.workspaceId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Invoice not found');

    // Deleting the invoice row triggers SET NULL on time_entries.invoice_id
    // via the foreign key, making those entries eligible for future invoices.
    await this.db.delete(invoices).where(eq(invoices.id, invoiceId));
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async requireProjectAccess(
    user: AuthUser,
    projectId: string,
    role: string,
  ): Promise<void> {
    return this.requireProjectAccessTx(this.db, user, projectId, role);
  }

  private async requireProjectAccessTx(
    db: PgExecutor,
    user: AuthUser,
    projectId: string,
    role: string,
  ): Promise<void> {
    // Always verify the project exists in the caller's workspace — even
    // admins must not reference a project from another workspace.
    const [project] = await db
      .select({
        visibility: projects.visibility,
        isActive: projects.isActive,
      })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.workspaceId, user.workspaceId),
        ),
      )
      .limit(1);

    if (!project) throw new NotFoundException('Project not found');

    // Admins can access any project in their workspace.
    if (role === 'admin') return;

    // PMs can access public projects or projects they're assigned to.
    if (project.visibility === 'public') return;

    const [assignment] = await db
      .select({ id: projectAssignments.id })
      .from(projectAssignments)
      .where(
        and(
          eq(projectAssignments.projectId, projectId),
          eq(projectAssignments.userId, user.sub),
        ),
      )
      .limit(1);

    if (!assignment) throw new ForbiddenException('Forbidden');
  }

  private async fetchInvoiceDetailRow(
    db: PgExecutor,
    invoiceId: string,
    workspaceId: string,
  ): Promise<InvoiceDetailRow | null> {
    const [row] = await db
      .select({
        invoice: invoices,
        projectName: projects.name,
        projectId: projects.id,
        creatorEmail: users.email,
        creatorDisplayName: users.displayName,
        creatorAvatarUrl: users.avatarUrl,
        entryCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${timeEntries} te
          WHERE te.invoice_id = ${invoices.id}
        )`.as('entry_count'),
      })
      .from(invoices)
      .leftJoin(projects, eq(projects.id, invoices.projectId))
      .innerJoin(users, eq(users.id, invoices.createdBy))
      .where(
        and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)),
      )
      .limit(1);

    return (row as InvoiceDetailRow | undefined) ?? null;
  }

  private async fetchInvoiceResponse(
    tx: PgExecutor,
    invoiceId: string,
    user: AuthUser,
  ): Promise<InvoiceResponse> {
    const row = await this.fetchInvoiceDetailRow(
      tx,
      invoiceId,
      user.workspaceId,
    );
    if (!row) {
      throw DomainError.internal(
        'invoice_response_missing',
        'Failed to load created invoice',
      );
    }
    return this.toResponse(row);
  }

  private toResponse(row: InvoiceDetailRow): InvoiceResponse {
    return {
      id: row.invoice.id,
      workspaceId: row.invoice.workspaceId,
      projectId: row.invoice.projectId,
      title: row.invoice.title,
      status: row.invoice.status as InvoiceStatus,
      dateFrom: row.invoice.dateFrom,
      dateTo: row.invoice.dateTo,
      hourlyRate: row.invoice.hourlyRate,
      currency: row.invoice.currency,
      discountPercent: row.invoice.discountPercent,
      totalHours: row.invoice.totalHours,
      totalAmount: row.invoice.totalAmount,
      notes: row.invoice.notes,
      createdBy: row.invoice.createdBy,
      createdAt: row.invoice.createdAt.toISOString(),
      updatedAt: row.invoice.updatedAt.toISOString(),
      project:
        row.projectId !== null && row.projectName !== null
          ? { id: row.projectId, name: row.projectName }
          : null,
      createdByUser: {
        id: row.invoice.createdBy,
        email: row.creatorEmail,
        displayName: row.creatorDisplayName,
        avatarUrl: row.creatorAvatarUrl,
      },
      timeEntryCount: row.entryCount ?? 0,
    };
  }
}
